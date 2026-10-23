import { format, parseISO, startOfWeek } from "date-fns";

import type { DailyStat } from "../api/types";
import { addDaysKey, toDateKey } from "./date";

export interface BreakdownRow {
  key: string;
  label: string;
  planned: number;
  completed: number;
  avgPd: number | null;
  avgAd: number | null;
  hardTotal: number;
  hardCompleted: number;
}

interface Accumulator {
  planned: number;
  completed: number;
  pdWeight: number;
  adWeight: number;
  hardTotal: number;
  hardCompleted: number;
}

function emptyAccumulator(): Accumulator {
  return {
    planned: 0,
    completed: 0,
    pdWeight: 0,
    adWeight: 0,
    hardTotal: 0,
    hardCompleted: 0,
  };
}

function rowFromAccumulator(key: string, label: string, accumulator: Accumulator): BreakdownRow {
  return {
    key,
    label,
    planned: accumulator.planned,
    completed: accumulator.completed,
    avgPd: accumulator.planned > 0 ? accumulator.pdWeight / accumulator.planned : null,
    avgAd: accumulator.completed > 0 ? accumulator.adWeight / accumulator.completed : null,
    hardTotal: accumulator.hardTotal,
    hardCompleted: accumulator.hardCompleted,
  };
}

export function buildWeekBreakdown(daily: DailyStat[], fromKey: string): BreakdownRow[] {
  const byDate = new Map(daily.map((day) => [day.date, day]));

  return Array.from({ length: 7 }, (_, index) => {
    const key = addDaysKey(fromKey, index);
    const day = byDate.get(key);
    return {
      key,
      label: format(parseISO(key), "EEE d"),
      planned: day?.planned ?? 0,
      completed: day?.completed ?? 0,
      avgPd: day?.avgPd ?? null,
      avgAd: day?.avgAd ?? null,
      hardTotal: day?.hardTotal ?? 0,
      hardCompleted: day?.hardCompleted ?? 0,
    };
  });
}

export function buildWeekBuckets(daily: DailyStat[]): BreakdownRow[] {
  return bucketize(
    daily,
    (date) => toDateKey(startOfWeek(parseISO(date), { weekStartsOn: 1 })),
    (key) => `Week of ${format(parseISO(key), "MMM d")}`,
  );
}

export function buildMonthBuckets(daily: DailyStat[]): BreakdownRow[] {
  return bucketize(
    daily,
    (date) => format(parseISO(date), "yyyy-MM"),
    (key) => format(parseISO(`${key}-01`), "MMM yyyy"),
  );
}

function bucketize(
  daily: DailyStat[],
  bucketKey: (date: string) => string,
  label: (key: string) => string,
): BreakdownRow[] {
  const buckets = new Map<string, Accumulator>();

  for (const day of daily) {
    if (day.planned <= 0) continue;
    const key = bucketKey(day.date);
    let accumulator = buckets.get(key);
    if (!accumulator) {
      accumulator = emptyAccumulator();
      buckets.set(key, accumulator);
    }

    accumulator.planned += day.planned;
    accumulator.completed += day.completed;
    accumulator.pdWeight += (day.avgPd ?? 0) * day.planned;
    accumulator.adWeight += (day.avgAd ?? 0) * day.completed;
    accumulator.hardTotal += day.hardTotal;
    accumulator.hardCompleted += day.hardCompleted;
  }

  return Array.from(buckets.entries())
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, accumulator]) => rowFromAccumulator(key, label(key), accumulator));
}

export function completionRate(planned: number, completed: number): number {
  if (planned <= 0) return 0;
  return completed / planned;
}

export function formatPercent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

export function formatAverage(value: number | null): string {
  return value === null ? "—" : value.toFixed(1);
}

export function formatGap(value: number | null): string {
  if (value === null) return "—";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(1)}`;
}

export function gapTone(value: number | null): "harder" | "easier" | "even" | "unknown" {
  if (value === null) return "unknown";
  if (value > 0.15) return "harder";
  if (value < -0.15) return "easier";
  return "even";
}

export function gapLabel(value: number | null): string {
  const tone = gapTone(value);
  if (tone === "harder") return "Felt harder than expected";
  if (tone === "easier") return "Felt easier than expected";
  if (tone === "even") return "Matched expectations";
  return "Not enough data";
}
