<script lang="ts">
  import type { LibraryEntry } from './song/library';
  import { indexedDbStorage } from './song/storage';
  import LibraryScreen from './ui/library/LibraryScreen.svelte';
  import PracticeScreen from './ui/practice/PracticeScreen.svelte';

  const storage = indexedDbStorage();
  let selected = $state<LibraryEntry>();
</script>

{#if selected}
  <PracticeScreen song={selected.song} onExit={() => (selected = undefined)} />
{:else}
  <LibraryScreen {storage} onselect={(entry) => (selected = entry)} />
{/if}

<style>
  :global(:root) {
    --bg: #fbfaf7;
    --fg: #1f2328;
    --muted: #6b7078;
    --line: #e4e1da;
    --card: #fff;
    --accent: #3b6e8f;
    --on-accent: #fff;
    --danger: #b3412e;
    color-scheme: light dark;
  }
  @media (prefers-color-scheme: dark) {
    :global(:root) {
      --bg: #16181b;
      --fg: #e8e6e1;
      --muted: #8d939b;
      --line: #2c3036;
      --card: #1d2024;
      --accent: #7fb0cf;
      --on-accent: #10161a;
      --danger: #e07a66;
    }
  }
  :global(body) {
    margin: 0;
    background: var(--bg);
    color: var(--fg);
    font-family: system-ui, sans-serif;
  }
</style>
