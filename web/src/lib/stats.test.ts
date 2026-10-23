import { describe, expect, test } from "bun:test";

import type { DailyStat } from "../api/types";
import {
  buildMonthBuckets,
  buildWeekBreakdown,
  buildWeekBuckets,
  completionRate,
  formatAverage,
  formatGap,
  formatPercent,
  gapLabel,
  gapTone,
} from "./stats";

function stat(overrides: Partial<DailyStat> & { date: string }): DailyStat {
  return {
    planned: 0,
    completed: 0,
    avgPd: null,
    avgAd: null,
    hardTotal: 0,
    hardCompleted: 0,
    ...overrides,
  };
}

describe("stats helpers", () => {
  test("fills every day of the week, including empty days", () => {
    const rows = buildWeekBreakdown(
      [
        stat({
          date: "2026-10-19",
          planned: 2,
          completed: 1,
          avgPd: 6,
          avgAd: 9,
          hardTotal: 1,
          hardCompleted: 1,
        }),
        stat({
          date: "2026-10-25",
          planned: 1,
          completed: 1,
          avgPd: 3,
          avgAd: 4,
        }),
      ],
      "2026-10-19",
    );

    expect(rows).toHaveLength(7);
    expect(rows[0]?.label).toBe("Mon 19");
    expect(rows[0]?.completed).toBe(1);
    expect(rows[1]?.planned).toBe(0);
    expect(rows[1]?.avgPd).toBeNull();
    expect(rows[6]?.key).toBe("2026-10-25");
    expect(rows[6]?.avgAd).toBe(4);
  });

  test("aggregates weeks with weighted averages", () => {
    const rows = buildWeekBuckets([
      stat({
        date: "2026-10-19",
        planned: 2,
        completed: 1,
        avgPd: 6,
        avgAd: 9,
        hardTotal: 1,
        hardCompleted: 1,
      }),
      stat({
        date: "2026-10-20",
        planned: 2,
        completed: 2,
        avgPd: 8,
        avgAd: 7,
        hardTotal: 2,
        hardCompleted: 1,
      }),
      stat({
        date: "2026-10-27",
        planned: 1,
        completed: 0,
        avgPd: 5,
        avgAd: null,
      }),
    ]);

    expect(rows).toHaveLength(2);
    expect(rows[0]?.label).toBe("Week of Oct 19");
    expect(rows[0]?.planned).toBe(4);
    expect(rows[0]?.completed).toBe(3);
    expect(rows[0]?.avgPd).toBe(7);
    expect(rows[0]?.avgAd).toBeCloseTo(23 / 3, 10);
    expect(rows[0]?.hardTotal).toBe(3);
    expect(rows[0]?.hardCompleted).toBe(2);

    expect(rows[1]?.label).toBe("Week of Oct 26");
    expect(rows[1]?.planned).toBe(1);
    expect(rows[1]?.avgAd).toBeNull();
  });

  test("aggregates months in chronological order", () => {
    const rows = buildMonthBuckets([
      stat({ date: "2026-11-02", planned: 1, completed: 1, avgPd: 8, avgAd: 6 }),
      stat({ date: "2026-09-30", planned: 1, completed: 0, avgPd: 4 }),
      stat({ date: "2026-11-20", planned: 3, completed: 1, avgPd: 6, avgAd: 10 }),
    ]);

    expect(rows.map((row) => row.label)).toEqual(["Sep 2026", "Nov 2026"]);
    expect(rows[0]?.planned).toBe(1);
    expect(rows[1]?.planned).toBe(4);
    expect(rows[1]?.completed).toBe(2);
    expect(rows[1]?.avgPd).toBe(6.5);
    expect(rows[1]?.avgAd).toBe(8);
  });

  test("formats headline numbers", () => {
    expect(completionRate(4, 3)).toBe(0.75);
    expect(completionRate(0, 0)).toBe(0);
    expect(formatPercent(0.756)).toBe("76%");
    expect(formatAverage(7.25)).toBe("7.3");
    expect(formatAverage(null)).toBe("—");
    expect(formatGap(1.2)).toBe("+1.2");
    expect(formatGap(-0.5)).toBe("-0.5");
    expect(formatGap(0)).toBe("0.0");
    expect(formatGap(null)).toBe("—");
  });

  test("classifies calibration gaps", () => {
    expect(gapTone(null)).toBe("unknown");
    expect(gapTone(0.9)).toBe("harder");
    expect(gapTone(-0.9)).toBe("easier");
    expect(gapTone(0.1)).toBe("even");
    expect(gapLabel(0.9)).toBe("Felt harder than expected");
    expect(gapLabel(-0.9)).toBe("Felt easier than expected");
    expect(gapLabel(0)).toBe("Matched expectations");
    expect(gapLabel(null)).toBe("Not enough data");
  });
});
