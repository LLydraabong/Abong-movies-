// canvasCards.js
/**
 * Sets up click events on movie cards.
 * @param {Function} onCardClick - Callback invoked with movieId string on click.
 */
export function setupCanvasCardClicks(onCardClick) {
  document.querySelectorAll('.movie-card').forEach(card => {
    card.addEventListener('click', () => {
      const movieId = card.getAttribute('data-id');
      if (movieId && typeof onCardClick === 'function') {
        onCardClick(movieId);
      } else {
        console.warn('Clicked movie card without valid data-id or callback');
      }
    });
  });
}