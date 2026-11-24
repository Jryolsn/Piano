import { Midi } from '@tonejs/midi';
import { describe, expect, it } from 'vitest';
import { builtinEntries, importedEntries, importMidiFile, renameImported, type SongStorage, type StoredSong } from './library';
import { MidiImportError } from './midi';

function memoryStorage(): SongStorage {
  const songs = new Map<string, StoredSong>();
  return {
    getAll: async () => [...songs.values()],
    put: async (s) => void songs.set(s.id, s),
    delete: async (id) => void songs.delete(id),
  };
}

function midiFile(): ArrayBuffer {
  const m = new Midi();
  m.addTrack().addNote({ midi: 60, time: 0, duration: 1 });
  return m.toArray().slice().buffer;
}

describe('library', () => {
  it('lists built-in songs with metadata', () => {
    const entries = builtinEntries();
    expect(entries.length).toBeGreaterThanOrEqual(5);
    expect(entries.every((e) => e.source === 'builtin' && e.difficulty && e.song.notes.length)).toBe(true);
  });

  it('imports, persists and lists newest first', async () => {
    const storage = memoryStorage();
    await importMidiFile(storage, { name: 'first.mid', data: midiFile() }, 1, 'a');
    const second = await importMidiFile(storage, { name: 'Second.MIDI', data: midiFile() }, 2, 'b');
    expect(second).toMatchObject({ id: 'b', title: 'Second', source: 'imported' });
    expect((await importedEntries(storage)).map((e) => e.title)).toEqual(['Second', 'first']);
  });

  it('stores nothing when the file is invalid', async () => {
    const storage = memoryStorage();
    await expect(
      importMidiFile(storage, { name: 'bad.mid', data: new ArrayBuffer(4) }),
    ).rejects.toBeInstanceOf(MidiImportError);
    expect(await storage.getAll()).toEqual([]);
  });

  it('renames an imported song and keeps it after reload', async () => {
    const storage = memoryStorage();
    await importMidiFile(storage, { name: 'old.mid', data: midiFile() }, 1, 'a');
    const renamed = await renameImported(storage, 'a', '  Min låt  ');
    expect(renamed).toMatchObject({ id: 'a', title: 'Min låt', source: 'imported' });
    expect((await importedEntries(storage)).map((e) => e.title)).toEqual(['Min låt']);
  });

  it('ignores a blank name or an unknown song', async () => {
    const storage = memoryStorage();
    await importMidiFile(storage, { name: 'old.mid', data: midiFile() }, 1, 'a');
    expect(await renameImported(storage, 'a', '   ')).toBeUndefined();
    expect(await renameImported(storage, 'zzz', 'Ny')).toBeUndefined();
    expect((await importedEntries(storage)).map((e) => e.title)).toEqual(['old']);
  });
});
