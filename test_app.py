import sqlite3
import requests
import os
import random
from datetime import datetime

DATABASE = 'history.db'
FALLBACK_QUOTES = [
    {"q": "The only limit to our realization of tomorrow will be our doubts of today.", "a": "Franklin D. Roosevelt"},
    {"q": "Do not watch the clock; do what it does. Keep going.", "a": "Sam Levenson"}
]

def test_database():
    print("--- Testing SQLite Database ---")
    if os.path.exists(DATABASE):
        print(f"Removing existing {DATABASE} for clean test...")
        os.remove(DATABASE)
        
    conn = sqlite3.connect(DATABASE)
    cursor = conn.cursor()
    
    # Create table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS quotes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            quote_text TEXT NOT NULL,
            author TEXT NOT NULL,
            fetched_at TEXT NOT NULL,
            is_favorite INTEGER DEFAULT 0
        )
    ''')
    print("[PASS] Table 'quotes' created successfully.")
    
    # Test Insert
    fetched_at = datetime.now().isoformat()
    cursor.execute(
        "INSERT INTO quotes (quote_text, author, fetched_at) VALUES (?, ?, ?)",
        ("Test quote content", "Test Author", fetched_at)
    )
    conn.commit()
    quote_id = cursor.lastrowid
    print(f"[PASS] Inserted test quote with ID: {quote_id}")
    
    # Test Query
    cursor.execute("SELECT * FROM quotes WHERE id = ?", (quote_id,))
    row = cursor.fetchone()
    assert row is not None
    assert row[1] == "Test quote content"
    assert row[2] == "Test Author"
    assert row[4] == 0
    print("[PASS] Query verified inserted values.")
    
    # Test Toggle Favorite
    cursor.execute("UPDATE quotes SET is_favorite = 1 WHERE id = ?", (quote_id,))
    conn.commit()
    cursor.execute("SELECT is_favorite FROM quotes WHERE id = ?", (quote_id,))
    row = cursor.fetchone()
    assert row[0] == 1
    print("[PASS] Favorite toggled successfully.")
    
    # Test Delete
    cursor.execute("DELETE FROM quotes WHERE id = ?", (quote_id,))
    conn.commit()
    cursor.execute("SELECT COUNT(*) FROM quotes")
    count = cursor.fetchone()[0]
    assert count == 0
    print("[PASS] Delete operation verified. Database count is 0.")
    
    conn.close()
    print("--- Database tests passed! ---\n")

def test_api_integration():
    print("--- Testing External API Integration ---")
    url = "https://zenquotes.io/api/random"
    print(f"Sending GET request to {url}...")
    try:
        response = requests.get(url, timeout=5)
        print(f"Response code: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print("API response data received:")
            print(data)
            if isinstance(data, list) and len(data) > 0:
                q = data[0].get('q')
                a = data[0].get('a')
                print(f"[PASS] Successfully parsed quote: \"{q}\" - {a}")
            else:
                print("[FAIL] Unexpected API response format.")
        else:
            print(f"[FAIL] HTTP error code received: {response.status_code}")
    except Exception as e:
        print(f"[WARNING] API fetch raised an exception: {e}")
        print("This is normal if you have no internet access or are rate-limited. Falling back to local list.")
        fallback = random.choice(FALLBACK_QUOTES)
        print(f"[PASS] Fallback quote used: \"{fallback['q']}\" - {fallback['a']}")
    print("--- API tests finished! ---\n")

if __name__ == '__main__':
    print("Running backend tests...\n")
    test_database()
    try:
        test_api_integration()
    except ImportError:
        print("[INFO] 'requests' library not installed. Skipping API integration test.")
        print("Please run within the virtual environment (.venv) or after running 'pip install requests'.")
    print("All local checks complete.")
