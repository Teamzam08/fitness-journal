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

  const data = await res.json();

  state.users ??= {};
  state.users[username] = data;
  state.currentUser = username;

  saveState(state);
}
