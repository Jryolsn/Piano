<script lang="ts">
  import { MAX_TEMPO, MIN_TEMPO, type LoopRange, type PracticeMode } from '../../engine/practice';
  import { formatTime, LOOKAHEAD_RANGE, type HandChoice, type PracticeSettings } from './settings';

  interface Props {
    settings: PracticeSettings;
    loop: LoopRange | null;
    onSetLoopStart: () => void;
    onSetLoopEnd: () => void;
    onClearLoop: () => void;
  }

  let { settings = $bindable(), loop, onSetLoopStart, onSetLoopEnd, onClearLoop }: Props = $props();

  const modes: { value: PracticeMode; label: string }[] = [
    { value: 'wait', label: 'Vänta' },
    { value: 'tempo', label: 'Tempo' },
  ];
  const hands: { value: HandChoice; label: string }[] = [
    { value: 'left', label: 'Vänster' },
    { value: 'both', label: 'Båda' },
    { value: 'right', label: 'Höger' },
  ];
</script>

<div class="panel">
  <fieldset>
    <legend>Läge</legend>
    <div class="segmented">
      {#each modes as m (m.value)}
        <button class:on={settings.mode === m.value} onclick={() => (settings.mode = m.value)}>{m.label}</button>
      {/each}
    </div>
  </fieldset>

  <fieldset>
    <legend>Hand</legend>
    <div class="segmented">
      {#each hands as h (h.value)}
        <button class:on={settings.hand === h.value} onclick={() => (settings.hand = h.value)}>{h.label}</button>
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

  <fieldset>
    <legend>Loop {#if loop}<output>{formatTime(loop.from)}–{formatTime(loop.to)}</output>{/if}</legend>
    <div class="segmented">
      <button onclick={onSetLoopStart}>Start här</button>
      <button onclick={onSetLoopEnd}>Slut här</button>
      <button onclick={onClearLoop} disabled={!loop}>Ta bort</button>
    </div>
  </fieldset>
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
  .segmented button:disabled {
    opacity: 0.4;
    cursor: default;
  }
</style>
