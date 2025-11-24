import { sql } from '@vercel/postgres';

export default async function handler(request, response) {
    try {
        // Drop the table if it exists (to fix the schema)
        await sql`DROP TABLE IF EXISTS guesses;`;

        // Recreate the table with the correct schema
        await sql`
      CREATE TABLE guesses (
        id SERIAL PRIMARY KEY,
        puzzle_id TEXT NOT NULL,
        cell_id TEXT NOT NULL,
        game_id INTEGER NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;

        return response.status(200).json({ message: 'Database schema initialized successfully!' });
    } catch (error) {
        console.error('DB Init Error:', error);
        return response.status(500).json({ error: 'Failed to initialize database', details: error.message });
    }
}
