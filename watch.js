/**
 * Handles video playback and UI updates for the watch area.
 */

/**
 * Swaps the home layout to the watch area UI and sets movie data.
 * @param {Object} movie - Movie object with properties: title, video, description, genre, year, rating, poster, captions, fallbackVideo
 */
export function openWatchArea(movie) {
  const elements = {
    watchSection: document.getElementById('watch-area'),
    player: document.getElementById('watch-player'),
    title: document.getElementById('watch-title'),
    description: document.getElementById('watch-description'),
    genre: document.getElementById('watch-genre'),
    year: document.getElementById('watch-year'),
    rating: document.getElementById('watch-rating'),
    captions: document.getElementById('watch-captions'),
    brightnessBtn: document.getElementById('brightness-btn'),
    fullscreenBtn: document.getElementById('fullscreen-btn'),
    homeLayout: document.getElementById('home-layout'),
    playerContainer: document.querySelector('.watch-player-container')
  };

  if (!movie || !movie.video) {
    console.error('Movie data is missing or has no video URL');
    elements.playerContainer.innerHTML = '<p>Error: No video source provided</p>';
    elements.player.poster = '';
    return;
  }

  // Update UI with movie data
  elements.title.textContent = movie.title || 'Untitled';
  elements.description.textContent = movie.description || 'No description available.';
  elements.genre.textContent = Array.isArray(movie.genre) ? movie.genre.join(', ') : movie.genre || '';
  elements.year.textContent = movie.year || 'N/A';
  elements.rating.textContent = movie.rating ?? 'N/A';

  // Clear existing tracks and set captions
  elements.player.innerHTML = ''; // Remove previous tracks
  if (movie.captions) {
    const track = document.createElement('track');
    track.kind = 'subtitles';
    track.label = 'English';
    track.srclang = 'en';
    track.src = movie.captions;
    elements.player.appendChild(track);
    elements.captions.style.display = 'block';
  } else {
    elements.captions.style.display = 'none';
  }

  // Load video (YouTube or MP4)
  loadVideo(movie.video, 'watch-player-container', movie.fallbackVideo, movie.poster);

  // Brightness control
  let brightness = 1.0;
  const updateBrightness = () => {
    brightness = Math.min(2.0, brightness + 0.2);
    elements.player.style.filter = `brightness(${brightness})`;
  };
  elements.brightnessBtn?.removeEventListener('click', updateBrightness); // Prevent duplicate listeners
  elements.brightnessBtn?.addEventListener('click', updateBrightness);

  // Fullscreen control
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      elements.watchSection.requestFullscreen().catch(err => console.error('Fullscreen failed:', err));
    } else {
      document.exitFullscreen();
    }
  };
  elements.fullscreenBtn?.removeEventListener('click', toggleFullscreen); // Prevent duplicate listeners
  elements.fullscreenBtn?.addEventListener('click', toggleFullscreen);

  // Auto-next movie on video end
  const handleVideoEnd = () => {
    const nextMovie = getNextMovie(movie); // Pass current movie to get the next one
    if (nextMovie) openWatchArea(nextMovie);
  };
  elements.player.removeEventListener('ended', handleVideoEnd); // Prevent duplicate listeners
  elements.player.addEventListener('ended', handleVideoEnd);

  // Toggle UI visibility
  elements.homeLayout?.classList.add('hidden');
  elements.watchSection.classList.remove('hidden');

  // Scroll to top
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/**
 * Closes the watch area and resets the player.
 */
export function closeWatchArea() {
  const elements = {
    watchSection: document.getElementById('watch-area'),
    player: document.getElementById('watch-player'),
    homeLayout: document.getElementById('home-layout')
  };

  elements.player.pause();
  elements.player.src = '';
  elements.player.poster = '';
  elements.player.style.filter = 'brightness(1)';
  elements.player.innerHTML = ''; // Clear tracks
  if (document.fullscreenElement) document.exitFullscreen();

  elements.watchSection.classList.add('hidden');
  elements.homeLayout?.classList.remove('hidden');
}

/**
 * Loads a video (YouTube or MP4) into a container.
 * @param {string} url - Primary video URL (YouTube or MP4).
 * @param {string} containerId - ID of the container element.
 * @param {string} [fallbackUrl] - Fallback MP4 URL if YouTube fails.
 * @param {string} [poster] - Poster image URL.
 */
export function loadVideo(url, containerId, fallbackUrl = '', poster = '') {
  const container = document.getElementById(containerId);
  if (!container) {
    console.error('Video container not found:', containerId);
    return;
  }
  container.innerHTML = ''; // Clear previous content

  const createErrorMessage = (message) => {
    container.innerHTML = `<p style="color: red;">${message}</p>`;
  };

  if (url.includes('youtube.com') || url.includes('youtu.be')) {
    let videoId = '';
    try {
      if (url.includes('youtube.com')) {
        const urlObj = new URL(url);
        videoId = urlObj.searchParams.get('v') || urlObj.pathname.split('/').pop();
      } else if (url.includes('youtu.be')) {
        videoId = url.split('youtu.be/')[1].split(/[?#]/)[0];
      }
      if (!videoId) throw new Error('Invalid YouTube URL');

      const iframe = document.createElement('iframe');
      iframe.setAttribute('width', '100%');
      iframe.setAttribute('height', '400');
      iframe.setAttribute('src', `https://www.youtube.com/embed/${videoId}?autoplay=1`);
      iframe.setAttribute('frameborder', '0');
      iframe.setAttribute('allow', 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture');
      iframe.setAttribute('allowfullscreen', '');
      iframe.onerror = () => {
        console.error('Failed to load YouTube video:', videoId);
        if (fallbackUrl) {
          loadVideo(fallbackUrl, containerId); // Try fallback
        } else {
          createErrorMessage('Error: YouTube video is restricted or unavailable.');
        }
      };
      container.appendChild(iframe);
    } catch (e) {
      console.error('Failed to parse YouTube URL:', e);
      if (fallbackUrl) {
        loadVideo(fallbackUrl, containerId); // Try fallback
      } else {
        createErrorMessage('Error: Invalid YouTube URL.');
      }
    }
  } else if (url.endsWith('.mp4')) {
    const video = document.createElement('video');
    video.setAttribute('width', '100%');
    video.setAttribute('controls', '');
    video.setAttribute('autoplay', '');
    video.setAttribute('poster', poster || '');
    const source = document.createElement('source');
    source.setAttribute('src', url);
    source.setAttribute('type', 'video/mp4');
    video.appendChild(source);
    video.onerror = () => {
      console.error('Failed to load MP4 video:', url);
      createErrorMessage('Error: MP4 video failed to load. Check the file URL.');
    };
    container.appendChild(video);
  } else {
    createErrorMessage('Unsupported video format.');
  }
}

/**
 * Placeholder for getting the next movie.
 * @param {Object} currentMovie - The current movie object.
 * @returns {Object|null} The next movie object or null.
 */
function getNextMovie(currentMovie) {
  // TODO: Implement logic to fetch the next movie from your data source
  // Example: const movies = [...]; return movies[(currentIndex + 1) % movies.length];
  console.warn('getNextMovie not implemented. Returning null.');
  return null;
}
