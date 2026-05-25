// Application State
const state = {
    currentQuote: null,
    history: []
};

// DOM Elements
const quoteCard = document.getElementById('quote-card');
const quoteText = document.getElementById('quote-text');
const quoteAuthor = document.getElementById('quote-author');
const quoteStatus = document.getElementById('quote-status');

const generateBtn = document.getElementById('generate-btn');
const btnLoader = document.getElementById('btn-loader');

const favBtn = document.getElementById('fav-btn');
const copyBtn = document.getElementById('copy-btn');
const shareBtn = document.getElementById('share-btn');

const toggleHistoryBtn = document.getElementById('toggle-history-btn');
const closeHistoryBtn = document.getElementById('close-history-btn');
const clearHistoryBtn = document.getElementById('clear-history-btn');
const historySidebar = document.getElementById('history-sidebar');
const historyList = document.getElementById('history-list');
const emptyHistory = document.getElementById('empty-history');
const historyCount = document.getElementById('history-count');
const toastContainer = document.getElementById('toast-container');

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
    // Setup event listeners
    generateBtn.addEventListener('click', fetchNewQuote);
    favBtn.addEventListener('click', toggleFavorite);
    copyBtn.addEventListener('click', copyToClipboard);
    shareBtn.addEventListener('click', shareOnTwitter);
    
    toggleHistoryBtn.addEventListener('click', openSidebar);
    closeHistoryBtn.addEventListener('click', closeSidebar);
    clearHistoryBtn.addEventListener('click', clearAllHistory);
    
    // Close sidebar when clicking outside on mobile
    document.addEventListener('click', (e) => {
        if (window.innerWidth <= 900 && 
            historySidebar.classList.contains('open') && 
            !historySidebar.contains(e.target) && 
            !toggleHistoryBtn.contains(e.target)) {
            closeSidebar();
        }
    });

    // Load initial history
    fetchHistory();
});

// Toast notifications
function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    // Add symbol based on type
    const symbol = type === 'success' ? '✓' : 'ℹ';
    toast.innerHTML = `<span>${symbol}</span> ${message}`;
    
    toastContainer.appendChild(toast);
    
    // Remove toast after animation completes
    toast.addEventListener('animationend', () => {
        toast.remove();
    });
}

// Loading indicator controller
function setLoading(isLoading) {
    if (isLoading) {
        generateBtn.disabled = true;
        generateBtn.classList.add('loading');
        quoteText.classList.add('loading');
        quoteAuthor.classList.add('loading');
        
        // Add subtle scale animation to card while loading
        quoteCard.style.transform = 'scale(0.98)';
        quoteCard.style.opacity = '0.8';
    } else {
        generateBtn.disabled = false;
        generateBtn.classList.remove('loading');
        quoteText.classList.remove('loading');
        quoteAuthor.classList.remove('loading');
        
        quoteCard.style.transform = 'none';
        quoteCard.style.opacity = '1';
    }
}

// Open / Close History Sidebar
function openSidebar() {
    historySidebar.classList.add('open');
}

function closeSidebar() {
    historySidebar.classList.remove('open');
}

// Update primary Quote Card display
function updateQuoteDisplay(quote) {
    if (!quote) return;
    
    // Add a quick fade transition
    quoteText.style.opacity = 0;
    quoteAuthor.style.opacity = 0;
    
    setTimeout(() => {
        quoteText.innerText = quote.quote_text;
        quoteAuthor.innerText = `— ${quote.author}`;
        
        // Categorize based on content length or simple keywords as visual fluff
        const wordCount = quote.quote_text.split(' ').length;
        if (quote.quote_text.toLowerCase().includes('success') || quote.quote_text.toLowerCase().includes('limit')) {
            quoteStatus.innerText = 'Motivation';
        } else if (wordCount > 15) {
            quoteStatus.innerText = 'Deep Reflection';
        } else {
            quoteStatus.innerText = 'Wisdom';
        }
        
        // Enable buttons
        favBtn.disabled = false;
        copyBtn.disabled = false;
        shareBtn.disabled = false;
        
        // Update favorite button active state
        if (quote.is_favorite) {
            favBtn.classList.add('favorited');
            favBtn.title = "Remove from Favorites";
        } else {
            favBtn.classList.remove('favorited');
            favBtn.title = "Add to Favorites";
        }
        
        // Fade back in
        quoteText.style.opacity = 1;
        quoteAuthor.style.opacity = 1;
    }, 200);
}

// Render dynamic history sidebar
function renderHistory() {
    // Clear list, keeping only empty block if needed
    const items = historyList.querySelectorAll('.history-item');
    items.forEach(item => item.remove());
    
    // Update badge counter
    historyCount.innerText = state.history.length;
    
    if (state.history.length === 0) {
        emptyHistory.style.display = 'flex';
        clearHistoryBtn.style.opacity = '0.5';
        clearHistoryBtn.disabled = true;
        return;
    }
    
    emptyHistory.style.display = 'none';
    clearHistoryBtn.style.opacity = '1';
    clearHistoryBtn.disabled = false;
    
    state.history.forEach(quote => {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'history-item';
        // Add active highlighting if it's the currently viewed quote
        if (state.currentQuote && state.currentQuote.id === quote.id) {
            itemDiv.style.borderColor = 'var(--accent-pink)';
            itemDiv.style.background = 'rgba(217, 70, 239, 0.05)';
        }
        
        // Truncate text for UI cleanliness
        const displayQuoteText = quote.quote_text.length > 80 
            ? quote.quote_text.substring(0, 80) + '...' 
            : quote.quote_text;

        itemDiv.innerHTML = `
            <div class="history-text">“${displayQuoteText}”</div>
            <div class="history-meta">
                <span class="history-author">— ${quote.author}</span>
                <div class="history-controls">
                    <button class="history-item-btn btn-fav ${quote.is_favorite ? 'active' : ''}" title="Favorite Quote">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
                    </button>
                    <button class="history-item-btn btn-del" title="Delete Quote">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                    </button>
                </div>
            </div>
        `;
        
        // Listeners for history actions
        itemDiv.addEventListener('click', (e) => {
            // Check if clicking buttons inside the item
            if (!e.target.closest('.history-item-btn')) {
                state.currentQuote = quote;
                updateQuoteDisplay(quote);
                renderHistory(); // Refresh to update borders
                
                // On mobile, auto-close sidebar when selecting a quote
                if (window.innerWidth <= 900) {
                    closeSidebar();
                }
            }
        });
        
        const favItemBtn = itemDiv.querySelector('.btn-fav');
        favItemBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleHistoryItemFavorite(quote.id);
        });
        
        const delItemBtn = itemDiv.querySelector('.btn-del');
        delItemBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            deleteHistoryItem(quote.id);
        });
        
        historyList.appendChild(itemDiv);
    });
}

// Fetch a brand new quote
async function fetchNewQuote() {
    setLoading(true);
    try {
        const response = await fetch('/api/quote');
        if (!response.ok) throw new Error("Server error fetching quote");
        
        const quote = await response.json();
        
        state.currentQuote = quote;
        // Prepends to history state
        state.history.unshift(quote);
        
        updateQuoteDisplay(quote);
        renderHistory();
        showToast("New wisdom received!");
    } catch (error) {
        console.error(error);
        showToast("Failed to fetch quote. Try again.", "error");
    } finally {
        setLoading(false);
    }
}

// Load quotes history list from DB
async function fetchHistory() {
    try {
        const response = await fetch('/api/history');
        if (!response.ok) throw new Error("Could not retrieve history");
        
        const data = await response.json();
        state.history = data;
        
        // Render history log
        renderHistory();
        
        // On page load, if history exists, populate main card with the latest quote
        if (state.history.length > 0) {
            state.currentQuote = state.history[0];
            updateQuoteDisplay(state.currentQuote);
            renderHistory(); // refresh selection border
        }
    } catch (error) {
        console.error("History fetch error:", error);
        showToast("Could not load history.", "error");
    }
}

// Toggle Favorite on Main Card
async function toggleFavorite() {
    if (!state.currentQuote) return;
    const id = state.currentQuote.id;
    
    try {
        const response = await fetch(`/api/favorite/${id}`, { method: 'POST' });
        if (!response.ok) throw new Error("Failed to toggle favorite");
        
        const data = await response.json();
        
        // Sync main state
        state.currentQuote.is_favorite = data.is_favorite;
        
        // Sync history list
        const historyIndex = state.history.findIndex(q => q.id === id);
        if (historyIndex !== -1) {
            state.history[historyIndex].is_favorite = data.is_favorite;
        }
        
        // Refresh displays
        updateQuoteDisplay(state.currentQuote);
        renderHistory();
        
        if (data.is_favorite) {
            showToast("Added to Favorites!");
        } else {
            showToast("Removed from Favorites.");
        }
    } catch (error) {
        console.error(error);
        showToast("Error updating favorite status.", "error");
    }
}

// Toggle Favorite on specific History item
async function toggleHistoryItemFavorite(id) {
    try {
        const response = await fetch(`/api/favorite/${id}`, { method: 'POST' });
        if (!response.ok) throw new Error("Failed to toggle favorite");
        
        const data = await response.json();
        
        // Sync history state
        const historyIndex = state.history.findIndex(q => q.id === id);
        if (historyIndex !== -1) {
            state.history[historyIndex].is_favorite = data.is_favorite;
        }
        
        // If current quote is the toggled one, sync main view
        if (state.currentQuote && state.currentQuote.id === id) {
            state.currentQuote.is_favorite = data.is_favorite;
            updateQuoteDisplay(state.currentQuote);
        }
        
        renderHistory();
        
        if (data.is_favorite) {
            showToast("Saved to favorites!");
        } else {
            showToast("Removed from favorites.");
        }
    } catch (error) {
        console.error(error);
        showToast("Error updating favorite.", "error");
    }
}

// Delete specific History item
async function deleteHistoryItem(id) {
    try {
        const response = await fetch(`/api/quote/${id}`, { method: 'DELETE' });
        if (!response.ok) throw new Error("Deletion failed");
        
        // Filter history
        state.history = state.history.filter(q => q.id !== id);
        
        // If deleted quote is the one shown in main card, keep it visible but disable favorite
        if (state.currentQuote && state.currentQuote.id === id) {
            state.currentQuote.id = -1; // Detach from database id
            state.currentQuote.is_favorite = 0;
            updateQuoteDisplay(state.currentQuote);
            // Disable favorite button as it's no longer in database history
            favBtn.disabled = true;
            favBtn.classList.remove('favorited');
        }
        
        renderHistory();
        showToast("Quote deleted from history.");
    } catch (error) {
        console.error(error);
        showToast("Could not delete quote.", "error");
    }
}

// Clear all history
async function clearAllHistory() {
    if (!confirm("Are you sure you want to delete your entire quote history? This cannot be undone.")) {
        return;
    }
    
    try {
        const response = await fetch('/api/history', { method: 'DELETE' });
        if (!response.ok) throw new Error("Failed to clear database");
        
        state.history = [];
        
        // Reset current quote details if they exist in DB
        if (state.currentQuote) {
            state.currentQuote.id = -1;
            state.currentQuote.is_favorite = 0;
            updateQuoteDisplay(state.currentQuote);
            favBtn.disabled = true;
            favBtn.classList.remove('favorited');
        }
        
        renderHistory();
        showToast("History cleared successfully!");
    } catch (error) {
        console.error(error);
        showToast("Failed to clear history.", "error");
    }
}

// Copy current quote text to clipboard
function copyToClipboard() {
    if (!state.currentQuote) return;
    
    const textToCopy = `"${state.currentQuote.quote_text}" — ${state.currentQuote.author}`;
    
    navigator.clipboard.writeText(textToCopy)
        .then(() => {
            showToast("Copied to clipboard!");
        })
        .catch(err => {
            console.error("Clipboard copy error:", err);
            showToast("Failed to copy quote.", "error");
        });
}

// Share current quote on Twitter
function shareOnTwitter() {
    if (!state.currentQuote) return;
    
    const text = `"${state.currentQuote.quote_text}" — ${state.currentQuote.author}`;
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank', 'width=600,height=400');
}
