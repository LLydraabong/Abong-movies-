// api.js
function parseGenres(genre) {
  if (Array.isArray(genre)) return genre.map(g => g.toLowerCase());
  return genre.toLowerCase().split(',').map(g => g.trim());
}

function isValidVideoUrl(url) {
  if (!url) return false;
  return (
    url.match(/^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be|vimeo\.com)/i) ||
    url.match(/\.(mp4|m3u8)$/i)
  );
}

async function fetchJsonFile(filePath) {
  try {
    const response = await fetch(filePath);
    if (!response.ok) throw new Error(`Failed to load ${filePath}`);
    return await response.json();
  } catch (error) {
    console.error(`Error loading ${filePath}:`, error);
    return [];
  }
}

export async function getMovies() {
  try {
    const [movies, series] = await Promise.all([
      fetchJsonFile('./movie.json'),
      fetchJsonFile('./series.json')
    ]);

    const combinedData = [
      ...(Array.isArray(movies) ? movies : movies.series_list || []),
      ...(Array.isArray(series) ? series : series.series_list || [])
    ].map(item => ({
      ...item,
      type: item.type || (movies.includes(item) ? 'movie' : 'series')
    }));

    const validItems = combinedData.filter(item => isValidVideoUrl(item.video));
    console.log('Loaded movies and series:', validItems);
    return validItems;
  } catch (error) {
    console.error('Error loading movies and series:', error);
    return [];
  }
}

export async function searchMovies(query) {
  const lowered = query.toLowerCase();
  const items = await getMovies();
  if (!query) return items;

  try {
    return items.filter(item => {
      const genres = parseGenres(item.genre || '');
      return (
        item.title.toLowerCase().includes(lowered) ||
        genres.some(g => g.includes(lowered)) ||
        item.type.toLowerCase().includes(lowered)
      );
    });
  } catch (error) {
    console.error('Error in searchMovies:', error);
    return [];
  }
}

export async function filterByGenre(genre) {
  const lowered = genre.toLowerCase();
  const items = await getMovies();
  if (!genre) return items;

  try {
    return items.filter(item => {
      const genres = parseGenres(item.genre || '');
      return genres.includes(lowered);
    });
  } catch (error) {
    console.error('Error in filterByGenre:', error);
    return [];
  }
}

export async function getGenres() {
  const items = await getMovies();
  const genres = new Set();

  items.forEach(item => {
    const parsedGenres = parseGenres(item.genre || '');
    parsedGenres.forEach(g => genres.add(g));
  });

  const genreArray = [...genres].sort();
  console.log('Genres:', genreArray);
  return genreArray;
}

export async function getRandomMovie() {
  try {
    const response = await fetch('https://yts.mx/api/v2/list_movies.json?limit=50');
    if (!response.ok) throw new Error('Failed to fetch YTS API');
    const data = await response.json();
    const movies = data.data?.movies || [];
    const movie = movies[Math.floor(Math.random() * movies.length)] || null;
    if (movie) {
      return {
        id: movie.id,
        title: movie.title,
        genre: movie.genres || 'Unknown',
        video: movie.yt_trailer_code ? `https://www.youtube.com/watch?v=${movie.yt_trailer_code}` : '',
        thumbnail: movie.medium_cover_image || '',
        description: movie.summary || 'No description available.',
        year: movie.year || 'N/A',
        rating: movie.rating || 'N/A',
        poster: movie.medium_cover_image || '',
        type: 'movie'
      };
    }
    console.log('Random movie:', movie);
    return movie;
  } catch (error) {
    console.error('Error fetching random movie:', error);
    return null;
  }
}