// js/sync.js
console.log("sync.js loaded");

async function syncUserData(user) {
  if (!user) return;

  try {
    await fetch("/.netlify/functions/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(user)
    });
  } catch (err) {
    console.warn("Cloud sync failed (offline-safe)");
  }
}
