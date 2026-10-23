const target = document.querySelector('.sidebar-mascot');
const image = target.querySelector('img');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const hoverPointer = matchMedia('(hover: hover) and (pointer: fine)');
let motion;
let revision = 0;

// Start each movement from its current position, including interrupted hovers.
async function float(hovered) {
  const currentRevision = ++revision;
  const from = getComputedStyle(image).transform;
  motion?.cancel();
  if (reducedMotion.matches || document.hidden) return;
  const lifted = hovered && hoverPointer.matches;
  const base = lifted ? -7 : -1;
  const peak = lifted ? -10 : -2.5;
  motion = image.animate([
    { transform: from },
    { transform: `translateY(${base}px)` },
  ], { duration: 320, easing: 'cubic-bezier(.23,1,.32,1)', fill: 'forwards' });
  try { await motion.finished; } catch { return; }
  if (revision !== currentRevision) return;
  motion.cancel();
  motion = image.animate([
    { transform: `translateY(${base}px)` },
    { transform: `translateY(${peak}px)` },
    { transform: `translateY(${base}px)` },
  ], { duration: lifted ? 2800 : 3600, iterations: Infinity, easing: 'ease-in-out' });
}

target.addEventListener('pointerenter', () => float(true));
target.addEventListener('pointerleave', () => float(false));
reducedMotion.addEventListener('change', () => float(target.matches(':hover')));
document.addEventListener('visibilitychange', () => {
  if (document.hidden) { revision++; motion?.cancel(); }
  else float(target.matches(':hover'));
});
float(false);
