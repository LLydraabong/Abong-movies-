import { filterByGenre, searchMovies } from './api.js';
import { sanitizeInput, debounce } from './utility.js';
import { displayMovies } from './main.js';

// DOM Elements
const watchArea = document.getElementById('watch-area');
const homeLayout = document.getElementById('home-layout');
const watchTitle = document.getElementById('watch-title');
const watchCanvas = document.getElementById('watch-canvas');
const watchVideo = document.getElementById('watch-video');
const watchDescription = document.getElementById('watch-description');
const watchGenre = document.getElementById('watch-genre');
const watchYear = document.getElementById('watch-year');
const watchRating = document.getElementById('watch-rating');
const relatedMovies = document.getElementById('related-movies');
const watchBackBtn = document.getElementById('watch-back-btn');
const watchSearchInput = document.getElementById('watch-search-input');
const watchPlayerContainer = document.querySelector('.watch-player-container'); // Fixed reference
const overlayTitle = document.querySelector('.overlay-title');
const overlayMovieTitle = document.getElementById('overlay-movie-title');
const watchCaptions = document.getElementById('watch-captions');

const ctx = watchCanvas.getContext('2d');

// SVG Icons as Data URLs
const playSVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white"><path d="M8 5v14l11-7z"/></svg>`;
const pauseSVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>`;
const volumeHighSVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>`;
const volumeMuteSVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white"><path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9-3.73-3.73zM12 4L9.91 6.09 12 8.18V4z"/></svg>`;
const fullscreenSVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white"><path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/></svg>`;
const exitFullscreenSVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white"><path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm1-8V5h-2v5h5V8h-3z"/></svg>`;
const ccSVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white"><path d="M19 4H5c-1.11 0-2 .9-2 2v12c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.89-2-2-2zm0 14H5V6h14v12zm-7-7h-2v2H7v-2H5v-2h2V9h3v2h2v2z"/></svg>`;

const icons = {
  play: new Image(),
  pause: new Image(),
  volumeHigh: new Image(),
  volumeMute: new Image(),
  fullscreen: new Image(),
  exitFullscreen: new Image(),
  cc: new Image()
};
icons.play.src = 'data:image/svg+xml,' + encodeURIComponent(playSVG);
icons.pause.src = 'data:image/svg+xml,' + encodeURIComponent(pauseSVG);
icons.volumeHigh.src = 'data:image/svg+xml,' + encodeURIComponent(volumeHighSVG);
icons.volumeMute.src = 'data:image/svg+xml,' + encodeURIComponent(volumeMuteSVG);
icons.fullscreen.src = 'data:image/svg+xml,' + encodeURIComponent(fullscreenSVG);
icons.exitFullscreen.src = 'data:image/svg+xml,' + encodeURIComponent(exitFullscreenSVG);
icons.cc.src = 'data:image/svg+xml,' + encodeURIComponent(ccSVG);

// State variables
let currentMovie = null;
let isPlaying = false;
let isMuted = false;
let brightness = 1;
let captionsEnabled = false;
let animationFrameId = null;
let controlsTimeout = null;

function formatTime(seconds) {
  if (isNaN(seconds)) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60).toString().padStart(2, '0');
  return `${mins}:${secs}`;
}

export function openWatchArea(movie) {
  currentMovie = movie;

  watchTitle.textContent = sanitizeInput(movie.title ?? 'Unknown Title');
  watchDescription.textContent = sanitizeInput(movie.description || movie.description_full || movie.summary || 'No description available.');
  watchGenre.textContent = Array.isArray(movie.genre) ? movie.genre.join(', ') : movie.genre || 'N/A';
  watchYear.textContent = movie.year || 'N/A';
  watchRating.textContent = movie.rating || 'N/A';

  overlayMovieTitle.textContent = sanitizeInput(movie.title ?? 'Unknown Title');
  overlayTitle.classList.remove('hidden');

  loadRelatedMovies(Array.isArray(movie.genre) ? movie.genre[0] : movie.genre || '');

  homeLayout.classList.add('hidden');
  watchArea.classList.remove('hidden');
  document.getElementById('bg-canvas').classList.add('hidden');

  setupPlayer(movie);
  setupControls();
  resizeCanvas();
  animationFrameId = requestAnimationFrame(draw);
}

export function closeWatchArea() {
  if (animationFrameId) cancelAnimationFrame(animationFrameId);
  if (watchVideo.paused) watchVideo.pause();
  watchVideo.src = '';
  watchArea.classList.add('hidden');
  homeLayout.classList.remove('hidden');
  document.getElementById('bg-canvas').classList.remove('hidden');
  overlayTitle.classList.add('hidden');
  resetControls();
}

function resetControls() {
  brightness = 1;
  isPlaying = false;
  isMuted = false;
  captionsEnabled = false;
  watchCaptions.classList.add('hidden');
  watchCanvas.style.filter = `brightness(1)`;
}

async function loadRelatedMovies(genre) {
  relatedMovies.innerHTML = '';
  if (!genre) return;

  try {
    const related = await filterByGenre(genre.toLowerCase());
    related.slice(0, 6).forEach((rel) => {
      if (rel.id !== currentMovie.id) {
        const card = document.createElement('div');
        card.className = 'movie-card';
        card.innerHTML = `
          <img class="movie-poster" src="${rel.thumbnail || rel.medium_cover_image || rel.small_cover_image || 'https://via.placeholder.com/150?text=No+Poster'}" alt="${sanitizeInput(rel.title)}">
          <div class="movie-info">
            <div class="movie-title">${sanitizeInput(rel.title)}</div>
          </div>
        `;
        card.addEventListener('click', () => openWatchArea(rel));
        relatedMovies.appendChild(card);
      }
    });
  } catch (error) {
    console.error('Failed to load related movies:', error);
  }
}

function setupPlayer(movie) {
  const videoUrl = movie.video || '';
  if (!videoUrl || !/\.(mp4|m3u8)$/i.test(videoUrl)) {
    fallbackNoVideo();
    return;
  }

  watchVideo.src = videoUrl;
  watchVideo.poster = movie.thumbnail || movie.medium_cover_image || movie.small_cover_image || 'https://via.placeholder.com/1280x720?text=No+Image';
  if (movie.subtitles) {
    const track = document.createElement('track');
    track.kind = 'subtitles';
    track.label = 'English';
    track.srclang = 'en';
    track.src = movie.subtitles;
    track.default = true;
    watchVideo.appendChild(track);
  }

  watchVideo.addEventListener('loadedmetadata', () => {
    resizeCanvas();
    draw();
  });

  watchVideo.addEventListener('timeupdate', draw);
  watchVideo.addEventListener('play', () => { isPlaying = true; draw(); });
  watchVideo.addEventListener('pause', () => { isPlaying = false; draw(); });
  watchVideo.addEventListener('volumechange', draw);

  watchVideo.play().catch(() => fallbackNoVideo());
}

function fallbackNoVideo() {
  watchCanvas.style.display = 'none';
  watchPlayerContainer.innerHTML = '<p style="color: white; text-align: center;">No video available.</p>';
  overlayTitle.classList.add('hidden');
  if (animationFrameId) cancelAnimationFrame(animationFrameId);
}

function resizeCanvas() {
  watchCanvas.width = watchPlayerContainer.clientWidth;
  watchCanvas.height = watchPlayerContainer.clientHeight;
}

function draw() {
  const width = watchCanvas.width;
  const height = watchCanvas.height;
  ctx.clearRect(0, 0, width, height);

  if (watchVideo.readyState >= watchVideo.HAVE_CURRENT_DATA) {
    ctx.drawImage(watchVideo, 0, 0, width, height);
  } else {
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, width, height);
  }

  // Overlay title when paused
  if (watchVideo.paused) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, width, height);
    ctx.font = 'bold 40px serif';
    ctx.fillStyle = 'gold';
    ctx.textAlign = 'center';
    ctx.fillText('ABONG CINEMA', width / 2, height / 2 - 40);
    ctx.font = 'bold 60px serif';
    ctx.fillText(currentMovie?.title || 'Loading...', width / 2, height / 2 + 40);
  }

  // Control bar
  const barHeight = 50;
  ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
  ctx.fillRect(0, height - barHeight, width, barHeight);

  const iconSize = 30;
  const padding = 15;
  let x = padding;

  // Play/Pause Button
  ctx.drawImage(isPlaying ? icons.pause : icons.play, x, height - barHeight + (barHeight - iconSize) / 2, iconSize, iconSize);
  x += iconSize + padding;

  // Volume Button
  ctx.drawImage(isMuted || watchVideo.volume === 0 ? icons.volumeMute : icons.volumeHigh, x, height - barHeight + (barHeight - iconSize) / 2, iconSize, iconSize);
  x += iconSize + padding;

  // Time Display
  const currentTime = formatTime(watchVideo.currentTime);
  const duration = formatTime(watchVideo.duration || 0);
  ctx.font = '16px Arial';
  ctx.fillStyle = 'white';
  ctx.textAlign = 'left';
  ctx.fillText(`${currentTime} / ${duration}`, x, height - barHeight + (barHeight + 16) / 2);
  x += 100 + padding;

  // Progress Bar
  const progressWidth = width - x - (padding * 5 + iconSize * 3);
  const progressY = height - barHeight + (barHeight - 6) / 2;
  ctx.fillStyle = 'gray';
  ctx.fillRect(x, progressY, progressWidth, 6);
  if (!isNaN(watchVideo.duration)) {
    const progress = (watchVideo.currentTime / watchVideo.duration) * progressWidth;
    ctx.fillStyle = '#ff4141';
    ctx.fillRect(x, progressY, progress, 6);
  }
  x += progressWidth + padding;

  // Captions Button
  ctx.drawImage(icons.cc, x, height - barHeight + (barHeight - iconSize) / 2, iconSize, iconSize);
  x += iconSize + padding;

  // Fullscreen Button
  ctx.drawImage(document.fullscreenElement ? icons.exitFullscreen : icons.fullscreen, x, height - barHeight + (barHeight - iconSize) / 2, iconSize, iconSize);
}

function setupControls() {
  watchCanvas.addEventListener('click', (e) => {
    const rect = watchCanvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const barHeight = 50;

    if (my < watchCanvas.height - barHeight) {
      if (watchVideo.paused) watchVideo.play();
      else watchVideo.pause();
      return;
    }

    const iconSize = 30;
    const padding = 15;
    let x = padding;

    // Play/Pause Area
    if (mx >= x && mx <= x + iconSize) {
      if (watchVideo.paused) watchVideo.play();
      else watchVideo.pause();
    }
    x += iconSize + padding;

    // Volume Area
    if (mx >= x && mx <= x + iconSize) {
      watchVideo.muted = !watchVideo.muted;
      isMuted = watchVideo.muted;
    }
    x += iconSize + padding + 100 + padding;

    // Progress Bar Area
    const progressWidth = watchCanvas.width - x - (padding * 5 + iconSize * 3);
    if (mx >= x && mx <= x + progressWidth && !isNaN(watchVideo.duration)) {
      const seekRatio = (mx - x) / progressWidth;
      watchVideo.currentTime = seekRatio * watchVideo.duration;
    }
    x += progressWidth + padding;

    // Captions Area
    if (mx >= x && mx <= x + iconSize) {
      captionsEnabled = !captionsEnabled;
      const track = watchVideo.textTracks?.[0];
      if (track) track.mode = captionsEnabled ? 'showing' : 'hidden';
      watchCaptions.textContent = captionsEnabled ? 'Sample Caption: No real subtitles available.' : '';
      watchCaptions.classList.toggle('hidden', !captionsEnabled);
    }
    x += iconSize + padding;

    // Fullscreen Area
    if (mx >= x && mx <= x + iconSize) {
      if (document.fullscreenElement) document.exitFullscreen();
      else watchPlayerContainer.requestFullscreen();
    }
  });

  watchCanvas.addEventListener('mousemove', () => {
    clearTimeout(controlsTimeout);
    controlsTimeout = setTimeout(() => overlayTitle.classList.add('hidden'), 3000);
    overlayTitle.classList.remove('hidden');
  });

  watchPlayerContainer.addEventListener('fullscreenchange', () => draw());
}

watchBackBtn.addEventListener('click', closeWatchArea);

watchSearchInput.addEventListener('input', debounce(async () => {
  const query = sanitizeInput(watchSearchInput.value.trim());
  if (!query) return;
  const results = await searchMovies(query);
  closeWatchArea();
  displayMovies(results);
}, 500));

// Resize canvas on window resize
window.addEventListener('resize', () => {
  resizeCanvas();
  draw();
});