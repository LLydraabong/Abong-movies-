import { getMovies, searchMovies, getGenres, filterByGenre, getRandomMovie } from './api.js';
import { formatMovieTitle, debounce, sanitizeInput } from './utility.js';
import { setupCanvasCardClicks } from './canvasCards.js';
import { openWatchArea } from './watch.js';

// DOM Elements
const movieGrid = document.getElementById('movieGrid');
const categoryList = document.getElementById('categoryList');
const genreList = document.getElementById('genre-list');
const genreBox = document.getElementById('genre-popup');
const searchInput = document.getElementById('search-input');
const heroVideo = document.getElementById('heroVideo');
const heroTitle = document.getElementById('heroTitle');
const heroTagline = document.getElementById('heroTagline');
const watchTrailerBtn = document.getElementById('watchTrailerBtn');
const closeWatchBtn = document.getElementById('close-watch');
const canvas = document.getElementById('bg-canvas');
const ctx = canvas.getContext('2d');

// Particle system
const PARTICLE_COUNT = 100;
const particles = [];

class Particle {
  constructor() {
    this.reset();
  }
  reset() {
    this.x = Math.random() * canvas.width;
    this.y = Math.random() * canvas.height;
    this.size = Math.random() * 3 + 1;
    this.speedX = Math.random() * 2 - 1;
    this.speedY = Math.random() * 2 - 1;
    this.color = `hsl(${Math.random() * 360}, 50%, 50%)`;
  }
  update() {
    this.x += this.speedX;
    this.y += this.speedY;
    if (this.size > 0.2) this.size -= 0.05;
    if (this.x < 0 || this.x > canvas.width) this.speedX *= -1;
    if (this.y < 0 || this.y > canvas.height) this.speedY *= -1;
    if (this.size <= 0.2) this.reset();
  }
  draw() {
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fill();
  }
}

function initParticles() {
  particles.length = 0;
  for (let i = 0; i < PARTICLE_COUNT; i++) particles.push(new Particle());
}

function animateParticles() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  particles.forEach(p => { p.update(); p.draw(); });
  requestAnimationFrame(animateParticles);
}

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  initParticles();
}

resizeCanvas();
animateParticles();
window.addEventListener('resize', resizeCanvas);

export function displayMovies(movies) {
  movieGrid.innerHTML = '';
  if (!Array.isArray(movies) || !movies.length) {
    movieGrid.innerHTML = '<p class="no-results">No movies found.</p>';
    return;
  }
  movies.forEach(movie => {
    const card = document.createElement('div');
    card.className = 'movie-card';
    card.dataset.id = movie.id;
    card.innerHTML = `
      <img class="movie-poster" src="${movie.thumbnail || movie.medium_cover_image || movie.small_cover_image || movie.poster || 'https://via.placeholder.com/240x360?text=No+Poster'}" alt="${sanitizeInput(movie.title)} poster" />
      <div class="movie-info">
        <div class="movie-title">${formatMovieTitle(movie.title)}</div>
        <div class="movie-meta">
          <span>${Array.isArray(movie.genre) ? movie.genre.join(', ') : movie.genre || 'N/A'}</span>
          <span>⭐ ${movie.rating ?? 'N/A'}</span>
        </div>
      </div>
    `;
    movieGrid.appendChild(card);
  });
  setupCanvasCardClicks(movieId => {
    const selectedMovie = movies.find(m => m.id == movieId);
    if (selectedMovie) openWatchArea(selectedMovie);
  });
}

async function loadGenres() {
  try {
    const genres = await getGenres();
    if (!Array.isArray(genres)) return;
    genreList.innerHTML = genres.map(genre => `<li>${sanitizeInput(genre)}</li>`).join('');
    categoryList.innerHTML = genres.map(genre => `<div class="category-item">${sanitizeInput(genre)}</div>`).join('');
    genreList.querySelectorAll('li').forEach(item => {
      item.addEventListener('click', async () => {
        const genre = item.textContent.toLowerCase();
        const filtered = await filterByGenre(genre);
        displayMovies(filtered);
        genreBox.classList.add('hidden');
      });
    });
    categoryList.querySelectorAll('.category-item').forEach(item => {
      item.addEventListener('click', async () => {
        const genre = item.textContent.toLowerCase();
        const filtered = await filterByGenre(genre);
        displayMovies(filtered);
      });
    });
  } catch (error) {
    console.error('Failed to load genres:', error);
  }
}

async function setupHeroBanner() {
  try {
    const movie = await getRandomMovie();
    if (!movie) throw new Error('No movie data');
    heroTitle.textContent = sanitizeInput(movie.title || 'Unknown Title');
    heroTagline.textContent = `${movie.year || 'N/A'} • ⭐ ${movie.rating || 'N/A'}`;
    heroVideo.poster = movie.thumbnail || movie.large_cover_image || movie.medium_cover_image || movie.poster || 'https://via.placeholder.com/1280x720?text=No+Image';
    watchTrailerBtn.onclick = () => {
      let trailerUrl = 'https://www.youtube.com';
      if (movie.yt_trailer_code) trailerUrl = `https://www.youtube.com/watch?v=${movie.yt_trailer_code}`;
      else if (movie.video) trailerUrl = movie.video;
      window.open(trailerUrl, '_blank');
    };
  } catch (error) {
    heroTitle.textContent = 'Failed to load movie';
    heroTagline.textContent = 'Try again later.';
    heroVideo.poster = 'https://via.placeholder.com/1280x720?text=No+Image';
    console.error('Hero banner error:', error);
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  await setupHeroBanner();
  try {
    const movies = await getMovies();
    if (!movies?.length) throw new Error('No movies loaded');
    displayMovies(movies);
    await loadGenres();
  } catch (error) {
    movieGrid.innerHTML = '<p class="no-results">Failed to load movies. Please try again later.</p>';
    console.error(error);
  }

  const navButtons = document.querySelectorAll('.nav-btn');
  navButtons.forEach(btn => {
    btn.addEventListener('click', async () => {
      navButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      switch (btn.id) {
        case 'home-btn':
          await setupHeroBanner();
          displayMovies(await getMovies());
          genreBox.classList.add('hidden');
          break;
        case 'genre-btn':
          genreBox.classList.toggle('hidden');
          break;
        case 'settings-btn':
          alert('Settings feature coming soon!');
          break;
        case 'store-btn':
          alert('Store feature coming soon!');
          break;
        case 'profile-btn':
          alert('Profile feature coming soon!');
          break;
      }
    });
  });

  searchInput.addEventListener('input', debounce(async () => {
    const query = sanitizeInput(searchInput.value.trim());
    if (!query) return;
    const filtered = await searchMovies(query);
    displayMovies(filtered);
    genreBox.classList.add('hidden');
  }, 500));

  closeWatchBtn.addEventListener('click', () => {
    const watch = document.getElementById('watch-area');
    if (!watch.classList.contains('hidden')) watch.classList.add('hidden');
  });

  document.getElementById('home-btn').click();
});

(function () {
  const loader = document.getElementById('abong-loader');
  const home = document.getElementById('home-layout');
  if (!loader || !home) return;

  document.body.classList.add('no-scroll');

  function hideLoader() {
    loader.classList.add('hidden');
    setTimeout(() => {
      loader.remove();
      document.body.classList.remove('no-scroll');
    }, 650);
    home.classList.remove('hidden');
  }

  const duration = 4000;
  const timer = setTimeout(hideLoader, duration);

  window.AbongLoader = {
    hide: () => { clearTimeout(timer); hideLoader(); },
    hideIn: (ms) => { clearTimeout(timer); setTimeout(hideLoader, ms); }
  };
})();