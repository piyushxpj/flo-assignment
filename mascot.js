import artwork from './public/assets/mascot/flo-roleplay.svg?raw';
import { mascotPose } from './mascot-motion.js';

const mascot = document.querySelector('.roleplay-mascot');
const screen = document.querySelector('.roleplay-screen');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
// Trusted, bundled SVG: inline groups let the original vector parts articulate.
mascot.innerHTML = artwork;
const parts = Object.fromEntries([...mascot.querySelectorAll('[data-part]')].map(part => [part.dataset.part, part]));
let visible = false;
let frame = null;
let lastTime = null;
let elapsed = 0;

function render(time) {
  for (const [name, transform] of Object.entries(mascotPose(time))) {
    parts[name].setAttribute('transform', transform);
  }
}
function tick(now) {
  if (lastTime !== null) elapsed += now - lastTime;
  lastTime = now;
  render(elapsed);
  frame = requestAnimationFrame(tick);
}
function syncMotion() {
  const playing = visible && !document.hidden && !screen.hidden && !reducedMotion.matches;
  if (playing && frame === null) {
    lastTime = null;
    frame = requestAnimationFrame(tick);
  } else if (!playing && frame !== null) {
    cancelAnimationFrame(frame);
    frame = null;
    lastTime = null;
  }
  if (reducedMotion.matches) {
    elapsed = 0;
    render(0);
  }
}
render(0);
const observer = new IntersectionObserver(entries => {
  visible = entries[0].isIntersecting;
  syncMotion();
}, { root: document.querySelector('#content'), threshold: 0 });
observer.observe(mascot);
// The hidden attribute also catches programmatic navigation, not just hash changes.
const routeObserver = new MutationObserver(syncMotion);
routeObserver.observe(screen, { attributes: true, attributeFilter: ['hidden'] });
document.addEventListener('visibilitychange', syncMotion);
reducedMotion.addEventListener('change', syncMotion);
if (import.meta.hot) import.meta.hot.dispose(() => {
  if (frame !== null) cancelAnimationFrame(frame);
  observer.disconnect();
  routeObserver.disconnect();
  document.removeEventListener('visibilitychange', syncMotion);
  reducedMotion.removeEventListener('change', syncMotion);
});
