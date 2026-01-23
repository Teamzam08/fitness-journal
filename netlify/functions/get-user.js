import pkg from "pg";
const { Pool } = pkg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

export async function handler(event) {
  if (event.httpMethod !== "GET") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  const username = event.queryStringParameters?.username;
  if (!username) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Username required" })
    };
  }

  try {
    const result = await pool.query(
      "SELECT data FROM users WHERE username = $1",
      [username]
    );

    if (result.rowCount === 0) {
      return {
        statusCode: 200,
        body: JSON.stringify({ data: null })
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ data: result.rows[0].data })
    };
  } catch (err) {
    console.error(err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Database error" })
    };
  }
}

