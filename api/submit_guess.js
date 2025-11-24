const { sql } = require('@vercel/postgres');

module.exports = async function handler(request, response) {
    // 1. Handle CORS (needed because Vite runs on port 5173, API runs on 3000)
    response.setHeader('Access-Control-Allow-Credentials', true);
    response.setHeader('Access-Control-Allow-Origin', '*');
    response.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');

    if (request.method === 'OPTIONS') {
        return response.status(200).end();
    }

    // 2. Only allow POST requests
    if (request.method !== 'POST') {
        return response.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        const { puzzleId, cellId, gameId } = request.body;

        // 3. Insert the user's guess
        await sql`
      INSERT INTO guesses (puzzle_id, cell_id, game_id)
      VALUES (${puzzleId}, ${cellId}, ${gameId});
    `;

        // 4. Calculate Rarity (The Math)

        // A: How many people guessed THIS specific game?
        const { rows: specificRows } = await sql`
      SELECT COUNT(*) as count FROM guesses 
      WHERE puzzle_id = ${puzzleId} AND cell_id = ${cellId} AND game_id = ${gameId}
    `;
        const specificCount = parseInt(specificRows[0].count);

        // B: How many people guessed ANY game for this cell?
        const { rows: totalRows } = await sql`
      SELECT COUNT(*) as count FROM guesses 
      WHERE puzzle_id = ${puzzleId} AND cell_id = ${cellId}
    `;
        const totalCount = parseInt(totalRows[0].count);

        // C: Calculate percentage
        const rarity = totalCount > 0 ? ((specificCount / totalCount) * 100) : 0;

        // 5. Send the result back to React
        return response.status(200).json({
            rarity: parseFloat(rarity.toFixed(1)), // e.g., 5.4
            isUnicorn: specificCount === 1,        // True if they are the first person ever
            totalGuesses: totalCount
        });

    } catch (error) {
        console.error('DB Error:', error);
        return response.status(500).json({ error: 'Database connection failed' });
    }
};
