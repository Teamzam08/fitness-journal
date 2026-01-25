import pkg from "pg";
const { Client } = pkg;

export async function handler(event) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  const { username, passwordHash } = JSON.parse(event.body || "{}");

  if (!username || !passwordHash) {
    return { statusCode: 400, body: "Missing username or password" };
  }

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

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
    await client.connect();

    const result = await client.query(
      `
      INSERT INTO users (username, data, updated_at)
      VALUES ($1, $2, NOW())
      ON CONFLICT (username)
      DO NOTHING
      RETURNING data
      `,
      [username, userData]
    );

    // 🚨 Username already exists
    if (result.rowCount === 0) {
      return {
        statusCode: 409,
        body: "User already exists"
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify(userData)
    };
  } catch (err) {
    console.error("Register error:", err);
    return {
      statusCode: 500,
      body: "Server error"
    };
  } finally {
    await client.end();
  }
}
