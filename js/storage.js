const STORAGE_KEY = "fitnessJournal";

function loadState() {
  return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {
    workouts: [],
    exerciseHistory: {}
  };
}

function saveState(state) {
  localStorage.setItem("fitnessJournalState", JSON.stringify(state));

  const user = getCurrentUser();
  if (user) {
    syncUserToServer(user);
  }
}

async function syncUserToServer(user) {
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
    console.warn("Offline or sync failed — will retry later");
  }
}
