import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { format, isSameMonth, startOfMonth } from "date-fns";
import { useNavigate } from "react-router-dom";

import { errorMessage } from "../api/client";
import { ErrorState, PageLoader } from "../components/States";
import { useCalendar } from "../hooks/useTasks";
import { useToday } from "../hooks/useToday";
import {
  getCalendarDays,
  getCalendarGridRange,
  longDayLabel,
  monthTitle,
  toDateKey,
  weekdayLabels,
  weekdayLabelsShort,
} from "../lib/date";
import {
  completionRate,
  formatAverage,
  formatPercent,
} from "../lib/stats";

export function CalendarPage() {
  const today = useToday();
  const navigate = useNavigate();
  const [month, setMonth] = useState(() => startOfMonth(new Date()));

  const gridRange = getCalendarGridRange(month);
  const gridDays = getCalendarDays(month);
  const calendar = useCalendar(gridRange.from, gridRange.to);
  const dayMap = new Map((calendar.data ?? []).map((day) => [day.date, day]));

  const monthDays = (calendar.data ?? []).filter((day) => isSameMonth(new Date(`${day.date}T00:00:00`), month));
  const monthTotal = monthDays.reduce((total, day) => total + day.total, 0);
  const monthCompleted = monthDays.reduce((total, day) => total + day.completed, 0);
  const monthRate = completionRate(monthTotal, monthCompleted);
  const isCurrentMonth = monthTitle(month) === monthTitle(new Date(`${today}T00:00:00`));

  return (
    <div className="page calendar-page">
      <header className="page-header calendar-header">
        <div>
          <span className="eyebrow">Calendar</span>
          <h1>MONTH AT A GLANCE</h1>
          <p className="page-subtitle">{monthTitle(month)}</p>
        </div>

        <div className="calendar-controls">
          <button
            type="button"
            className="icon-button"
            onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}
            aria-label="Previous month"
            title="Previous month"
          >
            <ChevronLeft size={20} />
          </button>
          <button
            type="button"
            className="icon-button"
            onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}
            aria-label="Next month"
            title="Next month"
          >
            <ChevronRight size={20} />
          </button>
          {!isCurrentMonth ? (
            <button
              type="button"
              className="button secondary small"
              onClick={() => setMonth(startOfMonth(new Date()))}
            >
              This month
            </button>
          ) : null}
        </div>
      </header>

      {calendar.isLoading ? (
        <PageLoader label="Loading calendar…" />
      ) : calendar.isError ? (
        <ErrorState
          title="Could not load the calendar"
          message={errorMessage(calendar.error)}
          onRetry={() => void calendar.refetch()}
        />
      ) : (
        <>
          <div className="month-summary">
            <div className="month-summary-copy">
              <span className="eyebrow">{isCurrentMonth ? "This month" : "Month total"}</span>
              <strong>
                {monthCompleted}/{monthTotal} {monthTotal === 1 ? "task" : "tasks"} done
              </strong>
            </div>
            <div className="month-summary-progress">
              <div className="progress-track">
                <div
                  className="progress-fill"
                  style={{ width: `${Math.min(100, monthRate * 100)}%` }}
                />
              </div>
              <span>{formatPercent(monthRate)}</span>
            </div>
          </div>

          <div className="calendar">
            <div className="calendar-weekdays" aria-hidden="true">
              {weekdayLabels.map((label, index) => (
                <div key={label} className="calendar-weekday">
                  <span className="calendar-weekday-full">{label}</span>
                  <span className="calendar-weekday-short">{weekdayLabelsShort[index]}</span>
                </div>
              ))}
            </div>

            <div className="calendar-grid">
              {gridDays.map((day) => {
                const key = toDateKey(day);
                const summary = dayMap.get(key);
                const insideMonth = isSameMonth(day, month);
                const isToday = key === today;
                const rate = summary ? completionRate(summary.total, summary.completed) : 0;
                const complete = Boolean(summary && summary.total > 0 && summary.completed === summary.total);
                const partial = Boolean(summary && summary.completed > 0 && !complete);

                const classes = [
                  "calendar-cell",
                  insideMonth ? "" : "outside",
                  isToday ? "today" : "",
                  complete ? "complete" : "",
                  partial ? "partial" : "",
                ]
                  .filter(Boolean)
                  .join(" ");

                return (
                  <button
                    key={key}
                    type="button"
                    className={classes}
                    onClick={() => navigate(`/day/${key}`)}
                    aria-label={`${longDayLabel(key)}${
                      summary ? `, ${summary.completed} of ${summary.total} tasks done` : ", no tasks"
                    }`}
                  >
                    <span className="calendar-date">{format(day, "d")}</span>
                    {summary ? (
                      <span className="calendar-cell-stats">
                        <span className="calendar-count">
                          {summary.completed}/{summary.total}
                        </span>
                        <span className="calendar-mini-bar" aria-hidden="true">
                          <span style={{ width: `${Math.min(100, rate * 100)}%` }} />
                        </span>
                        <span className="calendar-difficulty desktop-only">
                          PD {formatAverage(summary.avgPd)} → AD {formatAverage(summary.avgAd)}
                        </span>
                      </span>
                    ) : (
                      <span className="calendar-empty" aria-hidden="true" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <p className="calendar-legend">
            Each cell shows <strong>completed / planned</strong>. Tap a day to open its task list.
          </p>
        </>
      )}
    </div>
  );
}
