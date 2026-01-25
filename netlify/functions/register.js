import { Client } from "pg";

export async function handler(event) {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: "Method Not Allowed"
    };
  }

  const { username, passwordHash } = JSON.parse(event.body || "{}");

  if (!username || !passwordHash) {
    return {
      statusCode: 400,
      body: "Missing username or password"
    };
  }

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();

    const userData = {
      workouts: [],
      templates: [],
      exerciseHistory: {},
      exerciseLibrary: [],
      activeWorkout: null
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
    return {
      statusCode: 500,
      body: err.message
    };
  } finally {
    await client.end();
  }
}
