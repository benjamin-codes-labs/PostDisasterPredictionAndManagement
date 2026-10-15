/** Full-screen intro where the user chooses which workspace to open. */

export const MODES = Object.freeze({
  RECOGNITION: 'recognition',
  DISTRIBUTION: 'distribution',
});

/** @param {(mode: string) => void} onSelect */
export function initIntro(onSelect) {
  const overlay = document.getElementById('intro');

  const select = (mode) => {
    overlay.hidden = true;
    document.removeEventListener('keydown', onKeydown);
    onSelect(mode);
  };

  // Escape skips straight to the distribution map.
  function onKeydown(event) {
    if (event.key === 'Escape') select(MODES.DISTRIBUTION);
  }

  overlay.querySelectorAll('[data-mode]').forEach((button) => {
    button.addEventListener('click', () => select(button.dataset.mode));
  });
  document.addEventListener('keydown', onKeydown);
}
