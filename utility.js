// utility.js

/**
 * Shortens movie titles to max 20 characters, appending '...' if truncated.
 * @param {string} title
 * @returns {string}
 */
export function formatMovieTitle(title) {
  return title.length > 20 ? title.slice(0, 17) + '...' : title;
}

/**
 * Returns a debounced version of the function.
 * @param {Function} func
 * @param {number} wait Delay in ms
 * @returns {Function}
 */
export function debounce(func, wait) {
  let timeout;
  return function (...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
}

/**
 * Sanitizes input by encoding HTML entities to prevent XSS.
 * @param {string} input
 * @returns {string}
 */
export function sanitizeInput(input) {
  const div = document.createElement('div');
  div.textContent = input || '';
  return div.innerHTML;
}