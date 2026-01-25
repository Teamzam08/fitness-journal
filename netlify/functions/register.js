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
    const err = await res.text();
    throw new Error(err || "Registration failed");
  }

  const data = await res.json();

  // ✅ SERVER RETURNS FULL USER DATA
  state.users ??= {};
  state.users[username] = data;
  state.currentUser = username;

  saveState(state);
}
