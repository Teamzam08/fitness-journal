import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

export async function handler(event) {
  // ✅ CORS (required)
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS"
  };

  // Preflight
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers };
  }

  try {
    // =========================
    // SAVE USER (POST)
    // =========================
    if (event.httpMethod === "POST") {
      const { username, data } = JSON.parse(event.body || "{}");

      if (!username || !data) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: "Missing username or data" })
        };
      }

      await pool.query(
        `
        INSERT INTO users (username, data, updated_at)
        VALUES ($1, $2, NOW())
        ON CONFLICT (username)
        DO UPDATE SET
          data = EXCLUDED.data,
          updated_at = NOW()
        `,
        [username, data]
      );

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true })
      };
    }

    // =========================
    // FETCH USER (GET)
    // =========================
    if (event.httpMethod === "GET") {
      const username = event.queryStringParameters?.username;

      if (!username) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: "Missing username" })
        };
      }

      const result = await pool.query(
        "SELECT data FROM users WHERE username = $1",
        [username]
      );

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(
          result.rows[0]?.data || null
        )
      };
    }

    return {
      statusCode: 405,
      headers,
      body: "Method Not Allowed"
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: err.message })
    };
  }
}
