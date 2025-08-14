// search.js
import { debounce, sanitizeInput } from './utility.js';
import { searchMovies, getGenres } from './api.js';
import { displayMovies } from './main.js';

// DOM Elements
const searchInput = document.getElementById('search-input');
const searchBackIcon = document.querySelector('.search-back-icon');
const searchDropdown = document.querySelector('.search-dropdown');

// LocalStorage key for search history
const HISTORY_KEY = 'movieSearchHistory';

// Load search history
function loadHistory() {
  const history = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
  if (history.length) {
    searchDropdown.innerHTML = history.map(query => `
      <li data-query="${sanitizeInput(query)}">
        ${sanitizeInput(query)}
        <button class="delete-btn" aria-label="Delete ${sanitizeInput(query)} from history">×</button>
      </li>
    `).join('') + '<li class="clear-all">Clear all history</li>';
    searchDropdown.classList.remove('hidden');
  } else {
    searchDropdown.classList.add('hidden');
  }
}

// Save search query to history
function saveToHistory(query) {
  const history = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
  if (!history.includes(query)) {
    history.unshift(query);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, 10)));
  }
}

// Delete single history item
function deleteHistoryItem(query) {
  let history = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
  history = history.filter(item => item !== query);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  loadHistory();
}

// Clear all history
function clearHistory() {
  localStorage.removeItem(HISTORY_KEY);
  searchDropdown.innerHTML = '';
  searchDropdown.classList.add('hidden');
}

// Get suggestions based on movie titles and genres
async function getSuggestions(query) {
  const lowered = query.toLowerCase();
  const movieResults = await searchMovies(lowered);
  const genreResults = await getGenres();
  const matchingTitles = movieResults.map(movie => movie.title).filter(title => title.toLowerCase().includes(lowered));
  const matchingGenres = genreResults.filter(genre => genre.toLowerCase().includes(lowered));
  const suggestions = [...new Set([...matchingTitles, ...matchingGenres])];
  searchDropdown.innerHTML = suggestions.map(suggestion => `
    <li data-query="${sanitizeInput(suggestion)}">${sanitizeInput(suggestion)}</li>
  `).join('');
  searchDropdown.classList.remove('hidden');
}

// Perform internal movie search and update grid
function performSearch(query) {
  if (query.trim()) {
    saveToHistory(query);
    searchMovies(query).then(displayMovies);
    searchDropdown.classList.add('hidden');
  }
}

// Event Listeners
searchInput.addEventListener('focus', () => {
  searchInput.classList.add('active');
  searchBackIcon.classList.remove('hidden');
  if (!searchInput.value.trim()) {
    loadHistory();
  }
});

searchInput.addEventListener('input', debounce(() => {
  const query = searchInput.value.trim();
  if (query) {
    getSuggestions(query);
  } else {
    loadHistory();
  }
}, 300));

searchInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    performSearch(searchInput.value);
  }
});

searchBackIcon.addEventListener('click', () => {
  searchInput.value = '';
  searchInput.classList.remove('active');
  searchBackIcon.classList.add('hidden');
  searchDropdown.classList.add('hidden');
});

searchDropdown.addEventListener('click', (e) => {
  const li = e.target.closest('li');
  if (li && li.dataset.query) {
    searchInput.value = li.dataset.query;
    performSearch(li.dataset.query);
  } else if (e.target.classList.contains('delete-btn')) {
    const query = e.target.parentElement.dataset.query;
    deleteHistoryItem(query);
  } else if (e.target.classList.contains('clear-all')) {
    clearHistory();
  }
});

// Initialize
loadHistory();