import { describe, expect, it, vi } from 'vitest';
import { nativeKeepAwake, webKeepAwake } from './keep-awake';

class FakeSentinel extends EventTarget {
  released = false;
  async release() {
    this.released = true;
    this.dispatchEvent(new Event('release'));
  }
}

function fakeEnv(supported = true) {
  const sentinels: FakeSentinel[] = [];
  const doc = Object.assign(new EventTarget(), { visibilityState: 'visible' as DocumentVisibilityState });
  const request = vi.fn(async () => {
    const s = new FakeSentinel();
    sentinels.push(s);
    return s;
  });
  const nav = (supported ? { wakeLock: { request } } : {}) as unknown as Navigator;
  const setVisible = (visible: boolean) => {
    doc.visibilityState = visible ? 'visible' : 'hidden';
    doc.dispatchEvent(new Event('visibilitychange'));
  };
  return { lock: webKeepAwake(nav, doc as unknown as Document), request, sentinels, doc, setVisible };
}

describe('webKeepAwake', () => {
  it('requests the lock once and releases it', async () => {
    const env = fakeEnv();
    await env.lock.acquire();
    await env.lock.acquire();
    expect(env.request).toHaveBeenCalledTimes(1);
    await env.lock.release();
    expect(env.sentinels[0]!.released).toBe(true);
  });

  it('re-acquires when the page becomes visible again', async () => {
    const env = fakeEnv();
    await env.lock.acquire();
    env.doc.visibilityState = 'hidden';
    await env.sentinels[0]!.release(); // the browser drops the lock when hidden
    env.setVisible(true);
    await vi.waitFor(() => expect(env.request).toHaveBeenCalledTimes(2));
  });

  it('does not re-acquire after release', async () => {
    const env = fakeEnv();
    await env.lock.acquire();
    await env.lock.release();
    env.setVisible(true);
    expect(env.request).toHaveBeenCalledTimes(1);
  });

  it('is a no-op without the Wake Lock API', async () => {
    const env = fakeEnv(false);
    await expect(env.lock.acquire()).resolves.toBeUndefined();
    await expect(env.lock.release()).resolves.toBeUndefined();
  });
});

describe('nativeKeepAwake', () => {
  it('maps to the native plugin and swallows errors', async () => {
    const plugin = { keepAwake: vi.fn(async () => {}), allowSleep: vi.fn(() => Promise.reject(new Error('x'))) };
    const lock = nativeKeepAwake(plugin);
    await lock.acquire();
    await expect(lock.release()).resolves.toBeUndefined();
    expect(plugin.keepAwake).toHaveBeenCalledOnce();
  });
});
