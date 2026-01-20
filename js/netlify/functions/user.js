import { Client } from "pg";

export async function handler(event) {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: "Method Not Allowed"
    };
  }

  const { username, data } = JSON.parse(event.body || "{}");

  if (!username || !data) {
    return {
      statusCode: 400,
      body: "Missing username or data"
    };
  }

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();

    await client.query(
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
      body: JSON.stringify({ success: true })
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message })
    };
  } finally {
    await client.end();
  }
}

