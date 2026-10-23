import { helpers, fragment, params } from './vendor/orbkit/nimbus.js';

// Orbkit's original Nimbus shader, mounted without a React application shell.
export function mountFloOrb(canvas) {
  const host = canvas.parentElement;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const gl = canvas.getContext('webgl', { alpha: true, premultipliedAlpha: true, antialias: false });
  if (!gl) return { setState() {}, setActive() {}, destroy() {} };
  let program, buffer, locations;
  let frame = 0, previous = 0, clock = 3, output = 0, input = 0;
  let active = false, visible = true, lost = false, state = 'idle';
  const values = { ...params, speed: 1.4 };
  function compile(type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source); gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      gl.deleteShader(shader); throw new Error('Orb shader unavailable');
    }
    return shader;
  }
  function initialize() {
    try {
      const vertex = compile(gl.VERTEX_SHADER, 'attribute vec2 aPos; void main(){gl_Position=vec4(aPos,0.,1.);}');
      const declarations = Object.keys(values).map(key => `uniform float uP_${key};`).join('\n');
      const pixel = compile(gl.FRAGMENT_SHADER, helpers + declarations + '\nuniform vec3 uC_light; uniform vec3 uC_shadow;\n' + fragment);
      program = gl.createProgram();
      gl.attachShader(program, vertex); gl.attachShader(program, pixel); gl.linkProgram(program);
      gl.deleteShader(vertex); gl.deleteShader(pixel);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error('Orb shader unavailable');
      gl.useProgram(program);
      buffer = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
      const position = gl.getAttribLocation(program, 'aPos');
      gl.enableVertexAttribArray(position); gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
      gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
      locations = Object.fromEntries(['uRes', 'uTime', 'uAnim', 'uInput', 'uOutput', 'uC_light', 'uC_shadow', ...Object.keys(values).map(key => `uP_${key}`)].map(key => [key, gl.getUniformLocation(program, key)]));
      // Lavender highlights and deeper violet shadows, sampled from Flo's palette.
      gl.uniform3f(locations.uC_light, 0.82, 0.70, 1);
      gl.uniform3f(locations.uC_shadow, 0.38, 0.23, 0.66);
      resize();
      host.classList.add('orb-ready');
    } catch {
      host.classList.remove('orb-ready');
      if (program) gl.deleteProgram(program);
      program = null;
    }
  }
  function resize() {
    if (!program || lost) return;
    const dpr = Math.min(devicePixelRatio || 1, 2);
    const width = Math.max(1, Math.round(canvas.clientWidth * dpr));
    const height = Math.max(1, Math.round(canvas.clientHeight * dpr));
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width; canvas.height = height;
    }
    gl.viewport(0, 0, width, height);
    gl.uniform2f(locations.uRes, width, height);
    if (active) draw(0);
  }
  function draw(delta) {
    if (!program || lost) return;
    clock += delta * values.speed;
    const blend = reduced.matches ? 1 : 1 - Math.exp(-delta * 5);
    const pulse = 0.55 + Math.sin(clock * 7) * 0.16 + Math.sin(clock * 11) * 0.1;
    output += ((state === 'speaking' ? pulse : 0.06) - output) * blend;
    input += ((state === 'listening' ? pulse * 0.6 : 0) - input) * blend;
    gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
    gl.uniform1f(locations.uTime, clock * .5); gl.uniform1f(locations.uAnim, clock);
    gl.uniform1f(locations.uInput, input); gl.uniform1f(locations.uOutput, output);
    for (const [key, value] of Object.entries(values)) gl.uniform1f(locations[`uP_${key}`], key === 'speed' ? clock : value);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }
  function tick(now) {
    frame = requestAnimationFrame(tick);
    if (previous && now - previous < 1000 / 30) return;
    const delta = previous ? Math.min((now - previous) / 1000, .1) : 1 / 30;
    previous = now; draw(delta);
  }
  function sync() {
    cancelAnimationFrame(frame); frame = 0; previous = 0;
    if (!active || !visible || document.hidden || lost || !program) return;
    if (reduced.matches) draw(0);
    else frame = requestAnimationFrame(tick);
  }
  function contextLost(event) { event.preventDefault(); lost = true; host.classList.remove('orb-ready'); sync(); }
  function contextRestored() { lost = false; initialize(); sync(); }
  canvas.addEventListener('webglcontextlost', contextLost);
  canvas.addEventListener('webglcontextrestored', contextRestored);
  const observer = new ResizeObserver(resize); observer.observe(canvas);
  const intersection = new IntersectionObserver(entries => { visible = entries[0].isIntersecting; sync(); }); intersection.observe(canvas);
  document.addEventListener('visibilitychange', sync); reduced.addEventListener('change', sync);
  initialize();
  return {
    setState(next) { state = next; if (reduced.matches && active) draw(0); },
    setActive(next) { active = next; if (next) resize(); sync(); },
    destroy() {
      active = false; sync(); observer.disconnect(); intersection.disconnect();
      document.removeEventListener('visibilitychange', sync); reduced.removeEventListener('change', sync);
      canvas.removeEventListener('webglcontextlost', contextLost); canvas.removeEventListener('webglcontextrestored', contextRestored);
      if (buffer) gl.deleteBuffer(buffer); if (program) gl.deleteProgram(program);
    },
  };
}
