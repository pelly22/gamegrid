# Daily Video Game Grid (VGG)

A daily browser-based trivia game where users fill a 3x3 grid by guessing video games that match intersecting criteria.

## Features
- **Daily Puzzle**: A new 3x3 grid generated every day.
- **PokeDoku Style**: Clean, dark UI with pill headers.
- **Cover Art**: Correct guesses reveal the game's cover.
- **Persistence**: Progress is saved automatically.

## Setup

1.  Install dependencies:
    ```bash
    pip install -r backend/requirements.txt
    cd frontend && npm install
    ```

2.  Run the app:
    ```bash
    cd frontend && npm run dev
    ```

## Deployment
This project is configured for deployment on Vercel with GitHub Actions for daily automation.
