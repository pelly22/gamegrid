const express = require('express');
const axios = require('axios');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// IGDB Credentials
const CLIENT_ID = '6pw096k2ertshfoxppzbnbj73lio81';
const CLIENT_SECRET = '6wcm2g0p4hafo4645962wpq1n5pa54';

let accessToken = null;
let tokenExpiry = 0;
let gamesCache = []; // In-memory cache of popular games

// --- Helper: Get Access Token ---
async function getAccessToken() {
    if (accessToken && Date.now() < tokenExpiry) {
        return accessToken;
    }

    try {
        console.log('Requesting new access token...');
        const response = await axios.post('https://id.twitch.tv/oauth2/token', null, {
            params: {
                client_id: CLIENT_ID,
                client_secret: CLIENT_SECRET,
                grant_type: 'client_credentials'
            }
        });

        accessToken = response.data.access_token;
        tokenExpiry = Date.now() + (response.data.expires_in * 1000) - 60000;
        console.log('Access token received.');
        return accessToken;
    } catch (error) {
        console.error('Error getting access token:', error.response ? error.response.data : error.message);
        throw new Error('Failed to authenticate with IGDB');
    }
}

// --- Helper: IGDB Request ---
async function igdbRequest(endpoint, query) {
    const token = await getAccessToken();
    try {
        const response = await axios.post(`https://api.igdb.com/v4/${endpoint}`, query, {
            headers: {
                'Client-ID': CLIENT_ID,
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'text/plain'
            }
        });
        return response.data;
    } catch (error) {
        console.error(`Error querying IGDB (${endpoint}):`, error.response ? JSON.stringify(error.response.data) : error.message);
        throw error;
    }
}

// --- Cache Population ---
async function populateCache() {
    console.log("Populating game cache...");
    try {
        // Fetch top 500 popular games with all necessary metadata
        // We use total_rating_count as a proxy for popularity/notability
        const query = `
            fields name, first_release_date, total_rating_count,
            genres.name, 
            platforms.name, 
            involved_companies.company.name, involved_companies.developer, involved_companies.publisher,
            collection.name;
            sort total_rating_count desc;
            where total_rating_count > 10 & category = (0, 8, 9);
            limit 500;
        `;

        const results = await igdbRequest('games', query);

        gamesCache = results.map(g => ({
            id: g.id,
            title: g.name,
            year: g.first_release_date ? new Date(g.first_release_date * 1000).getFullYear() : null,
            genres: g.genres ? g.genres.map(x => x.name) : [],
            platforms: g.platforms ? g.platforms.map(x => x.name) : [],
            developers: g.involved_companies ? g.involved_companies.filter(c => c.developer).map(c => c.company.name) : [],
            publishers: g.involved_companies ? g.involved_companies.filter(c => c.publisher).map(c => c.company.name) : [],
            series: g.collection ? g.collection.name : 'None'
        }));

        console.log(`Cache populated with ${gamesCache.length} games.`);
    } catch (error) {
        console.error("Failed to populate cache:", error);
    }
}

// --- Validation Logic (Local) ---
function validateGameAgainstCategory(game, category) {
    switch (category.type) {
        case 'developers':
            return game.developers.some(d => d === category.value);
        case 'publishers':
            return game.publishers.some(p => p === category.value);
        case 'platforms':
            return game.platforms.includes(category.value);
        case 'genres':
            return game.genres.includes(category.value);
        case 'series':
            return game.series === category.value;
        case 'years':
            if (!game.year) return false;
            if (category.value === "Before 2010") return game.year < 2010;
            if (category.value === "2010-2014") return game.year >= 2010 && game.year <= 2014;
            if (category.value === "2015-2019") return game.year >= 2015 && game.year <= 2019;
            if (category.value === "2020-Present") return game.year >= 2020;
            return false;
        default:
            return false;
    }
}

// --- Endpoints ---

// 1. Search Games (Local Cache)
app.post('/api/search', (req, res) => {
    const { query } = req.body;
    if (!query) return res.status(400).json({ error: 'Query is required' });

    const lowerQuery = query.toLowerCase();
    const matches = gamesCache
        .filter(g => g.title.toLowerCase().includes(lowerQuery))
        .slice(0, 20); // Limit results

    res.json(matches);
});

// 2. Get Game Details (Local Cache)
app.post('/api/game', (req, res) => {
    const { id } = req.body;
    if (!id) return res.status(400).json({ error: 'ID is required' });

    const game = gamesCache.find(g => g.id === id);
    if (!game) return res.status(404).json({ error: 'Game not found' });

    res.json(game);
});

// 3. Validate Intersection (Local Cache)
app.post('/api/validate-intersection', (req, res) => {
    const { rowCategory, colCategory } = req.body;

    // Check if ANY game in the cache satisfies both conditions
    const valid = gamesCache.some(game =>
        validateGameAgainstCategory(game, rowCategory) &&
        validateGameAgainstCategory(game, colCategory)
    );

    res.json({ valid });
});

// Start Server
app.listen(PORT, async () => {
    console.log(`Server running on http://localhost:${PORT}`);
    await populateCache();
});
