import type { SongStorage, StoredSong } from './library';

const STORE = 'songs';

/** IndexedDB-backed song storage, local to the device. */
export function indexedDbStorage(dbName = 'pianoapp'): SongStorage {
  let db: Promise<IDBDatabase> | undefined;
  const open = () =>
    (db ??= new Promise((resolve, reject) => {
      const req = indexedDB.open(dbName, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: 'id' });
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    }));

  async function run<T>(mode: IDBTransactionMode, op: (s: IDBObjectStore) => IDBRequest<T>) {
    const store = (await open()).transaction(STORE, mode).objectStore(STORE);
    return new Promise<T>((resolve, reject) => {
      const req = op(store);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  return {
    getAll: () => run<StoredSong[]>('readonly', (s) => s.getAll()),
    put: async (song) => void (await run('readwrite', (s) => s.put(song))),
    delete: (id) => run('readwrite', (s) => s.delete(id)),
  };
}
