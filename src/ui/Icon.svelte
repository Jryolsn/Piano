<script lang="ts" module>
  export type IconName =
    | 'back'
    | 'play'
    | 'settings'
    | 'loop'
    | 'edit'
    | 'hand-left'
    | 'hand-right'
    | 'hand-both';
</script>

<script lang="ts">
  interface Props {
    name: IconName;
    size?: number;
  }

  let { name, size = 24 }: Props = $props();
  const hand = $derived(name.startsWith('hand-') ? name.slice(5) : null);
</script>

{#if hand}
  <!-- A small keyboard; the left half is orange and the right half blue, like the notes on the board. -->
  <svg width={size * 1.4} height={size * 0.9} viewBox="0 0 28 18" aria-hidden="true">
    <path
      d="M4 1h10v16H4a3 3 0 0 1-3-3V4a3 3 0 0 1 3-3z"
      fill="#e0a458"
      opacity={hand === 'right' ? 0.25 : 1}
    />
    <path
      d="M14 1h10a3 3 0 0 1 3 3v10a3 3 0 0 1-3 3H14z"
      fill="#5b9bd5"
      opacity={hand === 'left' ? 0.25 : 1}
    />
    <path d="M7.5 1v16M20.5 1v16M14 1v16" stroke="#14171d" stroke-width="1.5" />
  </svg>
{:else}
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    {#if name === 'back'}
      <path d="M15 5l-7 7 7 7" />
    {:else if name === 'play'}
      <path d="M8 5.5v13l10.5-6.5z" fill="currentColor" />
    {:else if name === 'settings'}
      <path d="M4 7h9M19 7h1M4 17h1M11 17h9" />
      <circle cx="16" cy="7" r="2.5" />
      <circle cx="8" cy="17" r="2.5" />
    {:else if name === 'loop'}
      <path d="M17 3l3.5 3.5L17 10" />
      <path d="M4 11V9.5A3 3 0 0 1 7 6.5h13.5" />
      <path d="M7 21l-3.5-3.5L7 14" />
      <path d="M20 13v1.5a3 3 0 0 1-3 3H3.5" />
    {:else if name === 'edit'}
      <path d="M4 20l1-4L16.5 4.5a2.1 2.1 0 0 1 3 3L8 19z" />
      <path d="M14.5 6.5l3 3" />
    {/if}
  </svg>
{/if}
