// The problems inside one merged ticket. Pages explain them; this file is what runs.
//
// causes.ts splits a ticket by tenant and booking form (parser / hint). It cannot see a report
// that describes a different symptom: a date that moved by one day is not a flipped month, even
// when the tenant writes the day first. The desk already marks those (desk-notes.json,
// `oneDayMove`). Here they leave the cause groups and become a problem of their own.
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

export function problemOf(r: Report, t: Tenant | undefined, oneDayMove: readonly string[]): ProblemKey {
  if (oneDayMove.includes(r.id)) return 'one-day';
  return causeOf(r, t) ?? 'unplaced';
}

export function splitTicket(
  all: Report[],
  ticket: number,
  tenantOf: (r: Report) => Tenant | undefined,
  oneDayMove: readonly string[],
): { merged: number; problems: Problem[] } {
  const merged = uniqueById(all).filter((r) => r.mergedInto === ticket);
  const by = new Map<ProblemKey, Report[]>();
  for (const r of merged) {
    const k = problemOf(r, tenantOf(r), oneDayMove);
    by.set(k, [...(by.get(k) ?? []), r]);
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
  return { merged: merged.length, problems };
}
