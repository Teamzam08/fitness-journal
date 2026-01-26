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
   USER NORMALIZATION
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
   Register User (LOCAL → SERVER)
   ========================= */
async function registerUser(username, password) {
  if (!username || !password) {
    throw new Error("Username and password are required");
  }

  const passwordHash = await hashPassword(password);

  const newUser = normalizeUser({
    passwordHash,
    workouts: [],
    activeWorkout: null,
    exerciseHistory: {},
    templates: [],
    exerciseLibrary: [],
    updatedAt: Date.now()
  });

  // Save locally FIRST
  state.users ||= {};
  state.users[username] = newUser;
  state.currentUser = username;
  saveState(state);

  // Push to server (safe, non-blocking)
  try {
    await syncUserToServer(newUser);
  } catch (err) {
    console.warn("Server sync failed (offline-safe)", err);
  }

  markTrustedDevice(username);
}

/* =========================
   Login User (CONFLICT SAFE)
   ========================= */
async function loginUser(username, password, rememberMe = false) {
  if (!username || !password) {
    throw new Error("Username and password are required");
  }

  // Fetch server copy
  const serverUserRaw = await fetchUserFromServer(username);
  if (!serverUserRaw) {
    throw new Error("Invalid username or password");
  }

  const serverUser = normalizeUser(serverUserRaw);

  // Verify password
  const passwordHash = await hashPassword(password);
  if (passwordHash !== serverUser.passwordHash) {
    throw new Error("Invalid username or password");
  }

  // Local copy (if exists)
  const localUser = state.users?.[username];

  let finalUser;

  if (
    localUser &&
    localUser.updatedAt &&
    localUser.updatedAt > serverUser.updatedAt
  ) {
    // LOCAL IS NEWER → push it up
    finalUser = localUser;

    try {
      await syncUserToServer(localUser);
      console.log("Local user pushed to server (newer)");
    } catch (err) {
      console.warn("Failed to push newer local user", err);
    }
  } else {
    // SERVER IS NEWER → hydrate locally
    finalUser = serverUser;
  }

  // Touch timestamp (fresh login)
  finalUser.updatedAt = Date.now();

  state.users ||= {};
  state.users[username] = finalUser;
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
