const { createPool } = require('@vercel/postgres');

const db = createPool({
    connectionString: process.env.POSTGRES_URL,
});

module.exports = { db };
