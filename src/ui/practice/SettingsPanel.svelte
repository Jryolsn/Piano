<script lang="ts">
  import { MAX_TEMPO, MIN_TEMPO } from '../../engine/practice';
  import Icon, { type IconName } from '../Icon.svelte';
  import { LOOKAHEAD_RANGE, songModes, type HandChoice, type PracticeSettings } from './settings';

  interface Props {
    settings: PracticeSettings;
    looping: boolean;
    onToggleLoop: () => void;
  }

  let { settings = $bindable(), looping, onToggleLoop }: Props = $props();

  const hands: { value: HandChoice; label: string; icon: IconName }[] = [
    { value: 'left', label: 'Vänster hand', icon: 'hand-left' },
    { value: 'both', label: 'Båda händerna', icon: 'hand-both' },
    { value: 'right', label: 'Höger hand', icon: 'hand-right' },
  ];
</script>

<div class="panel">
  <fieldset>
    <legend>Läge</legend>
    <div class="segmented">
      {#each songModes as m (m.value)}
        <button class:on={settings.mode === m.value} onclick={() => (settings.mode = m.value)}>{m.label}</button>
      {/each}
    </div>
  </fieldset>

  <fieldset>
    <legend>Hand</legend>
    <div class="segmented">
      {#each hands as h (h.value)}
        <button
          class="icon"
          class:on={settings.hand === h.value}
          aria-label={h.label}
          title={h.label}
          aria-pressed={settings.hand === h.value}
          onclick={() => (settings.hand = h.value)}
        >
          <Icon name={h.icon} />
        </button>
      {/each}
    </div>
  </fieldset>

  <label>
    <span>Tempo <output>{Math.round(settings.tempo * 100)} %</output></span>
    <input type="range" min={MIN_TEMPO} max={MAX_TEMPO} step={0.05} bind:value={settings.tempo} />
  </label>

  <label>
    <span>Framförhållning <output>{settings.lookahead} s</output></span>
    <input
      type="range"
      min={LOOKAHEAD_RANGE.min}
      max={LOOKAHEAD_RANGE.max}
      step={LOOKAHEAD_RANGE.step}
      bind:value={settings.lookahead}
    />
  </label>

  <button class="loop" class:on={looping} aria-pressed={looping} onclick={onToggleLoop}>
    <Icon name="loop" />
    <span>Upprepa ett avsnitt</span>
  </button>
  {#if looping}
    <p class="hint">Dra i pinnarna högst upp för att välja start och slut.</p>
  {/if}
</div>

<style>
  .panel {
    display: grid;
    gap: 14px;
    padding: 16px;
    width: min(320px, calc(100vw - 20px));
    background: rgba(28, 31, 38, 0.96);
    border-radius: 12px;
    color: #d8d6d1;
    font-size: 15px;
  }
  fieldset {
    border: 0;
    margin: 0;
    padding: 0;
  }
  legend,
  label > span {
    display: flex;
    justify-content: space-between;
    width: 100%;
    margin-bottom: 6px;
    color: #9c9a95;
  }
  output {
    color: #d8d6d1;
    margin-left: 8px;
  }
  label {
    display: block;
  }
  input[type='range'] {
    width: 100%;
    height: 32px;
    accent-color: #5b9bd5;
  }
  .segmented {
    display: flex;
    gap: 4px;
  }
  .segmented button {
    flex: 1;
    min-height: 44px;
    padding: 6px;
    border: 0;
    border-radius: 8px;
    background: #2a2e37;
    color: inherit;
    font: inherit;
    cursor: pointer;
  }
  .segmented button.on {
    background: #5b9bd5;
    color: #10131a;
  }
  .segmented button.icon {
    display: grid;
    place-items: center;
    background: #2a2e37;
    color: inherit;
  }
  .segmented button.icon.on {
    background: #3a404c;
    box-shadow: inset 0 0 0 2px #d8d6d1;
  }
  .loop {
    display: flex;
    align-items: center;
    gap: 10px;
    min-height: 48px;
    padding: 6px 14px;
    border: 0;
    border-radius: 8px;
    background: #2a2e37;
    color: inherit;
    font: inherit;
    cursor: pointer;
  }
  .loop.on {
    background: #e8a94a;
    color: #10131a;
  }
  .hint {
    margin: -6px 0 0;
    font-size: 13px;
    color: #9c9a95;
  }
</style>
