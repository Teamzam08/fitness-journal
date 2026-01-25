/* =========================
   Authentication Helpers
   ========================= */

/**
 * Hash password (SHA-256)
 * Browser-native, secure
 */
async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);

  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
}

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
   Register User (LOCAL → SERVER)
   ========================= */
async function registerUser(username, password) {
  if (!username || !password) {
    throw new Error("Username and password are required");
  }

  const passwordHash = await hashPassword(password);

  // Create canonical user object
  const newUser = {
    version: 1,
    passwordHash,
    workouts: [],
    activeWorkout: null,
    exerciseHistory: {},
    templates: [],
    exerciseLibrary: []
  };

  // Save locally FIRST (offline-safe)
  state.users ||= {};
  state.users[username] = newUser;
  state.currentUser = username;
  saveState(state);

  // Push to Neon (non-blocking)
  try {
    await syncUserToServer(newUser);
  } catch (err) {
    console.warn("Server sync failed (offline-safe)", err);
  }

  // Registration always trusts device
  markTrustedDevice(username);
}

/* =========================
   Login User (SERVER → LOCAL)
   ========================= */
async function loginUser(username, password, rememberMe = false) {
  if (!username || !password) {
    throw new Error("Username and password are required");
  }

  // Attempt server fetch first (cross-device support)
  let serverUser = null;
  try {
    serverUser = await fetchUserFromServer(username);
  } catch (err) {
    console.warn("Server fetch failed, falling back to local", err);
  }

  if (!serverUser) {
    throw new Error("Invalid username or password");
  }

  // Verify password
  const passwordHash = await hashPassword(password);
  if (passwordHash !== serverUser.passwordHash) {
    throw new Error("Invalid username or password");
  }

  // 🔥 NORMALIZE SERVER-HYDRATED USER
  serverUser.version ??= 1;
  serverUser.workouts ??= [];
  serverUser.activeWorkout ??= null;
  serverUser.exerciseHistory ??= {};
  serverUser.templates ??= [];
  serverUser.exerciseLibrary ??= [];

  // Hydrate local state
  state.users ||= {};
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
  state.currentUser = null;
  clearTrustedDevice();
  saveState(state);
}
function deepEqual(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}
