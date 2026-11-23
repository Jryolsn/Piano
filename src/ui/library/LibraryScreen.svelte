<script lang="ts">
  import {
    builtinEntries,
    importedEntries,
    importMidiFile,
    MAX_TITLE_LENGTH,
    renameImported,
    type LibraryEntry,
    type SongStorage,
  } from '../../song/library';
  import { MidiImportError } from '../../song/midi';
  import Icon from '../Icon.svelte';

  interface Props {
    storage: SongStorage;
    onselect: (entry: LibraryEntry) => void;
  }
  const { storage, onselect }: Props = $props();

  const LEVELS = [
    { name: 'Lätt', test: (d: number) => d <= 1 },
    { name: 'Lite svårare', test: (d: number) => d === 2 },
    { name: 'Utmaning', test: (d: number) => d >= 3 },
  ];
  const builtin = builtinEntries();
  const levels = LEVELS.map((l) => ({
    name: l.name,
    entries: builtin.filter((e) => l.test(e.difficulty ?? 1)),
  })).filter((l) => l.entries.length);
  let imported = $state<LibraryEntry[]>([]);
  let error = $state('');
  let confirmDelete = $state<string>();
  let renaming = $state<{ id: string; title: string }>();
  let fileInput: HTMLInputElement;

  $effect(() => {
    importedEntries(storage).then(
      (entries) => (imported = entries),
      () => (error = 'Kunde inte läsa dina sparade låtar.'),
    );
  });

  async function onFiles(files: FileList | null) {
    error = '';
    for (const file of files ?? []) {
      try {
        const entry = await importMidiFile(storage, { name: file.name, data: await file.arrayBuffer() });
        imported = [entry, ...imported];
      } catch (e) {
        error =
          e instanceof MidiImportError
            ? `${file.name}: filen gick inte att läsa som MIDI.`
            : `${file.name}: kunde inte sparas.`;
      }
    }
    fileInput.value = '';
  }

  async function remove(id: string) {
    await storage.delete(id);
    imported = imported.filter((e) => e.id !== id);
    confirmDelete = undefined;
  }

  async function saveRename() {
    if (!renaming) return;
    const { id, title } = renaming;
    renaming = undefined;
    try {
      const updated = await renameImported(storage, id, title);
      if (updated) imported = imported.map((e) => (e.id === id ? updated : e));
    } catch {
      error = 'Kunde inte byta namn.';
    }
  }

  function focusSelect(input: HTMLInputElement) {
    input.focus();
    input.select();
  }

  function meta(entry: LibraryEntry): string {
    const hands = new Set(entry.song.notes.map((n) => n.hand));
    const handText =
      hands.size === 2 ? 'Båda händerna' : hands.has('left') ? 'Vänster hand' : 'Höger hand';
    const s = Math.round(entry.song.duration);
    return `${handText} · ${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  }
</script>

{#snippet row(entry: LibraryEntry)}
  <li>
    {#if renaming?.id === entry.id}
      <form class="rename" onsubmit={(e) => (e.preventDefault(), saveRename())}>
        <input
          bind:value={renaming.title}
          use:focusSelect
          maxlength={MAX_TITLE_LENGTH}
          aria-label="Nytt namn"
          onkeydown={(e) => e.key === 'Escape' && (renaming = undefined)}
        />
        <button class="save" type="submit">Spara</button>
      </form>
    {:else}
      <button class="song" onclick={() => onselect(entry)}>
        <span class="title">{entry.title}</span>
        <span class="meta">{meta(entry)}</span>
      </button>
    {/if}
    {#if entry.source === 'imported' && renaming?.id !== entry.id}
      <button
        class="icon"
        aria-label="Byt namn på {entry.title}"
        onclick={() => ((renaming = { id: entry.id, title: entry.title }), (confirmDelete = undefined))}
      >
        <Icon name="edit" size={20} />
      </button>
      {#if confirmDelete === entry.id}
        <button class="delete confirm" onclick={() => remove(entry.id)}>Ta bort?</button>
      {:else}
        <button class="delete" aria-label="Ta bort {entry.title}" onclick={() => (confirmDelete = entry.id)}>
          ✕
        </button>
      {/if}
    {/if}
  </li>
{/snippet}

<section>
  <h1>Välj en låt</h1>

  {#if imported.length}
    <h2>Mina låtar</h2>
    <ul>
      {#each imported as entry (entry.id)}{@render row(entry)}{/each}
    </ul>
  {/if}

  {#each levels as level (level.name)}
    <h2>{level.name}</h2>
    <ul>
      {#each level.entries as entry (entry.id)}{@render row(entry)}{/each}
    </ul>
  {/each}

  {#if error}<p class="error" role="alert">{error}</p>{/if}
  <button class="import" onclick={() => fileInput.click()}>+ Lägg till egen låt (MIDI-fil)</button>
  <input
    bind:this={fileInput}
    type="file"
    accept=".mid,.midi,audio/midi,audio/x-midi"
    multiple
    hidden
    onchange={(e) => onFiles(e.currentTarget.files)}
  />
</section>

<style>
  section {
    max-width: 44rem;
    margin: 0 auto;
    padding: max(2rem, env(safe-area-inset-top)) 1rem 3rem;
  }
  h1 {
    margin: 0 0 0.5rem;
    font-size: 2rem;
    font-weight: 600;
  }
  h2 {
    margin: 1.75rem 0 0.6rem;
    font-size: 1rem;
    font-weight: 600;
    color: var(--muted);
  }
  ul {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(16rem, 1fr));
    gap: 0.6rem;
  }
  li {
    display: flex;
    min-height: 4.5rem;
    border: 1px solid var(--line);
    border-radius: 14px;
    background: var(--card);
  }
  button {
    font: inherit;
    color: inherit;
    background: none;
    border: 0;
    cursor: pointer;
  }
  .song {
    flex: 1;
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 0.2rem;
    padding: 0.8rem 1rem;
    text-align: left;
    border-radius: 14px;
  }
  .song:hover .title,
  .song:focus-visible .title {
    color: var(--accent);
  }
  .title {
    font-size: 1.15rem;
    font-weight: 500;
  }
  .meta {
    font-size: 0.9rem;
    color: var(--muted);
  }
  .import {
    margin-top: 2rem;
    padding: 0.9rem 1.25rem;
    border: 1px dashed var(--line);
    border-radius: 14px;
    width: 100%;
    color: var(--muted);
  }
  .import:hover {
    color: var(--accent);
    border-color: var(--accent);
  }
  .icon {
    display: grid;
    place-items: center;
    padding: 0 0.6rem;
    color: var(--muted);
  }
  .icon:hover {
    color: var(--accent);
  }
  .rename {
    flex: 1;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.6rem 0.8rem;
  }
  .rename input {
    flex: 1;
    min-width: 0;
    padding: 0.6rem 0.7rem;
    border: 1px solid var(--accent);
    border-radius: 10px;
    background: var(--bg);
    color: var(--fg);
    font: inherit;
    font-size: 1.1rem;
  }
  .save {
    padding: 0.6rem 0.9rem;
    border-radius: 10px;
    background: var(--accent);
    color: var(--on-accent);
  }
  .delete {
    padding: 0 1rem;
    color: var(--muted);
  }
  .delete.confirm {
    color: var(--danger);
  }
  .error {
    color: var(--danger);
  }
</style>
