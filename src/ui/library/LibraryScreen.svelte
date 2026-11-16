<script lang="ts">
  import {
    builtinEntries,
    importedEntries,
    importMidiFile,
    type LibraryEntry,
    type SongStorage,
  } from '../../song/library';
  import { MidiImportError } from '../../song/midi';

  interface Props {
    storage: SongStorage;
    onselect: (entry: LibraryEntry) => void;
  }
  const { storage, onselect }: Props = $props();

  const builtin = builtinEntries();
  let imported = $state<LibraryEntry[]>([]);
  let error = $state('');
  let confirmDelete = $state<string>();
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

  function meta(entry: LibraryEntry): string {
    const s = Math.round(entry.song.duration);
    const parts = [entry.composer, `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`];
    if (!entry.song.notes.some((n) => n.hand === 'left')) parts.push('bara höger hand');
    return parts.filter(Boolean).join(' · ');
  }
</script>

{#snippet row(entry: LibraryEntry)}
  <li>
    <button class="song" onclick={() => onselect(entry)}>
      <span class="title">{entry.title}</span>
      <span class="meta">{meta(entry)}</span>
      {#if entry.difficulty}
        <span class="level" aria-label="Svårighet {entry.difficulty} av 5">
          {#each [1, 2, 3, 4, 5] as d (d)}<i class:on={d <= entry.difficulty}></i>{/each}
        </span>
      {/if}
    </button>
    {#if entry.source === 'imported'}
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
  <header>
    <h1>Låtar</h1>
    <button class="import" onclick={() => fileInput.click()}>Importera MIDI</button>
    <input
      bind:this={fileInput}
      type="file"
      accept=".mid,.midi,audio/midi,audio/x-midi"
      multiple
      hidden
      onchange={(e) => onFiles(e.currentTarget.files)}
    />
  </header>

  {#if error}<p class="error" role="alert">{error}</p>{/if}

  {#if imported.length}
    <h2>Mina låtar</h2>
    <ul>
      {#each imported as entry (entry.id)}{@render row(entry)}{/each}
    </ul>
  {/if}

  <h2>Inbyggda</h2>
  <ul>
    {#each builtin as entry (entry.id)}{@render row(entry)}{/each}
  </ul>
</section>

<style>
  section {
    max-width: 40rem;
    margin: 0 auto;
    padding: 1.5rem 1rem 3rem;
  }
  header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
  }
  h1 {
    margin: 0;
    font-size: 1.75rem;
    font-weight: 600;
  }
  h2 {
    margin: 2rem 0 0.5rem;
    font-size: 0.85rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--muted);
  }
  ul {
    list-style: none;
    margin: 0;
    padding: 0;
  }
  li {
    display: flex;
    border-bottom: 1px solid var(--line);
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
    display: grid;
    grid-template-columns: 1fr auto;
    gap: 0.15rem 1rem;
    padding: 0.9rem 0.25rem;
    text-align: left;
  }
  .song:hover .title {
    color: var(--accent);
  }
  .title {
    font-size: 1.05rem;
  }
  .meta {
    grid-row: 2;
    font-size: 0.85rem;
    color: var(--muted);
  }
  .level {
    grid-row: 1 / 3;
    grid-column: 2;
    align-self: center;
    display: flex;
    gap: 3px;
  }
  .level i {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--line);
  }
  .level i.on {
    background: var(--accent);
  }
  .import {
    padding: 0.5rem 1rem;
    border-radius: 999px;
    background: var(--accent);
    color: var(--on-accent);
  }
  .delete {
    padding: 0 0.75rem;
    color: var(--muted);
  }
  .delete.confirm {
    color: var(--danger);
  }
  .error {
    color: var(--danger);
  }
</style>
