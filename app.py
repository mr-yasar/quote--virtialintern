import os
import sqlite3
import random
from datetime import datetime
import requests
from flask import Flask, jsonify, request, send_from_directory

app = Flask(__name__, static_folder='static')
DATABASE = 'history.db'

# Fallback quotes if external API fails, is slow, or hits rate limits
FALLBACK_QUOTES = [
    {"q": "The only limit to our realization of tomorrow will be our doubts of today.", "a": "Franklin D. Roosevelt"},
    {"q": "Do not watch the clock; do what it does. Keep going.", "a": "Sam Levenson"},
    {"q": "Believe you can and you're halfway there.", "a": "Theodore Roosevelt"},
    {"q": "Act as if what you do makes a difference. It does.", "a": "William James"},
    {"q": "Success is not final, failure is not fatal: it is the courage to continue that counts.", "a": "Winston Churchill"},
    {"q": "The only way to do great work is to love what you do.", "a": "Steve Jobs"},
    {"q": "It always seems impossible until it's done.", "a": "Nelson Mandela"},
    {"q": "Start where you are. Use what you have. Do what you can.", "a": "Arthur Ashe"},
    {"q": "Don't count the days, make the days count.", "a": "Muhammad Ali"},
    {"q": "Quality means doing it right when no one is looking.", "a": "Henry Ford"},
    {"q": "You miss 100% of the shots you don't take.", "a": "Wayne Gretzky"},
    {"q": "The mind is everything. What you think you become.", "a": "Buddha"},
    {"q": "The best way to predict the future is to create it.", "a": "Peter Drucker"},
    {"q": "Happiness is not something ready-made. It comes from your own actions.", "a": "Dalai Lama"}
]

def get_db_connection():
    """Establish a connection to the SQLite database with Row factory enabled."""
    conn = sqlite3.connect(DATABASE)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    """Initialize database tables if they do not exist."""
    with get_db_connection() as conn:
        conn.execute('''
            CREATE TABLE IF NOT EXISTS quotes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                quote_text TEXT NOT NULL,
                author TEXT NOT NULL,
                fetched_at TEXT NOT NULL,
                is_favorite INTEGER DEFAULT 0
            )
        ''')
        conn.commit()

# Serve static files
@app.route('/')
def index():
    """Serve the single-page application frontend."""
    return send_from_directory(app.static_folder, 'index.html')

@app.route('/<path:path>')
def static_proxy(path):
    """Serve other static files like CSS and JS."""
    return send_from_directory(app.static_folder, path)

@app.route('/api/quote', methods=['GET'])
def get_random_quote():
    """
    Fetch a random quote from the ZenQuotes API, fall back if offline/rate-limited,
    save the quote to the SQLite database, and return it.
    """
    quote_text = None
    author = None
    
    try:
        # Request a random quote from ZenQuotes (timeout of 4 seconds)
        response = requests.get('https://zenquotes.io/api/random', timeout=4)
        if response.status_code == 200:
            data = response.json()
            if isinstance(data, list) and len(data) > 0:
                item = data[0]
                temp_q = item.get('q', '').strip()
                temp_a = item.get('a', '').strip()
                
                # ZenQuotes sends rate limiting notices inside the quote content.
                # Example: "Too many requests. Please visit zenquotes.io..."
                if "too many requests" in temp_q.lower() or temp_a.lower() == "zenquotes.io":
                    # Fallback to local list if rate-limited
                    fallback = random.choice(FALLBACK_QUOTES)
                    quote_text = fallback["q"]
                    author = fallback["a"]
                else:
                    quote_text = temp_q
                    author = temp_a
    except Exception as e:
        # Log error or print in dev console
        print(f"External API failed: {e}. Using fallback quote.")
        
    # If API fetch was unsuccessful or raised an exception, use fallback
    if not quote_text or not author:
        fallback = random.choice(FALLBACK_QUOTES)
        quote_text = fallback["q"]
        author = fallback["a"]

    fetched_at = datetime.now().isoformat()
    
    # Save the quote in history database
    try:
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "INSERT INTO quotes (quote_text, author, fetched_at) VALUES (?, ?, ?)",
                (quote_text, author, fetched_at)
            )
            conn.commit()
            quote_id = cursor.lastrowid
    except Exception as e:
        print(f"Database insertion failed: {e}")
        quote_id = -1

    return jsonify({
        "id": quote_id,
        "quote_text": quote_text,
        "author": author,
        "fetched_at": fetched_at,
        "is_favorite": 0
    })

@app.route('/api/history', methods=['GET'])
def get_history():
    """Retrieve all saved quotes from history database, sorted by fetched time descending."""
    try:
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "SELECT id, quote_text, author, fetched_at, is_favorite FROM quotes ORDER BY fetched_at DESC"
            )
            rows = cursor.fetchall()
            history = [dict(row) for row in rows]
            return jsonify(history)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/favorite/<int:quote_id>', methods=['POST'])
def toggle_favorite(quote_id):
    """Toggle the favorite status of a quote in the history."""
    try:
        with get_db_connection() as conn:
            cursor = conn.cursor()
            # Find the quote first
            cursor.execute("SELECT is_favorite FROM quotes WHERE id = ?", (quote_id,))
            row = cursor.fetchone()
            if not row:
                return jsonify({"error": "Quote not found"}), 404
            
            # Toggle favorite (0 -> 1 or 1 -> 0)
            new_val = 1 - row['is_favorite']
            cursor.execute("UPDATE quotes SET is_favorite = ? WHERE id = ?", (new_val, quote_id))
            conn.commit()
            
            return jsonify({
                "success": True,
                "id": quote_id,
                "is_favorite": new_val
            })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/quote/<int:quote_id>', methods=['DELETE'])
def delete_quote(quote_id):
    """Delete a single quote from the history database."""
    try:
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT id FROM quotes WHERE id = ?", (quote_id,))
            if not cursor.fetchone():
                return jsonify({"error": "Quote not found"}), 404
            
            cursor.execute("DELETE FROM quotes WHERE id = ?", (quote_id,))
            conn.commit()
            return jsonify({"success": True, "id": quote_id})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/history', methods=['DELETE'])
def clear_history():
    """Clear all records from the history database."""
    try:
        with get_db_connection() as conn:
            conn.execute("DELETE FROM quotes")
            conn.commit()
            return jsonify({"success": True})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    # Initialize the database table
    init_db()
    
    # Run the Flask app on localhost:5000
    print("Starting Quote Generator backend on http://127.0.0.1:5000")
    app.run(host='127.0.0.1', port=5000, debug=True)
