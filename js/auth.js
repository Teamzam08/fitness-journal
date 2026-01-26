/* =========================
   Authentication Helpers
   ========================= */

/* =========================
   Trusted Device Helpers
   ========================= */
function markTrustedDevice(username) {
  localStorage.setItem("trustedUser", username);
}

function clearTrustedDevice() {
  localStorage.removeItem("trustedUser");
}

function isTrustedDevice() {
  const trustedUser = localStorage.getItem("trustedUser");
  return trustedUser && trustedUser === state.currentUser;
}

/* =========================
   User Normalization
   ========================= */
function normalizeUser(user) {
  return {
    version: user.version ?? 1,
    passwordHash: user.passwordHash,
    workouts: user.workouts ?? [],
    activeWorkout: user.activeWorkout ?? null,
    exerciseHistory: user.exerciseHistory ?? {},
    templates: user.templates ?? [],
    exerciseLibrary: user.exerciseLibrary ?? [],
    updatedAt: user.updatedAt ?? Date.now()
  };
}

/* =========================
   Register User (SERVER ONLY)
   ========================= */
async function registerUser(username, password) {
  if (!username || !password) {
    throw new Error("Username and password are required");
  }

  const res = await fetch("/.netlify/functions/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password })
  });

  if (!res.ok) {
    throw new Error(await res.text());
  }

  const serverUser = normalizeUser(await res.json());

  state.users ??= {};
  state.users[username] = serverUser;
  state.currentUser = username;

  markTrustedDevice(username);
  saveState(state);
}

/* =========================
   Login User (SERVER → LOCAL)
   ========================= */
async function loginUser(username, password, rememberMe = false) {
  if (!username || !password) {
    throw new Error("Username and password are required");
  }

  const res = await fetch("/.netlify/functions/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password })
  });

  if (!res.ok) {
    throw new Error("Invalid username or password");
  }

  const serverUser = normalizeUser(await res.json());

  state.users ??= {};
  state.users[username] = serverUser;
  state.currentUser = username;

  if (rememberMe) {
    markTrustedDevice(username);
  } else {
    clearTrustedDevice();
  }

  saveState(state);
}

/* =========================
   Logout
   ========================= */
function logoutUser() {
  const user = state.users?.[state.currentUser];

  if (user) {
    try {
      syncUserToServer(user);
    } catch (_) {}
  }

  state.currentUser = null;
  clearTrustedDevice();
  saveState(state);
}
