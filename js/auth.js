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

const newUser = {
  version: 1,
  passwordHash,
  workouts: [],
  activeWorkout: null,
  exerciseHistory: {},
  templates: [],
  exerciseLibrary: [],
  updatedAt: Date.now()
};


  // Save locally first
  state.users ||= {};
  state.users[username] = newUser;
  state.currentUser = username;
  saveState(state);

  // Push to server (non-blocking)
  try {
    await syncUserToServer(newUser);
  } catch (err) {
    console.warn("Server sync failed (offline-safe)", err);
  }

  markTrustedDevice(username);
}

/* =========================
   Login User (SERVER → LOCAL)
   ========================= */
async function loginUser(username, password, rememberMe = false) {
  if (!username || !password) {
    throw new Error("Username and password are required");
  }

  // Fetch from Neon
  const serverUser = await fetchUserFromServer(username);
  if (!serverUser) {
    throw new Error("Invalid username or password");
  }

  // Verify password
  const passwordHash = await hashPassword(password);
  if (passwordHash !== serverUser.passwordHash) {
    throw new Error("Invalid username or password");
  }

  // Normalize / migrate server user
  const migratedUser = migrateUser(serverUser);

  // Save locally
  state.users ||= {};
  state.users[username] = migratedUser;
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
    syncUserToServer(user);
  }

  state.currentUser = null;
  clearTrustedDevice();
  saveState(state);
}


/* =========================
   Utilities
   ========================= */
function deepEqual(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}
