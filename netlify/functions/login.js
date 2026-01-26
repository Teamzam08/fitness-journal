import bcrypt from "bcryptjs";
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

export async function handler(event) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  const { username, password } = JSON.parse(event.body || "{}");

  if (!username || !password) {
    return { statusCode: 400, body: "Missing credentials" };
  }

  try {
    const result = await pool.query(
      "SELECT data FROM users WHERE username = $1",
      [username]
    );

    if (result.rows.length === 0) {
      return { statusCode: 401, body: "Invalid username or password" };
    }

    const user = result.rows[0].data;

    const isValid = await bcrypt.compare(password, user.passwordHash);

    if (!isValid) {
      return { statusCode: 401, body: "Invalid username or password" };
    }

    return {
      statusCode: 200,
      body: JSON.stringify(user)
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: err.message
    };
  }
}
