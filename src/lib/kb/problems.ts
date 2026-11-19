// The problems inside one merged ticket. Pages explain them; this file is what runs.
//
// causes.ts splits a ticket by tenant and booking form (parser / hint): the desk's own view, and
// the counts its tickets use. It cannot see a report that describes a different symptom: a date
// that moved by one day is not a flipped month, even when the tenant writes the day first. The
// desk already marks those (desk-notes.json, `oneDayMove`). Here they become a problem of their
// own, and stay counted in their cause group too, as the desk counts them.
import { causeOf, uniqueById, type Report, type Tenant } from '#lib/kb/causes';

export type ProblemKey = 'parser' | 'hint' | 'one-day' | 'unplaced';

export type Problem = {
  key: ProblemKey;
  reports: Report[];
  ids: string[];
  tenants: number;
  firstSeen: string;
  lastSeen: string;
};

// The order a reader meets them in: biggest first, `unplaced` last.
const ORDER: ProblemKey[] = ['parser', 'hint', 'one-day', 'unplaced'];

// A report can sit in two problems: its cause, and `one-day` when the desk read it as a one-day move.
export function problemsOf(r: Report, t: Tenant | undefined, oneDayMove: readonly string[]): ProblemKey[] {
  const keys: ProblemKey[] = [causeOf(r, t) ?? 'unplaced'];
  if (oneDayMove.includes(r.id)) keys.push('one-day');
  return keys;
}

export function splitTicket(
  all: Report[],
  ticket: number,
  tenantOf: (r: Report) => Tenant | undefined,
  oneDayMove: readonly string[],
): { merged: number; overlap: string[]; problems: Problem[] } {
  const merged = uniqueById(all).filter((r) => r.mergedInto === ticket);
  const by = new Map<ProblemKey, Report[]>();
  const overlap: string[] = [];
  for (const r of merged) {
    const keys = problemsOf(r, tenantOf(r), oneDayMove);
    if (keys.length > 1) overlap.push(r.id);
    for (const k of keys) by.set(k, [...(by.get(k) ?? []), r]);
  }
  const problems = ORDER.filter((k) => by.has(k)).map((key) => {
    const reports = by.get(key)!;
    const days = reports.map((r) => r.receivedAt.slice(0, 10)).sort();
    return {
      key,
      reports,
      ids: reports.map((r) => r.id).sort(),
      tenants: new Set(reports.map((r) => r.tenant)).size,
      firstSeen: days[0],
      lastSeen: days[days.length - 1],
    };
  });
  return { merged: merged.length, overlap: overlap.sort(), problems };
}
