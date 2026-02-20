document.addEventListener("DOMContentLoaded", () => {
  console.log("app.js loaded");
document.addEventListener("click", (e) => {
  if (e.target.id === "add-exercise-btn") {
    handleAddExercise();
  }
});

  /* =========================
     APP VERSION
     ========================= */
  const APP_VERSION = "1.0.0";
  console.log("App version:", APP_VERSION);

  /* =========================
     DOM REFERENCES
     ========================= */
  const loginScreen = document.getElementById("login-screen");
  const registerScreen = document.getElementById("register-screen");
  const workoutList = document.getElementById("workout-list");
  const logoutBtn = document.getElementById("logout-btn");

  const workoutNameInput = document.getElementById("workout-name");
  const continueBtn = document.getElementById("continue-workout-btn");
  const backToListBtn = document.getElementById("back-to-list-btn");
  const backBtn = document.getElementById("back-btn");
  const finishBtn = document.getElementById("finish-workout-btn");

  const pauseBtn = document.getElementById("pause-timer-btn");
  const resumeBtn = document.getElementById("resume-timer-btn");

  const restToggle = document.getElementById("rest-toggle");
  const rest30Btn = document.getElementById("rest-30-btn");
  const rest60Btn = document.getElementById("rest-60-btn");
  const rest90Btn = document.getElementById("rest-90-btn");
  const cancelRestBtn = document.getElementById("cancel-rest-btn");

  const addExerciseBtn = document.getElementById("add-exercise-btn");
  const newWorkoutBtn = document.getElementById("new-workout-btn");
  const templateList = document.getElementById("template-list");
  const saveTemplateBtn = document.getElementById("save-template-btn");
  const summaryDoneBtn = document.getElementById("summary-done-btn");
  const workoutHistoryEl = document.getElementById("workout-history");

  const modalInput = document.getElementById("exercise-modal-input");
  const modalAddBtn = document.getElementById("exercise-modal-add-btn");
  const modalSuggestions = document.getElementById("exercise-modal-suggestions");
window.addEventListener("online", processSyncQueue);
processSyncQueue();

  let activeWorkout = null;

  /* =========================
     SCREEN HELPERS
     ========================= */
  function showLogin() {
    loginScreen.hidden = false;
    registerScreen.hidden = true;
    workoutList.hidden = true;
    logoutBtn.hidden = true;
  }

  function showRegister() {
    loginScreen.hidden = true;
    registerScreen.hidden = false;
  }

  function showApp() {
    loginScreen.hidden = true;
    registerScreen.hidden = true;
    workoutList.hidden = false;
    logoutBtn.hidden = false;
  }

  function exitWorkoutView() {
    stopTimerUI();
    stopRest();
    showWorkoutList();
    updateHomeButtons();
  }

  function syncRestToggle() {
    if (restToggle && activeWorkout) {
      restToggle.checked = !!activeWorkout.useRestTimer;
    }
  }

  /* =========================
     AUTH – LOGIN
     ========================= */
  document.getElementById("login-btn")?.addEventListener("click", async () => {
    try {
      await loginUser(
        document.getElementById("login-username").value.trim(),
        document.getElementById("login-password").value,
        document.getElementById("remember-me")?.checked === true
      );

      showApp();
      showCurrentUser(state.currentUser);
      renderWorkoutHistory(getCurrentUser().workouts);
      renderTemplates(getCurrentUser().templates || []);
      updateHomeButtons();
    } catch (err) {
      alert(err.message);
    }
  });

  /* =========================
     AUTH – REGISTER
     ========================= */
  document.getElementById("show-register-btn")
    ?.addEventListener("click", showRegister);

  document.getElementById("cancel-register-btn")
    ?.addEventListener("click", showLogin);

  document.getElementById("register-btn")
    ?.addEventListener("click", async () => {
      try {
        await registerUser(
          document.getElementById("register-username").value.trim(),
          document.getElementById("register-password").value
        );

        showApp();
        showCurrentUser(state.currentUser);
        renderWorkoutHistory(getCurrentUser().workouts);
        renderTemplates(getCurrentUser().templates || []);
        updateHomeButtons();
      } catch (err) {
        alert(err.message);
      }
    });

  logoutBtn?.addEventListener("click", () => {
    logoutUser();
    location.reload();
  });

  /* =========================
     INITIAL LOAD
     ========================= */
  if (state.currentUser && isTrustedDevice()) {
    showApp();
    showCurrentUser(state.currentUser);
    renderWorkoutHistory(getCurrentUser().workouts);
    renderTemplates(getCurrentUser().templates || []);
    updateHomeButtons();
  } else {
    showLogin();
  }

  /* =========================
     WORKOUT HISTORY VIEW
     ========================= */
  workoutHistoryEl?.addEventListener("click", e => {
    const li = e.target.closest("li");
    if (!li?.dataset.id) return;

    const workout = getCurrentUser().workouts.find(
      w => w.id === li.dataset.id
    );

    if (workout) renderWorkoutView(workout);
  });

  /* =========================
     START / CONTINUE WORKOUT
     ========================= */
  newWorkoutBtn?.addEventListener("click", () => {
    activeWorkout = startWorkout();
    workoutNameInput.value = "";
    syncRestToggle();

    showActiveWorkout();
    renderExercises(activeWorkout);
    startTimerUI(activeWorkout);
    updateHomeButtons();
  });

  continueBtn?.addEventListener("click", () => {
    activeWorkout = resumeWorkout();
    if (!activeWorkout) return;

    workoutNameInput.value = activeWorkout.name || "";
    syncRestToggle();

    showActiveWorkout();
    renderExercises(activeWorkout);
    startTimerUI(activeWorkout);
  });

  backToListBtn?.addEventListener("click", exitWorkoutView);
  backBtn?.addEventListener("click", exitWorkoutView);

  /* =========================
     SAVE TEMPLATE
     ========================= */
  saveTemplateBtn?.addEventListener("click", () => {
    if (!activeWorkout) {
      alert("No active workout to save.");
      return;
    }

    const name =
      workoutNameInput.value.trim() ||
      activeWorkout.name ||
      "New Template";

    const templateWorkout = structuredClone(activeWorkout);
    templateWorkout.id = crypto.randomUUID();
    templateWorkout.name = name;
    templateWorkout.date = null;

    saveTemplateFromWorkout(templateWorkout);
    renderTemplates(getCurrentUser().templates || []);

    alert(`Template "${name}" saved!`);
  });
});
