// js/sync.js
const SYNC_QUEUE_KEY = "syncQueue";

function getSyncQueue() {
  return JSON.parse(localStorage.getItem(SYNC_QUEUE_KEY) || "[]");
}

function setSyncQueue(queue) {
  localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(queue));
}

console.log("sync.js loaded");

/* =========================
   PUSH USER TO NEON
   ========================= */
async function syncUserToServer(user) {
  if (!user || !state.currentUser) return;

  const payload = {
    username: state.currentUser,
    data: user
  };

  try {
    const res = await fetch("/.netlify/functions/sync-user", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (!res.ok) throw new Error("Sync failed");
  } catch (err) {
    console.warn("Sync failed, queued for retry");

    const queue = getSyncQueue();
    queue.push(payload);
    setSyncQueue(queue);
  }
}


/* =========================
   FETCH USER FROM NEON
   ========================= */
async function fetchUserFromServer(username) {
  if (!username) return null;

  try {
    const res = await fetch(
      `/.netlify/functions/get-user?username=${encodeURIComponent(username)}`
    );

    if (!res.ok) return null;

    const result = await res.json();

    // EXPECTED SHAPE:
    // { username: "...", data: { passwordHash, workouts, ... } }

    return result?.data || null;
  } catch (err) {
    console.warn("Fetch user failed", err);
    return null;
  }
}
