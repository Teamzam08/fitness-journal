/* =========================
   Authentication Helpers
   ========================= */

/**
 * Hash password (SHA-256)
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

  // Create user payload
const newUser = {
  version: 1,
  passwordHash,
  workouts: [],
  activeWorkout: null,
  exerciseHistory: {},
  templates: [],
  exerciseLibrary: []
};


  // Save locally FIRST
  state.users ??= {};
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

  // Fetch user from Neon
  const serverUser = await fetchUserFromServer(username);
  if (!serverUser) {
    throw new Error("Invalid username or password");
  }

  const passwordHash = await hashPassword(password);
  if (passwordHash !== serverUser.passwordHash) {
    throw new Error("Invalid username or password");
  }

  // Hydrate local state from server
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
  state.currentUser = null;
  clearTrustedDevice();
  saveState(state);
}
