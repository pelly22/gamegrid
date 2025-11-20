import sqlite3
import json
import random
import datetime

DB_PATH = "games.db"
OUTPUT_FILE = "daily_puzzle.json"
SEARCH_INDEX_FILE = "search_index.json"

def get_db_connection():
    return sqlite3.connect(DB_PATH)

def get_categories():
    # In a real scenario, these would be dynamic or fetched from DB stats
    return {
        "rows": [
            {"id": "cat_ps2", "label": "PlayStation 2", "type": "platform", "value": "PlayStation 2"},
            {"id": "cat_rpg", "label": "Role-playing (RPG)", "type": "genre", "value": "Role-playing (RPG)"},
            {"id": "cat_shooter", "label": "Shooter", "type": "genre", "value": "Shooter"}
        ],
        "cols": [
            {"id": "cat_adventure", "label": "Adventure", "type": "genre", "value": "Adventure"},
            {"id": "cat_xbox", "label": "Xbox", "type": "platform", "value": "Xbox"},
            {"id": "cat_2000s", "label": "Released 2000-2009", "type": "year_range", "value": (2000, 2009)}
        ]
    }

def query_games(conn, criteria1, criteria2):
    # This is a simplified query builder. 
    # It needs to join tables based on the criteria types.
    
    base_query = "SELECT t1.game_id FROM "
    joins = []
    wheres = []
    params = []
    
    # Helper to handle criteria
    def handle_criteria(c, alias):
        if c["type"] == "genre":
            joins.append(f"game_genres {alias} ON t1.game_id = {alias}.game_id")
            wheres.append(f"{alias}.genre = ?")
            params.append(c["value"])
        elif c["type"] == "platform":
            joins.append(f"game_platforms {alias} ON t1.game_id = {alias}.game_id")
            wheres.append(f"{alias}.platform = ?")
            params.append(c["value"])
        elif c["type"] == "developer":
            joins.append(f"game_developers {alias} ON t1.game_id = {alias}.game_id")
            wheres.append(f"{alias}.developer = ?")
            params.append(c["value"])
        elif c["type"] == "year_range":
            # Year is in the main games table, so we don't need a join for it if we assume t1 is games or we join games
            # But our base query strategy assumes we are joining from a main table or intersection.
            # Let's assume t1 is the first criteria table, and we join games for year check if needed.
            pass

    # Actually, a better strategy is to select ID from games and join everything
    query = "SELECT g.id FROM games g "
    
    def add_join_and_where(c, idx):
        if c["type"] == "genre":
            query_part = f"JOIN game_genres gg{idx} ON g.id = gg{idx}.game_id "
            where_part = f"gg{idx}.genre = ?"
            return query_part, where_part, c["value"]
        elif c["type"] == "platform":
            query_part = f"JOIN game_platforms gp{idx} ON g.id = gp{idx}.game_id "
            where_part = f"gp{idx}.platform = ?"
            return query_part, where_part, c["value"]
        elif c["type"] == "developer":
            query_part = f"JOIN game_developers gd{idx} ON g.id = gd{idx}.game_id "
            where_part = f"gd{idx}.developer = ?"
            return query_part, where_part, c["value"]
        elif c["type"] == "year_range":
            start, end = c["value"]
            query_part = "" # No join needed for year
            where_part = f"g.year >= ? AND g.year <= ?"
            return query_part, where_part, (start, end)
        return "", "", None

    q1, w1, p1 = add_join_and_where(criteria1, 1)
    q2, w2, p2 = add_join_and_where(criteria2, 2)
    
    query += q1 + q2 + " WHERE " + w1 + " AND " + w2
    
    final_params = []
    if isinstance(p1, tuple): final_params.extend(p1)
    else: final_params.append(p1)
    
    if isinstance(p2, tuple): final_params.extend(p2)
    else: final_params.append(p2)
    
    # print(f"Executing: {query} with {final_params}")
    cursor = conn.cursor()
    try:
        cursor.execute(query, final_params)
        return [row[0] for row in cursor.fetchall()]
    except Exception as e:
        print(f"Query failed: {e}")
        return []

def generate_puzzle():
    conn = get_db_connection()
    cats = get_categories()
    
    # Pick 3 random rows and 3 random cols (for now just take the first 3 defined)
    selected_rows = cats["rows"][:3]
    selected_cols = cats["cols"][:3]
    
    grid_data = {
        "id": datetime.date.today().isoformat(),
        "rows": selected_rows,
        "cols": selected_cols,
        "valid_answers": {}
    }
    
    for r_idx, row in enumerate(selected_rows):
        for c_idx, col in enumerate(selected_cols):
            valid_ids = query_games(conn, row, col)
            grid_data["valid_answers"][f"{r_idx},{c_idx}"] = valid_ids
            
    with open(OUTPUT_FILE, "w") as f:
        json.dump(grid_data, f, indent=2)
    print(f"Generated {OUTPUT_FILE}")
    
    # Generate search index
    cursor = conn.cursor()
    cursor.execute("SELECT id, name, year, cover_url FROM games")
    search_index = [{"id": r[0], "n": r[1], "y": r[2], "c": r[3]} for r in cursor.fetchall()]
    with open(SEARCH_INDEX_FILE, "w") as f:
        json.dump(search_index, f)
    print(f"Generated {SEARCH_INDEX_FILE}")
    
    conn.close()

if __name__ == "__main__":
    generate_puzzle()
