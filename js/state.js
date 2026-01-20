/* =========================
   State Initialization
   ========================= */
let state = loadState();

if (!state || typeof state !== "object") {
  state = {
    currentUser: null,
    users: {}
  };
}

state.currentUser ??= null;
state.users ??= {};

/* =========================
   Normalize Existing Users
   (Migration Safe)
   ========================= */
Object.values(state.users).forEach(user => {
  user.workouts ??= [];
  user.activeWorkout ??= null;
  user.exerciseHistory ??= {};
  user.templates ??= [];
  user.exerciseLibrary ??= [];
});

/* =========================
   Centralized Persist Helper
   ========================= */
function persistState() {
  saveState(state);

  const user = getCurrentUser();
  if (user && typeof syncUserData === "function") {
    syncUserData(user); // 🔒 non-blocking cloud sync
  }
}

/* =========================
   Helpers
   ========================= */
function getCurrentUser() {
  if (!state.currentUser) return null;
  return state.users[state.currentUser] || null;
}

/* =========================
   Workout Factory
   ========================= */
function createWorkout() {
  return {
    id: crypto.randomUUID(),
    name: "",
    date: new Date().toISOString().split("T")[0],
    exercises: [],
    startTime: null,
    elapsedSeconds: 0,
    isPaused: false,

    // Rest Timer Defaults
    useRestTimer: true,
    restDuration: 30
  };
}

/* =========================
   Timer Logic
   ========================= */
function startTimer(workout) {
  if (!workout) return;
  workout.startTime = Date.now();
  workout.isPaused = false;
}

function pauseTimer(workout) {
  if (!workout || !workout.startTime) return;

  workout.elapsedSeconds += Math.floor(
    (Date.now() - workout.startTime) / 1000
  );
  workout.startTime = null;
  workout.isPaused = true;
}

function resumeTimer(workout) {
  if (!workout) return;
  workout.startTime = Date.now();
  workout.isPaused = false;
}

/* =========================
   Workout Lifecycle
   ========================= */
function startWorkout() {
  const user = getCurrentUser();
  if (!user) return null;

  user.activeWorkout = createWorkout();
  startTimer(user.activeWorkout);
  persistState();
  return user.activeWorkout;
}

function resumeWorkout() {
  const user = getCurrentUser();
  if (!user) return null;
  return user.activeWorkout || null;
}

function finishWorkout(workout) {
  const user = getCurrentUser();
  if (!user || !workout) return;

  pauseTimer(workout);

  if (!hasWorkoutData(workout)) {
    user.activeWorkout = null;
    persistState();
    return;
  }

  // Update exercise history
  workout.exercises.forEach(ex => {
    user.exerciseHistory[ex.name] = {
      lastSets: ex.sets.map(s => ({
        weight: s.weight,
        reps: s.reps
      })),
      lastPerformed: workout.date
    };
  });

  user.workouts.push(workout);
  user.activeWorkout = null;
  persistState();
}

/* =========================
   Exercise Handling
   ========================= */
function addExerciseToWorkout(workout, name) {
  const user = getCurrentUser();
  if (!user || !workout) return;

  name = name.trim();
  if (!name) return;

  if (!user.exerciseLibrary.includes(name)) {
    user.exerciseLibrary.push(name);
  }

  const history = user.exerciseHistory[name];

  workout.exercises.push({
    id: crypto.randomUUID(),
    name,
    sets: [{ weight: "", reps: "", completed: false }],
    previous: history?.lastSets
      ? history.lastSets.map(s => `${s.weight} x ${s.reps}`).join(", ")
      : null,
    notes: ""
  });

  persistState();
}

function addSet(workout, exerciseIndex) {
  if (!workout) return;

  workout.exercises[exerciseIndex].sets.push({
    weight: "",
    reps: "",
    completed: false
  });

  persistState();
}

function removeSet(workout, exerciseIndex, setIndex) {
  if (!workout) return;

  workout.exercises[exerciseIndex].sets.splice(setIndex, 1);
  persistState();
}

function updateSet(workout, exIndex, setIndex, field, value) {
  if (!workout) return;

  const set = workout.exercises[exIndex].sets[setIndex];
  set[field] = value;

  if (!value) {
    set.completed = false;
  }

  persistState();
}

/* =========================
   Save Helpers
   ========================= */
function hasWorkoutData(workout) {
  if (!workout || !workout.exercises.length) return false;

  return workout.exercises.some(ex =>
    ex.sets.some(
      s =>
        (s.weight && s.weight !== "") ||
        (s.reps && s.reps !== "")
    )
  );
}

/* =========================
   Templates
   ========================= */
function saveTemplateFromWorkout(workout) {
  const user = getCurrentUser();
  if (!user || !workout) return;

  user.templates ??= [];

  const template = {
    id: crypto.randomUUID(),
    name: workout.name || "Template",
    exercises: workout.exercises.map(ex => ({
      name: ex.name
    }))
  };

  user.templates.push(template);
  persistState();
}

function startWorkoutFromTemplate(templateId) {
  const user = getCurrentUser();
  if (!user || !templateId) return null;

  const template = user.templates.find(t => t.id === templateId);
  if (!template) return null;

  user.activeWorkout = createWorkout();
  user.activeWorkout.name = template.name;

  template.exercises.forEach(ex =>
    addExerciseToWorkout(user.activeWorkout, ex.name)
  );

  startTimer(user.activeWorkout);
  persistState();

  return user.activeWorkout;
}

function deleteTemplate(templateId) {
  const user = getCurrentUser();
  if (!user || !Array.isArray(user.templates)) return;

  user.templates = user.templates.filter(t => t.id !== templateId);
  persistState();
}
