<script lang="ts">
  import { songModes, type SongMode } from './settings';

  interface Props {
    selected: SongMode;
    onPick: (mode: SongMode) => void;
  }

  let { selected, onPick }: Props = $props();
</script>

<div class="modes" role="group" aria-label="Läge">
  {#each songModes as m (m.value)}
    <button class="mode" class:on={selected === m.value} onclick={() => onPick(m.value)}>
      <svg viewBox="0 0 24 24" aria-hidden="true">
        {#if m.value === 'listen'}
          <path d="M4 9.5v5h3.5L12 18.5v-13L7.5 9.5H4z" />
          <path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11" />
        {:else if m.value === 'along'}
          <path d="M9 17.5V6l9-2v11.5" />
          <circle cx="6.5" cy="17.5" r="2.5" />
          <circle cx="15.5" cy="15.5" r="2.5" />
        {:else}
          <path d="M8.5 6v12M15.5 6v12" />
        {/if}
      </svg>
      <span class="label">{m.label}</span>
      <span class="hint">{m.hint}</span>
    </button>
  {/each}
</div>

<style>
  .modes {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 10px;
    width: 100%;
  }
  .mode {
    flex: 1 1 150px;
    display: grid;
    justify-items: center;
    align-content: center;
    gap: 4px;
    min-height: 104px;
    padding: 14px 10px;
    border: 1.5px solid rgba(255, 255, 255, 0.12);
    border-radius: 16px;
    background: rgba(28, 31, 38, 0.92);
    color: #d8d6d1;
    font: inherit;
    cursor: pointer;
    box-shadow: 0 6px 24px rgba(0, 0, 0, 0.35);
    transition: border-color 0.15s, background 0.15s;
  }
  .mode.on {
    border-color: #5b9bd5;
    background: rgba(91, 155, 213, 0.16);
  }
  svg {
    width: 28px;
    height: 28px;
    margin-bottom: 4px;
    fill: none;
    stroke: currentColor;
    stroke-width: 1.7;
    stroke-linecap: round;
    stroke-linejoin: round;
  }
  .mode.on svg {
    stroke: #8cc0f0;
  }
  .label {
    font-size: 18px;
    font-weight: 600;
  }
  .hint {
    font-size: 13px;
    color: #9c9a95;
  }
</style>
