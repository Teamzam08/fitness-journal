/* =========================
   Authentication Helpers
   ========================= */

/**
 * Hash a password using SHA-256
 * Browser-native, secure, no dependencies
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
   User Lookup
   ========================= */
function getUser(username) {
  return state.users[username] || null;
}

/* =========================
   Register User
   ========================= */
async function registerUser(username, password) {
  if (!username || !password) {
    throw new Error("Username and password are required");
  }

  // ✅ GUARANTEE users object exists
  if (!state.users) {
    state.users = {};
  }

  if (state.users[username]) {
    throw new Error("User already exists");
  }

  const passwordHash = await hashPassword(password);

  state.users[username] = {
    passwordHash,
    workouts: [],
    activeWorkout: null,
    exerciseHistory: {},
    templates: [],
    exerciseLibrary: []
  };

state.currentUser = username;
await syncUserToServer(state.users[username]);


// 🔥 HYDRATE FROM NEON
const serverData = await fetchUserFromServer(username);

if (serverData) {
  state.users[username] = serverData;
} else if (!state.users[username]) {
  // fallback if brand new user
  state.users[username] = {
    workouts: [],
    activeWorkout: null,
    exerciseHistory: {},
    templates: [],
    exerciseLibrary: []
  };
}

if (rememberMe) {
  markTrustedDevice(username);
} else {
  clearTrustedDevice();
}

saveState(state);

}


/* =========================
   Login User
   ========================= */
async function loginUser(username, password, rememberMe = false) {
  if (!username || !password) {
    throw new Error("Username and password are required");
  }

  const user = state.users[username];
  if (!user) {
    throw new Error("Invalid username or password");
  }

  const passwordHash = await hashPassword(password);
  if (passwordHash !== user.passwordHash) {
    throw new Error("Invalid username or password");
  }

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
