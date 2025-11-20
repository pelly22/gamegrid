import sqlite3

conn = sqlite3.connect("games.db")
c = conn.cursor()

print("--- PLATFORMS ---")
c.execute("SELECT DISTINCT platform FROM game_platforms LIMIT 20")
for r in c.fetchall():
    print(r[0])

print("\n--- GENRES ---")
c.execute("SELECT DISTINCT genre FROM game_genres LIMIT 20")
for r in c.fetchall():
    print(r[0])

conn.close()
