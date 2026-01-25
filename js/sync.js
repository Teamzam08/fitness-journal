// js/sync.js
console.log("sync.js loaded");

/* =========================
   PUSH USER TO NEON
   ========================= */
async function syncUserToServer(user) {
  if (!user || !state.currentUser) return;

  try {
    await fetch("/.netlify/functions/sync-user", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: state.currentUser,
        data: user
      })
    });
  } catch (err) {
    console.warn("Cloud sync failed (offline-safe)", err);
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
