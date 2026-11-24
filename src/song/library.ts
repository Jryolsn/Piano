import { ARRANGEMENTS, arrangementToSong } from './builtin';
import { songFromMidi } from './midi';
import type { Song } from './model';

export interface LibraryEntry {
  id: string;
  title: string;
  composer?: string;
  /** 1–5, built-in songs only. */
  difficulty?: number;
  source: 'builtin' | 'imported';
  song: Song;
}

export interface StoredSong {
  id: string;
  importedAt: number;
  song: Song;
}

/** Persistence for user-imported songs. */
export interface SongStorage {
  getAll(): Promise<StoredSong[]>;
  put(song: StoredSong): Promise<void>;
  delete(id: string): Promise<void>;
}

export function builtinEntries(): LibraryEntry[] {
  return ARRANGEMENTS.map((a) => ({
    id: `builtin:${a.id}`,
    title: a.title,
    composer: a.composer,
    difficulty: a.difficulty,
    source: 'builtin',
    song: arrangementToSong(a),
  }));
}

/** Imported songs, newest first. */
export async function importedEntries(storage: SongStorage): Promise<LibraryEntry[]> {
  const stored = await storage.getAll();
  return stored.sort((a, b) => b.importedAt - a.importedAt).map(toEntry);
}

/** Parses and stores a MIDI file. Throws `MidiImportError` for unusable files. */
export async function importMidiFile(
  storage: SongStorage,
  file: { name: string; data: ArrayBuffer },
  now = Date.now(),
  id: string = crypto.randomUUID(),
): Promise<LibraryEntry> {
  const song = songFromMidi(file.data, file.name.replace(/\.midi?$/i, ''));
  const stored: StoredSong = { id, importedAt: now, song };
  await storage.put(stored);
  return toEntry(stored);
}

/** Longest name a song can get. */
export const MAX_TITLE_LENGTH = 60;

/** Renames an imported song. Returns the updated entry, or undefined when the name is blank or the song is gone. */
export async function renameImported(storage: SongStorage, id: string, title: string): Promise<LibraryEntry | undefined> {
  const name = title.trim().slice(0, MAX_TITLE_LENGTH);
  if (!name) return undefined;
  const stored = (await storage.getAll()).find((s) => s.id === id);
  if (!stored) return undefined;
  const renamed: StoredSong = { ...stored, song: { ...stored.song, title: name } };
  await storage.put(renamed);
  return toEntry(renamed);
}

function toEntry(s: StoredSong): LibraryEntry {
  return { id: s.id, title: s.song.title, source: 'imported', song: s.song };
}
