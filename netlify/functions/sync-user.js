const { Client } = require("pg");

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    const { username, data } = JSON.parse(event.body);

    if (!username || !data) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Missing user data" })
      };
    }

    const client = new Client({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false }
    });

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

    await client.end();

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true })
    };
  } catch (err) {
    console.error("SYNC ERROR:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Failed to sync user" })
    };
  }
};
