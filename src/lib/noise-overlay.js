/**
 * Voile de transition : un quad plein écran en WebGL brut dont le fragment
 * shader dissout une couleur unie selon un bruit de valeur.
 * uProgress 1.5 = transparent, -0.75 = couvert.
 * Sans Three.js : un seul plan et un seul shader, l'API native suffit.
 */
const VERTEX = `
attribute vec2 position;
varying vec2 vUv;
void main() {
  vUv = position * 0.5 + 0.5;
  gl_Position = vec4(position, 0.0, 1.0);
}`;

// Bruit : https://gist.github.com/patriciogonzalezvivo/670c22f3966e662d2f83
const FRAGMENT = `
precision mediump float;
varying vec2 vUv;
uniform float uProgress;
uniform vec3 uColor;

float rand(vec2 n) {
  return fract(sin(dot(n, vec2(12.9898, 4.1414))) * 43758.5453);
}

float noise(vec2 p) {
  vec2 ip = floor(p);
  vec2 u = fract(p);
  u = u * u * (3.0 - 2.0 * u);
  float res = mix(
    mix(rand(ip), rand(ip + vec2(1.0, 0.0)), u.x),
    mix(rand(ip + vec2(0.0, 1.0)), rand(ip + vec2(1.0, 1.0)), u.x),
    u.y);
  return res * res;
}

void main() {
  float n = noise(vUv * 5.0);
  float edge = 0.185;
  float dissolve = smoothstep(1.0 - uProgress - edge, 1.0 - uProgress + edge, n);
  float alpha = 1.0 - dissolve;
  gl_FragColor = vec4(uColor, alpha);
}`;

export const HIDDEN = 1.5;
export const COVERED = -0.75;

function compile(gl, type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    throw new Error(gl.getShaderInfoLog(shader) || "shader");
  }
  return shader;
}

/** Couleur CSS (hex ou rgb) → composantes 0..1 */
function parseColor(value) {
  const v = value.trim();
  const hex = v.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (hex) {
    const h =
      hex[1].length === 3 ? [...hex[1]].map((c) => c + c).join("") : hex[1];
    return [0, 2, 4].map((i) => Number.parseInt(h.slice(i, i + 2), 16) / 255);
  }
  const rgb = v.match(/rgba?\(([^)]+)\)/);
  if (rgb)
    return rgb[1]
      .split(",")
      .slice(0, 3)
      .map((c) => Number.parseFloat(c) / 255);
  return [0, 0, 0];
}

/**
 * Crée le voile sur un <canvas>. Rend null si WebGL n'est pas disponible.
 * @returns {{ progress: number, draw(): void, resize(): void, dispose(): void } | null}
 */
export function createNoiseOverlay(canvas, color) {
  const gl = canvas.getContext("webgl", {
    alpha: true,
    antialias: true,
    premultipliedAlpha: false,
  });
  if (!gl) return null;

  let program;
  try {
    program = gl.createProgram();
    gl.attachShader(program, compile(gl, gl.VERTEX_SHADER, VERTEX));
    gl.attachShader(program, compile(gl, gl.FRAGMENT_SHADER, FRAGMENT));
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS))
      throw new Error("link");
  } catch {
    return null;
  }
  // biome-ignore lint/correctness/useHookAtTopLevel: API WebGL, pas un hook React
  gl.useProgram(program);

  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
    gl.STATIC_DRAW,
  );
  const position = gl.getAttribLocation(program, "position");
  gl.enableVertexAttribArray(position);
  gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);

  const uProgress = gl.getUniformLocation(program, "uProgress");
  const uColor = gl.getUniformLocation(program, "uColor");
  gl.uniform3fv(uColor, parseColor(color));

  const overlay = {
    progress: HIDDEN,
    resize() {
      // Comme la référence : pixel ratio plafonné à 1.
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      gl.viewport(0, 0, canvas.width, canvas.height);
    },
    draw() {
      gl.uniform1f(uProgress, overlay.progress);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    },
    // Le contexte n'est pas perdu volontairement (WEBGL_lose_context) : le
    // canvas survit au démontage (Strict Mode, Fast Refresh) et un contexte
    // perdu ne peut pas être réutilisé, la transition disparaîtrait.
    dispose() {
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
    },
  };
  overlay.resize();
  overlay.draw();
  return overlay;
}
