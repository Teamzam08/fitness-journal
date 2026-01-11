console.log("ui.js loaded");

/* =========================
   Current User Display
   ========================= */
const currentUserEl = document.getElementById("current-user");

function showCurrentUser(username) {
  if (currentUserEl) {
    currentUserEl.textContent = `Logged in as: ${username}`;
  }
}

function clearCurrentUser() {
  if (currentUserEl) {
    currentUserEl.textContent = "";
  }
}

/* =========================
   Section Toggles
   ========================= */
function showWorkoutList() {
  document.getElementById("workout-list").hidden = false;
  document.getElementById("active-workout").hidden = true;
  document.getElementById("view-workout").hidden = true;
  document.getElementById("workout-summary").hidden = true;
}

function showActiveWorkout() {
  document.getElementById("workout-list").hidden = true;
  document.getElementById("active-workout").hidden = false;
  document.getElementById("view-workout").hidden = true;
  document.getElementById("workout-summary").hidden = true;
}

function showWorkoutView() {
  document.getElementById("workout-list").hidden = true;
  document.getElementById("active-workout").hidden = true;
  document.getElementById("view-workout").hidden = false;
  document.getElementById("workout-summary").hidden = true;
}

/* =========================
   Element References
   ========================= */
const exerciseListEl = document.getElementById("exercise-list");
const workoutHistoryEl = document.getElementById("workout-history");

const viewWorkoutTitleEl = document.getElementById("view-workout-title");
const viewWorkoutDateEl = document.getElementById("view-workout-date");
const viewExercisesEl = document.getElementById("view-exercises");

/* =========================
   Active Workout Rendering
   ========================= */
function renderExercises(workout) {
  exerciseListEl.innerHTML = "";

  workout.exercises.forEach((exercise, exIndex) => {
    const card = document.createElement("div");
    card.className = "exercise-card";

    card.innerHTML = `
      <h3>${exercise.name}</h3>

      ${
        exercise.previous
          ? `<div class="previous-note">
               Last time: ${exercise.previous}
             </div>`
          : ""
      }

      <div class="sets">
        ${exercise.sets
          .map(
            (set, setIndex) => `
            <div class="set-row">
              <input
                type="number"
                placeholder="Weight"
                value="${set.weight}"
                data-ex="${exIndex}"
                data-set="${setIndex}"
                data-field="weight"
              />
              <input
                type="number"
                placeholder="Reps"
                value="${set.reps}"
                data-ex="${exIndex}"
                data-set="${setIndex}"
                data-field="reps"
              />
              <button data-remove-set="${setIndex}" data-ex="${exIndex}" class="icon-btn danger">
  <i class="fa-solid fa-trash"></i>
</button>

            </div>
          `
          )
          .join("")}
      </div>

      <button data-add-set="${exIndex}" class="secondary">
  <i class="fa-solid fa-plus"></i>
  Add Set
</button>

    `;

    exerciseListEl.appendChild(card);
  });
}

/* =========================
   Workout History
   ========================= */
function renderWorkoutHistory(workouts) {
  workoutHistoryEl.innerHTML = "";

  if (!workouts.length) {
    workoutHistoryEl.innerHTML = "<li>No workouts yet</li>";
    return;
  }

  workouts
    .slice()
    .reverse()
    .forEach(workout => {
      const li = document.createElement("li");
      li.className = "workout-history-item";
      li.textContent = `${workout.date} — ${workout.name}`;
      li.dataset.id = workout.id;
      workoutHistoryEl.appendChild(li);
    });
}

/* =========================
   View Past Workout
   ========================= */
function renderWorkoutView(workout) {
  viewWorkoutTitleEl.textContent = workout.name;
  viewWorkoutDateEl.textContent = workout.date;
  viewExercisesEl.innerHTML = "";

  workout.exercises.forEach(ex => {
    const card = document.createElement("div");
    card.className = "exercise-card";

    card.innerHTML = `
      <h3>${ex.name}</h3>
      ${ex.sets
        .map(
          (s, i) => `
          <div class="set-row">
            <span>Set ${i + 1}</span>
            <span>${s.weight} × ${s.reps}</span>
          </div>
        `
        )
        .join("")}
    `;

    viewExercisesEl.appendChild(card);
  });

  showWorkoutView();
}

/* =========================
   Home Button State
   ========================= */
function updateHomeButtons() {
  const newBtn = document.getElementById("new-workout-btn");
  const continueBtn = document.getElementById("continue-workout-btn");
  const user = getCurrentUser();

  if (!newBtn || !continueBtn) return;

  if (user && user.activeWorkout) {
    newBtn.hidden = true;
    continueBtn.hidden = false;
  } else {
    newBtn.hidden = false;
    continueBtn.hidden = true;
  }
}

/* =========================
   Workout Timer UI
   ========================= */
let timerInterval = null;

function startTimerUI(workout) {
  stopTimerUI();
  showPause();

  timerInterval = setInterval(() => {
    let totalSeconds = workout.elapsedSeconds;

    if (workout.startTime) {
      totalSeconds += Math.floor(
        (Date.now() - workout.startTime) / 1000
      );
    }

    const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, "0");
    const seconds = String(totalSeconds % 60).padStart(2, "0");

    document.getElementById("workout-timer").textContent =
      `${minutes}:${seconds}`;
  }, 1000);
}

function stopTimerUI() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
}

function showPause() {
  document.getElementById("pause-timer-btn").hidden = false;
  document.getElementById("resume-timer-btn").hidden = true;
}

function showResume() {
  document.getElementById("pause-timer-btn").hidden = true;
  document.getElementById("resume-timer-btn").hidden = false;
}

/* =========================
   Rest Timer UI
   ========================= */
let restInterval = null;
let restRemaining = 0;

function startRest(seconds) {
  stopRest();

  restRemaining = seconds;
  updateRestDisplay();

  const restEl = document.getElementById("rest-timer");
  restEl.hidden = false;
  restEl.classList.remove("rest-complete");

  restInterval = setInterval(() => {
    restRemaining--;

    if (restRemaining <= 0) {
      clearInterval(restInterval);
      restInterval = null;

      restEl.classList.add("rest-complete");
      document.getElementById("rest-time-display").textContent =
        "GO!";

      if (navigator.vibrate) {
        navigator.vibrate([200, 100, 200]);
      }
      return;
    }

    updateRestDisplay();
  }, 1000);
}

function stopRest() {
  const restEl = document.getElementById("rest-timer");

  if (restInterval) {
    clearInterval(restInterval);
    restInterval = null;
  }

  restEl.hidden = true;
  restEl.classList.remove("rest-complete");
}

function updateRestDisplay() {
  const m = Math.floor(restRemaining / 60);
  const s = restRemaining % 60;

  document.getElementById("rest-time-display").textContent =
    `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

/* =========================
   Workout Summary
   ========================= */
function showWorkoutSummary(workout) {
  const totalSeconds =
    workout.elapsedSeconds +
    (workout.startTime
      ? Math.floor((Date.now() - workout.startTime) / 1000)
      : 0);

  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  document.getElementById("summary-name").textContent =
    workout.name || "Untitled Workout";

  document.getElementById("summary-date").textContent = workout.date;

  document.getElementById("summary-time").textContent =
    `${minutes}:${String(seconds).padStart(2, "0")}`;

  document.getElementById("summary-exercises").textContent =
    workout.exercises.length;

  document.getElementById("summary-sets").textContent =
    workout.exercises.reduce(
      (sum, ex) => sum + ex.sets.length,
      0
    );

  document.getElementById("active-workout").hidden = true;
  document.getElementById("workout-summary").hidden = false;
}

/* =========================
   Templates
   ========================= */
function renderTemplates(templates = []) {
  const list = document.getElementById("template-list");
  if (!list) return;

  list.innerHTML = "";

  templates.forEach(t => {
    const li = document.createElement("li");
    li.dataset.id = t.id;

    const nameSpan = document.createElement("span");
    nameSpan.textContent = t.name;

    const deleteBtn = document.createElement("button");
    deleteBtn.textContent = "✕";
    deleteBtn.className = "delete-template-btn";
    deleteBtn.dataset.id = t.id;

    li.appendChild(nameSpan);
    li.appendChild(deleteBtn);
    li.innerHTML = `
  <span>${t.name}</span>
  <button class="delete-template-btn" data-id="${t.id}">
    <i class="fa-solid fa-trash"></i>
  </button>
`;

    list.appendChild(li);
  });
}


function renderExerciseOptions() {
  const list = document.getElementById("exercise-options");
  if (!list) return;

  const user = getCurrentUser();
  if (!user) return;

  list.innerHTML = "";

  user.exerciseLibrary.forEach(name => {
    const option = document.createElement("option");
    option.value = name;
    list.appendChild(option);
  });
}
function showExercisePicker(onSelect) {
  const user = getCurrentUser();
  if (!user) return;

  const container = document.createElement("div");
  container.className = "exercise-picker";

  const input = document.createElement("input");
  input.placeholder = "Exercise name...";
  input.className = "input";

  const list = document.createElement("ul");
  list.className = "exercise-suggestions";

  function renderSuggestions(filter = "") {
    list.innerHTML = "";

    user.exerciseLibrary
      .filter(name =>
        name.toLowerCase().includes(filter.toLowerCase())
      )
      .forEach(name => {
        const li = document.createElement("li");
        li.textContent = name;
        li.onclick = () => {
          cleanup();
          onSelect(name);
        };
        list.appendChild(li);
      });
  }

  function cleanup() {
    container.remove();
  }

  input.addEventListener("input", e => {
    renderSuggestions(e.target.value);
  });

  input.addEventListener("keydown", e => {
    if (e.key === "Enter" && input.value.trim()) {
      cleanup();
      onSelect(input.value.trim());
    }
    if (e.key === "Escape") cleanup();
  });

  renderSuggestions();

  container.appendChild(input);
  container.appendChild(list);
  document.body.appendChild(container);

  input.focus();
}
function showExerciseModal(onAdd) {
  const modal = document.getElementById("exercise-modal");
  const input = document.getElementById("modal-exercise-input");
  const list = document.getElementById("modal-exercise-suggestions");

  modal.hidden = false;
  input.value = "";
  input.focus();

  const user = getCurrentUser();
  const exercises = user?.exerciseLibrary || [];

  function renderSuggestions(filter = "") {
    list.innerHTML = "";
    exercises
      .filter(e => e.toLowerCase().includes(filter.toLowerCase()))
      .slice(0, 6)
      .forEach(name => {
        const li = document.createElement("li");
        li.textContent = name;
        li.onclick = () => {
          input.value = name;
          list.innerHTML = "";
        };
        list.appendChild(li);
      });
  }

  input.oninput = () => renderSuggestions(input.value);
  renderSuggestions();

  document.getElementById("modal-add-btn").onclick = () => {
    const name = input.value.trim();
    if (!name) return;
    closeExerciseModal();
    onAdd(name);
  };

  document.getElementById("modal-cancel-btn").onclick = closeExerciseModal;
}

function closeExerciseModal() {
  document.getElementById("exercise-modal").hidden = true;
}
/* =========================
   Exercise Modal Helpers
   ========================= */

function openExerciseModal() {
  const modal = document.getElementById("exercise-modal");
  const input = document.getElementById("exercise-modal-input");

  if (!modal) return;

  modal.hidden = false;

  // Small delay ensures mobile keyboards behave
  setTimeout(() => input?.focus(), 50);
}

function closeExerciseModal() {
  const modal = document.getElementById("exercise-modal");
  if (!modal) return;

  modal.hidden = true;
}
