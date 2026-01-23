import pkg from "pg";
const { Pool } = pkg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

export async function handler(event) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    const { username, data } = JSON.parse(event.body);

    if (!username || !data) {
      return { statusCode: 400, body: "Missing data" };
    }

    await pool.query(
      `
      INSERT INTO users (username, data)
      VALUES ($1, $2)
      ON CONFLICT (username)
      DO UPDATE SET data = EXCLUDED.data, updated_at = NOW()
      `,
      [username, data]
    );

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true })
    };
  } catch (err) {
    console.error(err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message })
    };
  }
}
