<script lang="ts">
  import reports from '#lib/data/reports-4471.json';
  import notes from '#lib/data/desk-notes.json';
  import type { Report } from '#lib/kb/causes';
  import { tenantOf } from '#lib/kb/locales';
  import { splitTicket, type ProblemKey } from '#lib/kb/problems';

  // `issues` maps each problem to the ticket filed for it: { parser: 'https://…/issues/1', … }.
  let { ticket, issues = {} }: { ticket: number; issues?: Partial<Record<ProblemKey, string>> } = $props();

  const LABEL: Record<ProblemKey, string> = {
    parser: 'month read first (shared parser)',
    hint: 'MM/DD hint on booking-v3',
    'one-day': 'moved by one day',
    unplaced: 'no tenant on file',
  };

  const split = $derived(splitTicket(reports as Report[], ticket, tenantOf, notes.oneDayMove));
  const ticketNo = (url?: string) => (url ? `#${url.split('/').pop()}` : 'no ticket yet');
</script>

<p class="sum">
  <strong>{split.merged}</strong> reports merged into #{ticket} ·
  <strong>{split.problems.length}</strong>
  {split.problems.length === 1 ? 'problem' : 'problems'}
</p>

<table>
  <thead>
    <tr><th>problem</th><th>reports</th><th>tenants</th><th>seen</th><th>ticket</th></tr>
  </thead>
  <tbody>
    {#each split.problems as p (p.key)}
      <tr>
        <td>{LABEL[p.key]} <code>{p.key}</code></td>
        <td>{p.reports.length}</td>
        <td>{p.tenants}</td>
        <td>{p.firstSeen} → {p.lastSeen}</td>
        <td>
          {#if issues[p.key]}<a href={issues[p.key]}>{ticketNo(issues[p.key])}</a>{:else}<span class="none">no ticket yet</span>{/if}
        </td>
      </tr>
    {/each}
  </tbody>
</table>

{#if split.overlap.length}
  <p class="note">
    {split.overlap.length} reports count twice: under their cause, as the desk files them, and under
    <code>one-day</code>, as the desk read them ({split.overlap.join(', ')}).
  </p>
{/if}

{#each split.problems as p (p.key)}
  <details>
    <summary>{LABEL[p.key]}: {p.ids.length} report ids</summary>
    <p class="ids">{p.ids.join(' ')}</p>
  </details>
{/each}

<style>
  .sum { font-size: 1.1rem; }
  .none { color: var(--warn); font-weight: 600; }
  .note { color: var(--muted); font-size: 0.85em; }
  details { margin: 0.4rem 0; }
  summary { cursor: pointer; color: var(--muted); font-size: 0.9rem; }
  .ids { font: 0.8rem/1.5 var(--mono); color: var(--muted); word-spacing: 0.3em; }
</style>
