import { describe, expect, test } from "bun:test";

import {
  addDaysKey,
  getCalendarDays,
  getCalendarGridRange,
  getMonthRange,
  getWeekRange,
  isValidDateKey,
  rangeLabel,
  toDateKey,
} from "./date";

describe("date helpers", () => {
  test("round-trips local date keys", () => {
    expect(toDateKey(new Date(2026, 9, 23))).toBe("2026-10-23");
    expect(isValidDateKey("2026-10-23")).toBe(true);
    expect(isValidDateKey("2024-02-29")).toBe(true);
  });

  test("rejects malformed and impossible dates", () => {
    expect(isValidDateKey("")).toBe(false);
    expect(isValidDateKey("23-10-2026")).toBe(false);
    expect(isValidDateKey("2026-2-03")).toBe(false);
    expect(isValidDateKey("2026-02-30")).toBe(false);
    expect(isValidDateKey("2026-13-01")).toBe(false);
  });

  test("adds days across month and year boundaries", () => {
    expect(addDaysKey("2026-10-23", 1)).toBe("2026-10-24");
    expect(addDaysKey("2026-10-31", 1)).toBe("2026-11-01");
    expect(addDaysKey("2026-03-01", -1)).toBe("2026-02-28");
    expect(addDaysKey("2026-12-31", 1)).toBe("2027-01-01");
  });

  test("uses Monday-start weeks", () => {
    expect(getWeekRange("2026-10-23")).toEqual({ from: "2026-10-19", to: "2026-10-25" });
    expect(getWeekRange("2026-10-19")).toEqual({ from: "2026-10-19", to: "2026-10-25" });
    expect(getWeekRange("2026-10-25")).toEqual({ from: "2026-10-19", to: "2026-10-25" });
    expect(getWeekRange("2026-10-26")).toEqual({ from: "2026-10-26", to: "2026-11-01" });
  });

  test("builds whole-month ranges", () => {
    expect(getMonthRange("2026-10-23")).toEqual({ from: "2026-10-01", to: "2026-10-31" });
    expect(getMonthRange("2026-02-14")).toEqual({ from: "2026-02-01", to: "2026-02-28" });
    expect(getMonthRange("2024-02-14")).toEqual({ from: "2024-02-01", to: "2024-02-29" });
  });

  test("builds a six-week calendar grid", () => {
    const days = getCalendarDays(new Date(2026, 9, 1));

    expect(days).toHaveLength(42);
    expect(toDateKey(days[0]!)).toBe("2026-09-28");
    expect(toDateKey(days[days.length - 1]!)).toBe("2026-11-08");
    expect(getCalendarGridRange(new Date(2026, 9, 1))).toEqual({
      from: "2026-09-28",
      to: "2026-11-08",
    });
  });

  test("labels ranges compactly", () => {
    expect(rangeLabel({ from: "2026-10-19", to: "2026-10-25" })).toBe("Oct 19 – 25, 2026");
    expect(rangeLabel({ from: "2026-09-28", to: "2026-10-04" })).toBe("Sep 28 – Oct 4, 2026");
    expect(rangeLabel({ from: "2026-12-28", to: "2027-01-03" })).toBe(
      "Dec 28, 2026 – Jan 3, 2027",
    );
  });
});
