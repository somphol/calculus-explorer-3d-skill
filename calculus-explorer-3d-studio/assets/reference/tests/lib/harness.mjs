// Small dependency-free harness: static file server + Chrome DevTools Protocol.
// Used by tests/browser.test.mjs and scripts/screenshot.mjs. Not part of the app.

import { spawn } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { extname, join, normalize, resolve } from 'node:path';

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.md': 'text/markdown; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
};

export async function startServer(root) {
  const base = resolve(root);
  const server = createServer((req, res) => {
    try {
      const url = new URL(req.url, 'http://localhost');
      let path = normalize(decodeURIComponent(url.pathname));
      if (path === '/' || path === '\\') path = '/index.html';
      const file = join(base, path);
      if (!file.startsWith(base) || !existsSync(file) || !statSync(file).isFile()) {
        res.writeHead(404, { 'content-type': 'text/plain' });
        res.end('not found');
        return;
      }
      res.writeHead(200, {
        'content-type': MIME[extname(file)] || 'application/octet-stream',
        'cache-control': 'no-store',
      });
      res.end(readFileSync(file));
    } catch {
      res.writeHead(500);
      res.end('error');
    }
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const { port } = server.address();
  return {
    url: `http://127.0.0.1:${port}`,
    close: () => new Promise((r) => server.close(r)),
  };
}

export function findChrome() {
  const candidates = [
    process.env.CHROME,
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
  ].filter(Boolean);
  return candidates.find((p) => existsSync(p));
}

export async function findFreePort() {
  const srv = createServer();
  await new Promise((r) => srv.listen(0, '127.0.0.1', r));
  const { port } = srv.address();
  await new Promise((r) => srv.close(r));
  return port;
}

export async function launchBrowser({ width = 1600, height = 1000, chromePath } = {}) {
  const chrome = chromePath || findChrome();
  if (!chrome) throw new Error('Chrome not found. Set CHROME to the executable path.');
  const profile = mkdtempSync(join(tmpdir(), 'p15-profile-'));
  const port = await findFreePort();
  // --use-mock-keychain keeps Chrome away from the macOS Keychain: no prompts.
  const proc = spawn(
    chrome,
    [
      '--headless=new',
      '--no-sandbox',
      '--disable-dev-shm-usage',
      '--enable-unsafe-swiftshader',
      '--use-mock-keychain',
      '--password-store=basic',
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-background-networking',
      '--disable-component-update',
      '--disable-sync',
      '--mute-audio',
      `--user-data-dir=${profile}`,
      `--remote-debugging-port=${port}`,
      `--window-size=${width},${height}`,
      'about:blank',
    ],
    { stdio: ['ignore', 'ignore', 'pipe'] }
  );

  let wsUrl = null;
  for (let i = 0; i < 120; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/json/version`);
      if (res.ok) {
        wsUrl = (await res.json()).webSocketDebuggerUrl;
        break;
      }
    } catch { /* retry */ }
    await new Promise((r) => setTimeout(r, 100));
  }
  if (!wsUrl) throw new Error('Chrome DevTools endpoint did not come up');
  return { proc, wsUrl, profile, port };
}

export async function connect(wsUrl) {
  const ws = new WebSocket(wsUrl);
  await new Promise((resolve, reject) => {
    ws.onopen = resolve;
    ws.onerror = reject;
  });
  let id = 0;
  const pending = new Map();
  const events = [];
  const listeners = new Map();
  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    if (msg.id && pending.has(msg.id)) {
      const { resolve: res, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      if (msg.error) reject(new Error(msg.error.message));
      else res(msg.result);
      return;
    }
    if (msg.method) {
      events.push(msg);
      for (const fn of listeners.get(msg.method) || []) fn(msg.params);
    }
  };
  const send = (method, params = {}) =>
    new Promise((res, reject) => {
      const n = ++id;
      pending.set(n, { resolve: res, reject });
      ws.send(JSON.stringify({ id: n, method, params }));
    });
  const on = (method, fn) => {
    if (!listeners.has(method)) listeners.set(method, new Set());
    listeners.get(method).add(fn);
  };
  const once = (method) => new Promise((resolve) => {
    const fn = (params) => {
      listeners.get(method).delete(fn);
      resolve(params);
    };
    on(method, fn);
  });
  const waitFor = async (expression, { timeout = 15000, interval = 120 } = {}) => {
    const started = Date.now();
    for (;;) {
      const { result } = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
      if (result?.value) return result.value;
      if (Date.now() - started > timeout) throw new Error(`timeout waiting for: ${expression}`);
      await new Promise((r) => setTimeout(r, interval));
    }
  };
  return { ws, send, on, once, events, waitFor, close: () => ws.close() };
}
