// A single eight-second clock drives the whole rig. Coordinates use SVG units.
export const MASCOT_MOTION = Object.freeze({
  period: 8000,
  breath: 1.6,
  lean: 1.15,
  restingTilt: 6,
  waveAngle: 18,
  blinkClose: 110,
  blinkHold: 45,
  blinkOpen: 190,
});
const TAU = Math.PI * 2;
const smooth = value => value * value * (3 - 2 * value);
const rotate = (angle, x, y) => `rotate(${angle} ${x} ${y})`;
const scaleAt = (x, y, sx, sy = sx) => `translate(${x} ${y}) scale(${sx} ${sy}) translate(${-x} ${-y})`;

function blink(t, start) {
  const { blinkClose: close, blinkHold: hold, blinkOpen: open } = MASCOT_MOTION;
  const age = t - start;
  if (age < 0 || age >= close + hold + open) return 1;
  if (age < close) return 1 - .94 * smooth(age / close);
  if (age < close + hold) return .06;
  return .06 + .94 * smooth((age - close - hold) / open);
}

function greeting(t) {
  // A short two-stroke wave with a soft envelope, followed by a long rest.
  const progress = (t - 600) / 1800;
  if (progress <= 0 || progress >= 1) return 0;
  return Math.sin(progress * Math.PI) ** 2 * Math.sin(progress * TAU * 2);
}

export function mascotPose(elapsed) {
  const m = MASCOT_MOTION;
  const t = ((elapsed % m.period) + m.period) % m.period;
  const wave = (phase = 0, cycles = 1) => Math.sin(t / m.period * TAU * cycles + phase);
  const breath = (1 - Math.cos(t / m.period * TAU * 2)) / 2;
  const pose = {
    torso: `translate(0 ${-m.breath * breath}) ${rotate(m.restingTilt + m.lean * wave(), 95, 140)}`,
    'arm-left': rotate(115 + m.waveAngle * greeting(t) + 1.2 * wave(-.3), 25, 82),
    'arm-right': rotate(-14 + 2.2 * wave(-.7), 166, 82),
    'ear-left': rotate(1.5 * wave(-.45), 47, 38),
    'ear-right': rotate(1.8 * wave(-.7), 143, 38),
    'leg-left': rotate(.45 * wave(-.15), 71, 174),
    'leg-right': rotate(.5 * wave(-.45), 120, 174),
    face: `translate(${.8 * wave(-.2)} ${.35 * wave(.3)})`,
    'eye-left': scaleAt(71.42, 74.16, 1, Math.min(blink(t, 2900), blink(t, 6500))),
    'eye-right': scaleAt(118.92, 74.16, 1, Math.min(blink(t, 2916), blink(t, 6516))),
    mouth: scaleAt(95, 106, 1, 1 + .025 * wave(-.4)),
    'bubble-main': `translate(0 ${-1.6 * wave(.4)}) ${rotate(-3 + .7 * wave(-.25), 210, 40)}`,
    'bubble-reply': `translate(0 ${-1.2 * wave(-.55)}) ${rotate(5 + .6 * wave(-.8), 222, 82)}`,
  };
  for (let i = 0; i < 3; i++) {
    pose[`dot-${i}`] = scaleAt(192 + 18 * i, 34, 1 + .08 * wave(-i * .65, 2));
  }
  return pose;
}
