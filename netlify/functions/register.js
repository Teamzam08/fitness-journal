async function registerUser(username, password) {
  const passwordHash = await hashPassword(password);

  const res = await fetch("/.netlify/functions/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, passwordHash })
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || "Registration failed");
  }

  state.currentUser = data.username;
  state.users[data.username] = data.data;
  saveState(state);
}

