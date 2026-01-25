/* =========================
   Authentication Helpers
   ========================= */

/**
 * Hash password (client-side, SHA-256)
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
   Register User (SERVER FIRST)
   ========================= */
async function registerUser(username, password) {
  if (!username || !password) {
    throw new Error("Username and password are required");
  }

  const passwordHash = await hashPassword(password);

  const res = await fetch("/.netlify/functions/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, passwordHash })
  });

  if (!res.ok) {
    throw new Error(await res.text());
  }

  // Server returns full user object
  const userData = await res.json();

  // Hydrate local state from server
  state.users ||= {};
  state.users[username] = userData;
  state.currentUser = username;

  markTrustedDevice(username);
  saveState(state);
}

/* =========================
   Login User (SERVER FIRST)
   ========================= */
async function loginUser(username, password, rememberMe = false) {
  if (!username || !password) {
    throw new Error("Username and password are required");
  }

  const passwordHash = await hashPassword(password);

  const res = await fetch("/.netlify/functions/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, passwordHash })
  });

  if (!res.ok) {
    throw new Error(await res.text());
  }

  const userData = await res.json();

  // Hydrate local state
  state.users ||= {};
  state.users[username] = userData;
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
