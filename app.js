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
  let lastFinishedWorkout = null;

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

  function syncRestToggle() {
    if (restToggle && activeWorkout) {
      restToggle.checked = !!activeWorkout.useRestTimer;
    }
  }

  /* =========================
     AUTH
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
     REST SETTINGS
     ========================= */
  restToggle?.addEventListener("change", e => {
    if (!activeWorkout) return;
    activeWorkout.useRestTimer = e.target.checked;
    if (!e.target.checked) stopRest();
  });

  function setRestDuration(seconds) {
    if (!activeWorkout) return;
    activeWorkout.restDuration = seconds;
    activeWorkout.useRestTimer = true;
    if (restToggle) restToggle.checked = true;
    startRest(seconds);
  }

  rest30Btn?.addEventListener("click", () => setRestDuration(30));
  rest60Btn?.addEventListener("click", () => setRestDuration(60));
  rest90Btn?.addEventListener("click", () => setRestDuration(90));
  cancelRestBtn?.addEventListener("click", stopRest);

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

  modalInput?.addEventListener("input", e => {
    const user = getCurrentUser();
    if (!user || !Array.isArray(user.exerciseLibrary)) return;

    const value = e.target.value.toLowerCase();
    modalSuggestions.innerHTML = "";

    if (!value) return;

    user.exerciseLibrary
      .filter(n => n.toLowerCase().includes(value))
      .forEach(name => {
        const li = document.createElement("li");
        li.textContent = name;
        li.onclick = () => {
          modalInput.value = name;
          clearExerciseModalSuggestions();
        };
        modalSuggestions.appendChild(li);
      });
  });

  /* =========================
     SETS & AUTO REST
     ========================= */
  exerciseListEl?.addEventListener("input", e => {
    if (!activeWorkout) return;

    const { ex, set, field } = e.target.dataset;
    if (!field) return;

    updateSet(activeWorkout, +ex, +set, field, e.target.value);

    const s = activeWorkout.exercises[ex].sets[set];
    if (!s.completed && s.weight && s.reps && activeWorkout.useRestTimer) {
      s.completed = true;
      startRest(activeWorkout.restDuration || 30);
    }
  });

  /* =========================
     FINISH WORKOUT
     ========================= */
  finishBtn?.addEventListener("click", () => {
    if (!activeWorkout) return;

    stopTimerUI();
    stopRest();

    activeWorkout.name = workoutNameInput.value || "Untitled Workout";
    lastFinishedWorkout = structuredClone(activeWorkout);

    finishWorkout(activeWorkout);
    activeWorkout = null;

    showWorkoutSummary(lastFinishedWorkout);
  });

  summaryDoneBtn?.addEventListener("click", () => {
    document.getElementById("workout-summary").hidden = true;
    showWorkoutList();
    renderWorkoutHistory(getCurrentUser().workouts);
    updateHomeButtons();
  });

  /* =========================
     SAVE TEMPLATE (FIXED)
     ========================= */
saveTemplateBtn?.addEventListener("click", () => {
  if (!activeWorkout) {
    alert("No active workout to save.");
    return;
  }

  const templateWorkout = structuredClone(activeWorkout);
  templateWorkout.id = crypto.randomUUID();
  templateWorkout.date = null; // templates don't need dates

  saveTemplateFromWorkout(templateWorkout);
  renderTemplates(getCurrentUser().templates || []);

  alert("Template saved!");
});


  /* =========================
     TEMPLATES
     ========================= */
  templateList?.addEventListener("click", e => {
    const del = e.target.closest(".delete-template-btn");
    if (del) {
      if (confirm("Delete this template?")) {
        deleteTemplate(del.dataset.id);
        renderTemplates(getCurrentUser().templates || []);
      }
      return;
    }

    const li = e.target.closest("li");
    if (!li?.dataset.id) return;

    activeWorkout = startWorkoutFromTemplate(li.dataset.id);
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
