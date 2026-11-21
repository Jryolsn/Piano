import { Capacitor, registerPlugin } from '@capacitor/core';

/** Keeps the screen on while acquired. Calls are idempotent and never throw. */
export interface KeepAwake {
  acquire(): Promise<void>;
  release(): Promise<void>;
}

interface NativeKeepAwake {
  keepAwake(): Promise<void>;
  allowSleep(): Promise<void>;
}

/** Native Android implementation (FLAG_KEEP_SCREEN_ON); the WebView has no Wake Lock API. */
export function nativeKeepAwake(plugin = registerPlugin<NativeKeepAwake>('KeepAwake')): KeepAwake {
  return {
    acquire: () => plugin.keepAwake().catch(() => {}),
    release: () => plugin.allowSleep().catch(() => {}),
  };
}

/** Screen Wake Lock API; the browser drops the lock when the page is hidden, so it is re-requested on return. */
export function webKeepAwake(nav: Navigator = navigator, doc: Document = document): KeepAwake {
  let wanted = false;
  let sentinel: WakeLockSentinel | null = null;

  async function request() {
    if (!wanted || sentinel || doc.visibilityState !== 'visible' || !nav.wakeLock) return;
    try {
      const s = await nav.wakeLock.request('screen');
      if (!wanted) return void s.release().catch(() => {});
      sentinel = s;
      s.addEventListener('release', () => {
        if (sentinel === s) sentinel = null;
      });
    } catch {
      // Denied (e.g. battery saver); the app works without it.
    }
  }

  const onVisibility = () => void request();

  return {
    async acquire() {
      if (wanted) return;
      wanted = true;
      doc.addEventListener('visibilitychange', onVisibility);
      await request();
    },
    async release() {
      if (!wanted) return;
      wanted = false;
      doc.removeEventListener('visibilitychange', onVisibility);
      const s = sentinel;
      sentinel = null;
      await s?.release().catch(() => {});
    },
  };
}

export function createKeepAwake(): KeepAwake {
  return Capacitor.isNativePlatform() ? nativeKeepAwake() : webKeepAwake();
}
