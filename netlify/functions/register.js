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
    return { statusCode: 400, body: "Missing username or password" };
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const userData = {
    version: 1,
    passwordHash,
    workouts: [],
    activeWorkout: null,
    exerciseHistory: {},
    templates: [],
    exerciseLibrary: [],
    updatedAt: Date.now()
  };

  try {
    await pool.query(
      `
      INSERT INTO users (username, data, updated_at)
      VALUES ($1, $2, NOW())
      ON CONFLICT (username)
      DO NOTHING
      `,
      [username, userData]
    );

    return {
      statusCode: 200,
      body: JSON.stringify(userData)
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: err.message
    };
  }
}
