import {
  addDays,
  addMonths,
  addWeeks,
  endOfMonth,
  endOfWeek,
  format,
  parseISO,
  startOfMonth,
  startOfWeek,
} from "date-fns";

export const DATE_KEY_FORMAT = "yyyy-MM-dd";

export const weekdayLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
export const weekdayLabelsShort = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

export function toDateKey(date: Date): string {
  return format(date, DATE_KEY_FORMAT);
}

export function fromDateKey(key: string): Date {
  return parseISO(key);
}

export function todayKey(): string {
  return toDateKey(new Date());
}

export function addDaysKey(key: string, days: number): string {
  return toDateKey(addDays(parseISO(key), days));
}

export function addWeeksKey(key: string, weeks: number): string {
  return toDateKey(addWeeks(parseISO(key), weeks));
}

export function addMonthsKey(key: string, months: number): string {
  return toDateKey(addMonths(parseISO(key), months));
}

export function isValidDateKey(key: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) {
    return false;
  }
  const parsed = parseISO(key);
  return !Number.isNaN(parsed.getTime()) && toDateKey(parsed) === key;
}

export function longDayLabel(key: string): string {
  return format(parseISO(key), "EEEE, MMMM d, yyyy");
}

export function shortDayLabel(key: string): string {
  return format(parseISO(key), "EEE d");
}

export function dayOfWeekLabel(key: string): string {
  return format(parseISO(key), "EEEE");
}

export function monthTitle(date: Date): string {
  return format(date, "MMMM yyyy");
}

export function shortMonthTitle(date: Date): string {
  return format(date, "MMM yyyy");
}

export interface DateRange {
  from: string;
  to: string;
}

export function getWeekRange(key: string): DateRange {
  const date = parseISO(key);
  return {
    from: toDateKey(startOfWeek(date, { weekStartsOn: 1 })),
    to: toDateKey(endOfWeek(date, { weekStartsOn: 1 })),
  };
}

export function getMonthRange(key: string): DateRange {
  const date = parseISO(key);
  return {
    from: toDateKey(startOfMonth(date)),
    to: toDateKey(endOfMonth(date)),
  };
}

export function getCalendarDays(month: Date): Date[] {
  const start = startOfWeek(startOfMonth(month), { weekStartsOn: 1 });
  return Array.from({ length: 42 }, (_, index) => addDays(start, index));
}

export function getCalendarGridRange(month: Date): DateRange {
  const days = getCalendarDays(month);
  return {
    from: toDateKey(days[0]!),
    to: toDateKey(days[days.length - 1]!),
  };
}

export function rangeLabel(range: DateRange): string {
  const from = parseISO(range.from);
  const to = parseISO(range.to);
  const sameYear = format(from, "yyyy") === format(to, "yyyy");

  if (!sameYear) {
    return `${format(from, "MMM d, yyyy")} – ${format(to, "MMM d, yyyy")}`;
  }
  if (format(from, "MM") !== format(to, "MM")) {
    return `${format(from, "MMM d")} – ${format(to, "MMM d, yyyy")}`;
  }
  return `${format(from, "MMM d")} – ${format(to, "d, yyyy")}`;
}

export function pathForDate(key: string, today: string): string {
  if (key === today) return "/today";
  if (key === addDaysKey(today, 1)) return "/tomorrow";
  return `/day/${key}`;
}
