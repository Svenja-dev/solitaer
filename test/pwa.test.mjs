import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import vm from 'node:vm';

async function loadServiceWorker({ rejectUrl } = {}) {
  const code = await readFile('sw.js', 'utf8');
  const listeners = new Map();
  const addedAssets = [];
  let skipWaitingCalled = false;

  const context = {
    URL,
    console,
    fetch: async () => ({ ok: true, clone: () => ({ ok: true }) }),
    Response: { error: () => new Error('offline') },
    caches: {
      open: async () => ({
        add: async (url) => {
          addedAssets.push(url);
          if (url === rejectUrl) throw new Error(`missing ${url}`);
        },
        put: async () => {},
      }),
      keys: async () => [],
      match: async () => undefined,
      delete: async () => true,
    },
    self: {
      location: new URL('http://localhost:4178/'),
      clients: { claim: async () => {} },
      skipWaiting: () => {
        skipWaitingCalled = true;
      },
      addEventListener: (type, listener) => {
        listeners.set(type, listener);
      },
    },
  };

  vm.createContext(context);
  vm.runInContext(code, context, { filename: 'sw.js' });

  return {
    addedAssets,
    get skipWaitingCalled() {
      return skipWaitingCalled;
    },
    async install() {
      let installPromise;
      listeners.get('install')({
        waitUntil: (promise) => {
          installPromise = promise;
        },
      });
      await installPromise;
    },
  };
}

test('service worker installs only after caching the complete app shell', async () => {
  const worker = await loadServiceWorker();
  await worker.install();

  assert.equal(worker.skipWaitingCalled, true);
  assert.ok(worker.addedAssets.length > 0);
  for (const asset of worker.addedAssets) {
    if (asset === './') continue;
    assert.equal(existsSync(asset.replace(/^\.\//, '')), true, `${asset} fehlt`);
  }
});

test('service worker install fails when an app-shell asset is missing', async () => {
  const worker = await loadServiceWorker({ rejectUrl: './js/main.js' });

  await assert.rejects(
    worker.install(),
    /App-Shell-Cache unvollständig: \.\/js\/main\.js/
  );
  assert.equal(worker.skipWaitingCalled, false);
});

test('mobile topbar keeps safe-area padding in standalone PWA mode', async () => {
  const css = await readFile('css/style.css', 'utf8');
  const mobileBlock = css.match(/@media \(max-width: 680px\) \{[\s\S]*?\n\}/);

  assert.ok(mobileBlock, 'Mobile-Breakpoint fehlt');
  assert.match(mobileBlock[0], /safe-area-inset-top/);
  assert.match(mobileBlock[0], /safe-area-inset-right/);
  assert.match(mobileBlock[0], /safe-area-inset-left/);
});
