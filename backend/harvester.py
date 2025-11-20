import os
import json
import sqlite3
import requests
import pandas as pd
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()

# Configuration
IGDB_CLIENT_ID = os.environ.get("IGDB_CLIENT_ID")
IGDB_CLIENT_SECRET = os.environ.get("IGDB_CLIENT_SECRET")
DB_PATH = "games.db"

def get_igdb_token():
    if not IGDB_CLIENT_ID or not IGDB_CLIENT_SECRET:
        print("Missing IGDB credentials. Using mock data.")
        return None
    
    url = "https://id.twitch.tv/oauth2/token"
    params = {
        "client_id": IGDB_CLIENT_ID,
        "client_secret": IGDB_CLIENT_SECRET,
        "grant_type": "client_credentials"
    }
    response = requests.post(url, params=params)
    if response.status_code == 200:
        return response.json()["access_token"]
    else:
        raise Exception(f"Failed to get token: {response.text}")

def fetch_games(token):
    if not token:
        return get_mock_data()

    url = "https://api.igdb.com/v4/games"
    headers = {
        "Client-ID": IGDB_CLIENT_ID,
        "Authorization": f"Bearer {token}"
    }
    
    all_games = []
    offset = 0
    limit = 500
    total_to_fetch = 10000
    
    print(f"Fetching top {total_to_fetch} games...")
    
    while len(all_games) < total_to_fetch:
        # Fields: name, first_release_date, total_rating_count, genres.name, platforms.name, involved_companies.company.name, cover.url
        body = f"""
        fields name, first_release_date, total_rating_count, genres.name, platforms.name, involved_companies.company.name, cover.url;
        where total_rating_count > 50 & version_parent = null;
        sort total_rating_count desc;
        limit {limit};
        offset {offset};
        """
        
        response = requests.post(url, headers=headers, data=body)
        if response.status_code == 200:
            data = response.json()
            if not data:
                break
            all_games.extend(data)
            offset += limit
            print(f"Fetched {len(all_games)} games...")
        else:
            raise Exception(f"Failed to fetch games: {response.text}")
            
    return all_games[:total_to_fetch]

def get_mock_data():
    print("Generating mock data...")
    return [
        {
            "id": 1,
            "name": "Mock Game 1",
            "first_release_date": 946684800, # 2000-01-01
            "total_rating_count": 100,
            "genres": [{"name": "RPG"}],
            "platforms": [{"name": "PS2"}],
            "involved_companies": [{"company": {"name": "Square Enix"}}]
        },
        {
            "id": 2,
            "name": "Mock Game 2",
            "first_release_date": 1009843200, # 2002-01-01
            "total_rating_count": 200,
            "genres": [{"name": "Action"}],
            "platforms": [{"name": "Xbox"}],
            "involved_companies": [{"company": {"name": "Bungie"}}]
        },
        {
            "id": 3,
            "name": "Mock Game 3",
            "first_release_date": 1577836800, # 2020-01-01
            "total_rating_count": 500,
            "genres": [{"name": "Adventure"}],
            "platforms": [{"name": "PC"}],
            "involved_companies": [{"company": {"name": "Indie Dev"}}]
        }
    ]

def init_db():
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("DROP TABLE IF EXISTS games")
    c.execute("DROP TABLE IF EXISTS game_genres")
    c.execute("DROP TABLE IF EXISTS game_platforms")
    c.execute("DROP TABLE IF EXISTS game_developers")
    
    c.execute('''CREATE TABLE games
                 (id INTEGER PRIMARY KEY, name TEXT, year INTEGER, rating_count INTEGER, cover_url TEXT)''')
    c.execute('''CREATE TABLE game_genres
                 (game_id INTEGER, genre TEXT)''')
    c.execute('''CREATE TABLE game_platforms
                 (game_id INTEGER, platform TEXT)''')
    c.execute('''CREATE TABLE game_developers
                 (game_id INTEGER, developer TEXT)''')
    conn.commit()
    return conn

def save_to_db(games, conn):
    c = conn.cursor()
    # Clear existing data for a fresh import
    c.execute("DELETE FROM games")
    c.execute("DELETE FROM game_genres")
    c.execute("DELETE FROM game_platforms")
    c.execute("DELETE FROM game_developers")
    
    for game in games:
        game_id = game.get("id")
        name = game.get("name")
        timestamp = game.get("first_release_date")
        year = datetime.fromtimestamp(timestamp).year if timestamp else None
        rating_count = game.get("total_rating_count", 0)
        
        cover_url = None
        if "cover" in game and "url" in game["cover"]:
            # IGDB urls are often //images... replace with https:// and resize
            url = game["cover"]["url"]
            if url.startswith("//"):
                url = "https:" + url
            # Replace thumb with cover_big for better quality
            cover_url = url.replace("t_thumb", "t_cover_big")

        c.execute("INSERT INTO games VALUES (?, ?, ?, ?, ?)", (game_id, name, year, rating_count, cover_url))
        
        if "genres" in game:
            for g in game["genres"]:
                c.execute("INSERT INTO game_genres VALUES (?, ?)", (game_id, g["name"]))
                
        if "platforms" in game:
            for p in game["platforms"]:
                c.execute("INSERT INTO game_platforms VALUES (?, ?)", (game_id, p["name"]))
                
        if "involved_companies" in game:
            for comp in game["involved_companies"]:
                # Simplification: Treat all involved companies as potential "developers" for now
                # In reality, we'd filter by 'developer': true in the API response if we requested it
                c.execute("INSERT INTO game_developers VALUES (?, ?)", (game_id, comp["company"]["name"]))
                
    conn.commit()
    print(f"Saved {len(games)} games to database.")

def main():
    token = get_igdb_token()
    games = fetch_games(token)
    conn = init_db()
    save_to_db(games, conn)
    conn.close()

if __name__ == "__main__":
    main()
