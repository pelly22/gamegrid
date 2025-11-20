// Use global categories for grid generation, but fetch games from API
console.log("Script starting...");
const { categories } = window.GAME_DATA;
const API_URL = 'http://127.0.0.1:3000/api';

// Connectivity Test
fetch(`${API_URL}/search`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: 'Zelda' })
})
    .then(res => res.json())
    .then(data => console.log("Connectivity Test Success:", data.length > 0))
    .catch(err => console.error("Connectivity Test Failed:", err));

// --- Game State ---
const state = {
    grid: {
        rows: [],
        cols: []
    },
    lives: 9,
    score: 0,
    usedGameIds: new Set(),
    selectedCell: null,
    gameOver: false
};

// --- Seeded Random ---
function getDailySeed() {
    const today = new Date();
    return parseInt(`${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`);
}

function seededRandom(seed) {
    let s = seed;
    return function () {
        s = Math.sin(s) * 10000;
        return s - Math.floor(s);
    };
}

// --- Grid Generation ---
async function generateGrid() {
    console.log("generateGrid started");
    let seed = getDailySeed();
    let attempts = 0;
    const maxAttempts = 3;
    let validGridFound = false;

    // Flatten categories
    const allCats = [];
    Object.keys(categories).forEach(type => {
        categories[type].forEach(value => {
            allCats.push({ type, value, label: value });
        });
    });

    while (!validGridFound && attempts < maxAttempts) {
        attempts++;
        console.log(`Attempt ${attempts}: Generating grid...`);
        const rng = seededRandom(seed + attempts);

        // 1. Pick 3 distinct rows
        const rowCats = [];
        const availableRows = [...allCats];
        while (rowCats.length < 3 && availableRows.length > 0) {
            const idx = Math.floor(rng() * availableRows.length);
            rowCats.push(availableRows[idx]);
            availableRows.splice(idx, 1);
        }

        // 2. Find 3 compatible columns
        const colCats = [];
        let availableCols = [...allCats].filter(c => !rowCats.some(r => r.type === c.type && r.value === c.value));

        // Shuffle availableCols
        for (let i = availableCols.length - 1; i > 0; i--) {
            const j = Math.floor(rng() * (i + 1));
            [availableCols[i], availableCols[j]] = [availableCols[j], availableCols[i]];
        }

        // Limit to checking 3 random columns to avoid long wait times
        availableCols = availableCols.slice(0, 3);

        for (const col of availableCols) {
            if (colCats.length >= 3) break;

            // Check if this column is valid with ALL 3 rows
            let isValidCol = true;
            for (const row of rowCats) {
                const valid = await checkIntersection(row, col);
                if (!valid) {
                    isValidCol = false;
                    break; // Fail fast
                }
            }

            if (isValidCol) {
                colCats.push(col);
            }
        }

        if (colCats.length === 3) {
            state.grid.rows = rowCats;
            state.grid.cols = colCats;
            validGridFound = true;
            console.log(`Grid generated successfully in ${attempts} attempts.`);
        }
    }

    if (!validGridFound) {
        console.error("Failed to generate a valid grid via API. Using fallback.");
        state.grid.rows = [
            { type: 'genres', value: 'Action-adventure', label: 'Action-adventure' },
            { type: 'platforms', value: 'PC', label: 'PC' },
            { type: 'years', value: '2015-2019', label: '2015-2019' }
        ];
        state.grid.cols = [
            { type: 'publishers', value: 'Sony Interactive Entertainment', label: 'Sony' },
            { type: 'genres', value: 'RPG', label: 'RPG' },
            { type: 'years', value: '2020-Present', label: '2020-Present' }
        ];
    }

    renderGridHeaders();
}

async function checkIntersection(row, col) {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 500); // 500ms timeout

        const response = await fetch(`${API_URL}/validate-intersection`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ rowCategory: row, colCategory: col }),
            signal: controller.signal
        });
        clearTimeout(timeoutId);

        const data = await response.json();
        return data.valid;
    } catch (e) {
        console.error("Validation check failed:", e);
        return false;
    }
}

function renderGridHeaders() {
    state.grid.rows.forEach((cat, i) => {
        document.getElementById(`row-${i}`).textContent = cat.label;
    });
    state.grid.cols.forEach((cat, i) => {
        document.getElementById(`col-${i}`).textContent = cat.label;
    });
}

// --- UI Interaction ---
const searchModal = document.getElementById('search-modal');
const searchInput = document.getElementById('game-search');
const resultsList = document.getElementById('search-results');
const closeBtn = document.querySelector('.close-btn');
const gridCells = document.querySelectorAll('.grid-cell');
const livesCount = document.getElementById('lives-count');
const scoreCount = document.getElementById('score-count');

gridCells.forEach(cell => {
    cell.addEventListener('click', () => {
        if (state.gameOver || cell.classList.contains('correct')) return;

        state.selectedCell = {
            row: parseInt(cell.dataset.row),
            col: parseInt(cell.dataset.col)
        };

        searchModal.classList.remove('hidden');
        searchInput.value = '';
        resultsList.innerHTML = '';
        searchInput.focus();
    });
});

closeBtn.addEventListener('click', () => {
    searchModal.classList.add('hidden');
    state.selectedCell = null;
});

let debounceTimer;
searchInput.addEventListener('input', (e) => {
    const query = e.target.value.toLowerCase();
    clearTimeout(debounceTimer);

    if (query.length < 2) {
        resultsList.innerHTML = '';
        return;
    }

    debounceTimer = setTimeout(() => {
        fetch(`${API_URL}/search`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query })
        })
            .then(res => res.json())
            .then(matches => renderResults(matches))
            .catch(err => console.error(err));
    }, 300);
});

function renderResults(matches) {
    resultsList.innerHTML = matches.map(game => `
        <li class="result-item" data-id="${game.id}">
            <span class="game-title">${game.title}</span>
            <span class="game-year">${game.year}</span>
        </li>
    `).join('');

    document.querySelectorAll('.result-item').forEach(item => {
        item.addEventListener('click', () => {
            const gameId = parseInt(item.dataset.id);
            // Fetch full details for validation
            fetch(`${API_URL}/game`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: gameId })
            })
                .then(res => res.json())
                .then(game => handleGuess(game))
                .catch(err => console.error(err));
        });
    });
}

function handleGuess(game) {
    const { row, col } = state.selectedCell;
    const rowCat = state.grid.rows[row];
    const colCat = state.grid.cols[col];

    const isRowValid = validateCategory(game, rowCat);
    const isColValid = validateCategory(game, colCat);

    const cell = document.querySelector(`.grid-cell[data-row="${row}"][data-col="${col}"]`);

    if (isRowValid && isColValid) {
        state.score++;
        state.usedGameIds.add(game.id);
        cell.classList.add('correct');
        cell.innerHTML = `<div class="cell-content">${game.title}</div>`;
        scoreCount.textContent = state.score;

        if (state.score === 9) {
            endGame(true);
        }
    } else {
        state.lives--;
        livesCount.textContent = state.lives;
        cell.classList.add('wrong');
        setTimeout(() => cell.classList.remove('wrong'), 500);

        if (state.lives <= 0) {
            endGame(false);
        }
    }

    searchModal.classList.add('hidden');
    state.selectedCell = null;
}

function validateCategory(game, category) {
    // Validation logic must match the data structure returned by /api/game
    switch (category.type) {
        case 'developers':
            return game.developers.includes(category.value);
        case 'publishers':
            return game.publishers.includes(category.value);
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

function endGame(win) {
    state.gameOver = true;
    const modal = document.getElementById('game-over-modal');
    const title = document.getElementById('game-over-title');
    const msg = document.getElementById('game-over-message');
    const score = document.getElementById('final-score-value');

    modal.classList.remove('hidden');
    score.textContent = state.score;

    if (win) {
        title.textContent = "Victory!";
        msg.textContent = "You filled the grid!";
    } else {
        title.textContent = "Game Over";
        msg.textContent = "You ran out of lives.";
    }
}

// Initialize
console.log("Calling generateGrid...");
generateGrid().catch(e => console.error("generateGrid failed:", e));
