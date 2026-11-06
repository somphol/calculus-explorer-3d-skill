// Pure calculus helpers. Safe to import in Node tests (no DOM, no Three.js).

export const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
export const lerp = (a, b, t) => a + (b - a) * t;

export function formatNumber(value, digits = 2) {
  if (!Number.isFinite(value)) return "—";
  const rounded = Math.abs(value) < 0.5 * 10 ** -digits ? 0 : value;
  const text = Math.abs(rounded) >= 1000
    ? rounded.toLocaleString("en-US", { maximumFractionDigits: digits })
    : rounded.toFixed(digits);
  return text.replace(/\.0+$/, "").replace(/(\.\d*?)0+$/, "$1");
}

export function formatSigned(value, digits = 2) {
  if (!Number.isFinite(value)) return "—";
  const text = formatNumber(value, digits);
  return value > 0 ? `+${text}` : text;
}

export function derivative(f, x, h = 1e-4) {
  return (f(x + h) - f(x - h)) / (2 * h);
}

export function secondDerivative(f, x, h = 1e-3) {
  return (f(x + h) - 2 * f(x) + f(x - h)) / (h * h);
}

export function riemann(f, a, b, n, method = "left") {
  const count = Math.max(1, Math.floor(n));
  const dx = (b - a) / count;
  let value = 0;
  for (let i = 0; i < count; i += 1) {
    const left = a + i * dx;
    const right = left + dx;
    if (method === "left") value += f(left);
    else if (method === "right") value += f(right);
    else if (method === "mid") value += f((left + right) / 2);
    else if (method === "trap") value += (f(left) + f(right)) / 2;
    else value += f(left);
  }
  return value * dx;
}

// Composite Simpson with an even number of panels. Accurate enough for on-screen
// error readouts and unit tests; this is not a symbolic integrator.
export function integrate(f, a, b, panels = 2000) {
  const n = panels % 2 === 0 ? panels : panels + 1;
  const h = (b - a) / n;
  let sum = f(a) + f(b);
  for (let i = 1; i < n; i += 1) sum += f(a + i * h) * (i % 2 === 0 ? 2 : 4);
  return (h / 3) * sum;
}

export function rk4Path({ f, x0, y0, step = 0.06, steps = 260, direction = 1 }) {
  const points = [{ x: x0, y: y0 }];
  let x = x0;
  let y = y0;
  const h = step * direction;
  for (let i = 0; i < steps; i += 1) {
    const k1 = f(x, y);
    const k2 = f(x + h / 2, y + (h / 2) * k1);
    const k3 = f(x + h / 2, y + (h / 2) * k2);
    const k4 = f(x + h, y + h * k3);
    const nextY = y + (h / 6) * (k1 + 2 * k2 + 2 * k3 + k4);
    x += h;
    y = nextY;
    if (!Number.isFinite(x) || !Number.isFinite(y) || Math.abs(y) > 60 || Math.abs(x) > 60) break;
    points.push({ x, y });
  }
  return points;
}

// Accepts plain decimals, fractions, and simple multiples/divisions of π so
// free-response answers can be typed as 24π or 32/5 as well as 75.40.
export function parseNumericAnswer(text) {
  if (typeof text === "number") return Number.isFinite(text) ? text : null;
  if (typeof text !== "string") return null;
  const normalized = text.trim().toLowerCase().replace(/π/g, "pi").replace(/\s+/g, "");
  if (!normalized) return null;
  if (/^[-+]?\d*\.?\d+$/.test(normalized)) {
    const value = Number(normalized);
    return Number.isFinite(value) ? value : null;
  }
  const fraction = normalized.match(/^([-+]?\d*\.?\d+)\/([-+]?\d*\.?\d+)$/);
  if (fraction) {
    const denominator = Number(fraction[2]);
    return denominator === 0 ? null : Number(fraction[1]) / denominator;
  }
  const pi = normalized.match(/^([-+]?\d*\.?\d+)?\*?pi(?:\/([-+]?\d*\.?\d+))?$/);
  if (pi) {
    const coefficient = pi[1] === undefined || pi[1] === "" || pi[1] === "+" ? 1 : Number(pi[1]);
    const denominator = pi[2] === undefined ? 1 : Number(pi[2]);
    if (denominator === 0) return null;
    const value = (coefficient * Math.PI) / denominator;
    return Number.isFinite(value) ? value : null;
  }
  return null;
}

export function seededShuffle(items, seed = 7) {
  const list = items.slice();
  let state = seed >>> 0;
  const random = () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
  for (let i = list.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [list[i], list[j]] = [list[j], list[i]];
  }
  return list;
}

export function shuffled(items, rng = Math.random) {
  const list = items.slice();
  for (let i = list.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [list[i], list[j]] = [list[j], list[i]];
  }
  return list;
}
