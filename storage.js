const STORAGE_KEY = "fitnessJournal";

function loadState() {
  return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {
    workouts: [],
    exerciseHistory: {}
  };
}

function saveState(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}
