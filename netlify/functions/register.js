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

    // 🔐 HASH PASSWORD SERVER-SIDE
    const passwordHash = await bcrypt.hash(password, 10);

    const userData = {
      version: 1,
      passwordHash,
      workouts: [],
      activeWorkout: null,
      exerciseHistory: {},
      templates: [],
      exerciseLibrary: []
    };

    await client.query(
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
    console.error(err);
    return {
      statusCode: 500,
      body: err.message
    };
  } finally {
    await client.end();
  }
}
