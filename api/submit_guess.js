import { db } from './db.js';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { puzzleId, cellId, gameId } = req.body;

    if (!puzzleId || !cellId || !gameId) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    try {
        const client = await db.connect();

        // Create tables if they don't exist (lazy initialization)
        await client.sql`
      CREATE TABLE IF NOT EXISTS guesses (
        id SERIAL PRIMARY KEY,
        puzzle_id TEXT NOT NULL,
        cell_id TEXT NOT NULL,
        game_id INTEGER NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;

        // Insert the guess
        await client.sql`
      INSERT INTO guesses (puzzle_id, cell_id, game_id)
      VALUES (${puzzleId}, ${cellId}, ${gameId});
    `;

        // Calculate stats
        // 1. Total guesses for this cell
        const totalResult = await client.sql`
      SELECT COUNT(*) as count FROM guesses 
      WHERE puzzle_id = ${puzzleId} AND cell_id = ${cellId};
    `;
        const totalGuesses = parseInt(totalResult.rows[0].count);

        // 2. Guesses for this specific game in this cell
        const gameResult = await client.sql`
      SELECT COUNT(*) as count FROM guesses 
      WHERE puzzle_id = ${puzzleId} AND cell_id = ${cellId} AND game_id = ${gameId};
    `;
        const gameGuesses = parseInt(gameResult.rows[0].count);

        // 3. Calculate rarity
        const rarity = (gameGuesses / totalGuesses) * 100;
        const isUnicorn = gameGuesses === 1;

        client.release();

        return res.status(200).json({
            rarity: parseFloat(rarity.toFixed(2)),
            isUnicorn
        });

    } catch (error) {
        console.error('Database error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}
