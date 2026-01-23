async function loginUser(username, password, rememberMe = false) {
  const passwordHash = await hashPassword(password);

  const res = await fetch("/.netlify/functions/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, passwordHash })
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || "Login failed");
  }

  state.currentUser = data.username;
  state.users[data.username] = data.data;

  if (rememberMe) {
    markTrustedDevice(username);
  }

  saveState(state);
}

