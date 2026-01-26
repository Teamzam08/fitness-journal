import bcrypt from "bcryptjs";
import pkg from "pg";
const { Client } = pkg;

export async function handler(event) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  const { username, password } = JSON.parse(event.body || "{}");

  if (!username || !password) {
    return { statusCode: 400, body: "Missing username or password" };
  }

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();

    const result = await client.query(
      "SELECT data FROM users WHERE username = $1",
      [username]
    );

    if (result.rows.length === 0) {
      return { statusCode: 401, body: "Invalid credentials" };
    }

    const user = result.rows[0].data;

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return { statusCode: 401, body: "Invalid credentials" };
    }

    return {
      statusCode: 200,
      body: JSON.stringify(user)
    };
  } catch (err) {
    console.error(err);
    return {
      statusCode: 500,
      body: err.message
    };
  } finally {
    await client.end();
  }
}
