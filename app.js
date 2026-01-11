document.addEventListener("DOMContentLoaded", () => {
  console.log("app.js loaded");

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

  const modalInput = document.getElementById("exercise-modal-input");
  const modalAddBtn = document.getElementById("exercise-modal-add-btn");
  const modalSuggestions = document.getElementById("exercise-modal-suggestions");

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

  /* =========================
     AUTH
     ========================= */
  document.getElementById("login-btn")?.addEventListener("click", async () => {
    try {
      const username = document.getElementById("login-username").value.trim();
      const password = document.getElementById("login-password").value;
      const rememberMe = document.getElementById("remember-me")?.checked === true;

      await loginUser(username, password, rememberMe);

      showApp();
      showCurrentUser(state.currentUser);
      renderWorkoutHistory(getCurrentUser().workouts);
      renderTemplates(getCurrentUser().templates || []);
      updateHomeButtons();
    } catch (err) {
      alert(err.message);
    }
  });

  document.getElementById("register-btn")?.addEventListener("click", async () => {
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

  document.getElementById("show-register-btn")?.addEventListener("click", () => {
    loginScreen.hidden = true;
    registerScreen.hidden = false;
  });

  document.getElementById("cancel-register-btn")
    ?.addEventListener("click", showLogin);

  logoutBtn?.addEventListener("click", () => {
    logoutUser();
    location.reload();
  });

  /* =========================
     INITIAL LOAD (AUTOLOGIN)
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
     WORKOUT HISTORY
     ========================= */
  workoutHistoryEl?.addEventListener("click", e => {
    const li = e.target.closest("li");
    if (!li?.dataset.id) return;

    const workout = getCurrentUser().workouts.find(w => w.id === li.dataset.id);
    if (workout) renderWorkoutView(workout);
  });

  /* =========================
     START / CONTINUE WORKOUT
     ========================= */
  function syncRestToggle() {
    if (restToggle && activeWorkout) {
      restToggle.checked = activeWorkout.useRestTimer;
    }
  }

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
     REST TOGGLE
     ========================= */
  restToggle?.addEventListener("change", e => {
    if (!activeWorkout) return;

    activeWorkout.useRestTimer = e.target.checked;

    if (!e.target.checked) {
      stopRest(); // immediately cancel
    }
  });

  /* =========================
     ADD EXERCISE (MODAL)
     ========================= */
  addExerciseBtn?.addEventListener("click", () => {
    if (!activeWorkout) return;
    openExerciseModal();
  });

  modalAddBtn?.addEventListener("click", () => {
    if (!activeWorkout) return;

    const name = modalInput.value.trim();
    if (!name) return;

    addExerciseToWorkout(activeWorkout, name);
    renderExercises(activeWorkout);

    modalInput.value = "";
    clearExerciseModalSuggestions();
    closeExerciseModal();
  });

  /* =========================
     EXERCISE MODAL – LIBRARY
     ========================= */
  modalInput?.addEventListener("input", e => {
    const user = getCurrentUser();
    if (!user || !Array.isArray(user.exerciseLibrary)) return;

    const value = e.target.value.toLowerCase();
    modalSuggestions.innerHTML = "";

    if (!value) return;

    user.exerciseLibrary
      .filter(name => name.toLowerCase().includes(value))
      .forEach(name => {
        const li = document.createElement("li");
        li.textContent = name;

        li.addEventListener("click", () => {
          modalInput.value = name;
          clearExerciseModalSuggestions();
        });

        modalSuggestions.appendChild(li);
      });
  });

  /* =========================
     SETS & AUTO REST
     ========================= */
  exerciseListEl?.addEventListener("click", e => {
    if (!activeWorkout) return;

    if (e.target.dataset.addSet !== undefined) {
      addSet(activeWorkout, Number(e.target.dataset.addSet));
      renderExercises(activeWorkout);
    }

    if (e.target.dataset.removeSet !== undefined) {
      removeSet(
        activeWorkout,
        Number(e.target.dataset.ex),
        Number(e.target.dataset.removeSet)
      );
      renderExercises(activeWorkout);
    }
  });

exerciseListEl?.addEventListener("input", e => {
  if (!activeWorkout) return;

  const { ex, set, field } = e.target.dataset;
  if (!field) return;

  updateSet(
    activeWorkout,
    Number(ex),
    Number(set),
    field,
    e.target.value
  );

  const s = activeWorkout.exercises[ex].sets[set];

  if (!s.completed && s.weight && s.reps) {
    s.completed = true;

    if (activeWorkout.useRestTimer) {
      startRest(activeWorkout.restDuration);
    }
  }
});

  /* =========================
     TIMER CONTROLS
     ========================= */
  pauseBtn?.addEventListener("click", () => {
    pauseTimer(activeWorkout);
    stopTimerUI();
    showResume();
  });

  resumeBtn?.addEventListener("click", () => {
    resumeTimer(activeWorkout);
    startTimerUI(activeWorkout);
  });

/* =========================
   REST TIMER (SET DEFAULT)
   ========================= */
function setRestDuration(seconds) {
  if (!activeWorkout) return;

  activeWorkout.restDuration = seconds;
  activeWorkout.useRestTimer = true;

  if (restToggle) {
    restToggle.checked = true;
  }

  startRest(seconds);
}

rest30Btn?.addEventListener("click", () => setRestDuration(30));
rest60Btn?.addEventListener("click", () => setRestDuration(60));
rest90Btn?.addEventListener("click", () => setRestDuration(90));

cancelRestBtn?.addEventListener("click", () => {
  stopRest();
});


  /* =========================
     FINISH WORKOUT
     ========================= */
  finishBtn?.addEventListener("click", () => {
    if (!activeWorkout) return;

    stopTimerUI();
    stopRest();

    activeWorkout.name = workoutNameInput.value || "Untitled Workout";
    finishWorkout(activeWorkout);
    showWorkoutSummary(activeWorkout);
  });

  summaryDoneBtn?.addEventListener("click", () => {
    document.getElementById("workout-summary").hidden = true;
    showWorkoutList();
    renderWorkoutHistory(getCurrentUser().workouts);
    updateHomeButtons();
  });

  /* =========================
     TEMPLATES
     ========================= */
  templateList?.addEventListener("click", e => {
    const deleteBtn = e.target.closest(".delete-template-btn");
    if (deleteBtn) {
      const id = deleteBtn.dataset.id;
      if (confirm("Delete this template?")) {
        deleteTemplate(id);
        renderTemplates(getCurrentUser().templates || []);
      }
      return;
    }

    const li = e.target.closest("li");
    if (!li?.dataset.id) return;

    activeWorkout = startWorkoutFromTemplate(li.dataset.id);
    if (!activeWorkout) return;

    workoutNameInput.value = activeWorkout.name;
    syncRestToggle();

    showActiveWorkout();
    renderExercises(activeWorkout);
    startTimerUI(activeWorkout);
    updateHomeButtons();
  });
});

/* =========================
   HELPERS
   ========================= */
function clearExerciseModalSuggestions() {
  const list = document.getElementById("exercise-modal-suggestions");
  if (list) list.innerHTML = "";
}
