import sqlite3

conn = sqlite3.connect("games.db")
c = conn.cursor()

# Find BG3
c.execute("SELECT id, name FROM games WHERE name LIKE '%Baldur%'")
games = c.fetchall()

for g_id, name in games:
    print(f"Game: {name} (ID: {g_id})")
    c.execute("SELECT genre FROM game_genres WHERE game_id = ?", (g_id,))
    genres = [r[0] for r in c.fetchall()]
    print(f"  Genres: {genres}")

conn.close()
