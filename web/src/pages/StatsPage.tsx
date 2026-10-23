import { useEffect, useState } from "react";
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";

import { errorMessage } from "../api/client";
import { EmptyState, ErrorState, PageLoader } from "../components/States";
import { useStats } from "../hooks/useTasks";
import { useToday } from "../hooks/useToday";
import {
  addMonthsKey,
  addWeeksKey,
  getMonthRange,
  getWeekRange,
  rangeLabel,
} from "../lib/date";
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
  type BreakdownRow,
} from "../lib/stats";

type StatsTab = "week" | "month" | "all";

const tabLabels: Record<StatsTab, string> = {
  week: "This week",
  month: "This month",
  all: "All time",
};

function StatCard({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: string | number;
  sub: string;
  tone?: string;
}) {
  return (
    <div className="stat-card">
      <span className="stat-label">{label}</span>
      <span className={`stat-value${tone ? ` ${tone}` : ""}`}>{value}</span>
      <span className="stat-sub">{sub}</span>
    </div>
  );
}

function BreakdownList({ rows }: { rows: BreakdownRow[] }) {
  return (
    <div className="breakdown">
      {rows.map((row) => {
        const rate = completionRate(row.planned, row.completed);
        return (
          <div key={row.key} className={`breakdown-row${row.planned === 0 ? " empty" : ""}`}>
            <div className="breakdown-label">
              <span>{row.label}</span>
              {row.planned === 0 ? <small>No tasks</small> : null}
            </div>
            <div className="breakdown-bar" aria-hidden="true">
              <div className="breakdown-fill" style={{ width: `${Math.min(100, rate * 100)}%` }} />
            </div>
            <div className="breakdown-numbers">
              <strong>
                {row.completed}/{row.planned}
              </strong>
              <span>{formatPercent(rate)}</span>
            </div>
            <div className="breakdown-difficulty">
              <span className="muted">PD → AD</span>
              <strong>
                {formatAverage(row.avgPd)}
                <ArrowRight size={13} aria-hidden="true" />
                {formatAverage(row.avgAd)}
              </strong>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function StatsPage() {
  const today = useToday();
  const [tab, setTab] = useState<StatsTab>("week");
  const [anchor, setAnchor] = useState(today);

  // Keep the selected range aligned with the real date if the app is left open
  // across midnight.
  useEffect(() => {
    setAnchor(today);
  }, [today]);

  const range =
    tab === "week" ? getWeekRange(anchor) : tab === "month" ? getMonthRange(anchor) : null;
  const stats = useStats(range?.from, range?.to);

  const currentRange = tab === "week" ? getWeekRange(today) : getMonthRange(today);
  const atCurrentRange = range?.from === currentRange.from;

  function changeTab(nextTab: StatsTab) {
    setTab(nextTab);
    setAnchor(today);
  }

  function shiftRange(direction: -1 | 1) {
    if (tab === "week") {
      setAnchor(addWeeksKey(anchor, direction));
    } else if (tab === "month") {
      setAnchor(addMonthsKey(anchor, direction));
    }
  }

  const summary = stats.data?.summary;
  const rate = summary ? completionRate(summary.planned, summary.completed) : 0;
  const gapToneValue = gapTone(summary?.gap ?? null);

  const rows = stats.data
    ? tab === "week" && range
      ? buildWeekBreakdown(stats.data.daily, range.from)
      : tab === "month"
        ? buildWeekBuckets(stats.data.daily)
        : buildMonthBuckets(stats.data.daily)
    : [];

  return (
    <div className="page stats-page">
      <header className="page-header">
        <div>
          <span className="eyebrow">Stats</span>
          <h1>CALIBRATION</h1>
          <p className="page-subtitle">Perceived difficulty vs. what the work actually took.</p>
        </div>
      </header>

      <div className="stats-tabs" role="tablist" aria-label="Stats range">
        {(Object.keys(tabLabels) as StatsTab[]).map((value) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={tab === value}
            className={`stats-tab${tab === value ? " active" : ""}`}
            onClick={() => changeTab(value)}
          >
            {tabLabels[value]}
          </button>
        ))}
      </div>

      <div className="range-nav">
        {tab !== "all" ? (
          <>
            <div className="range-nav-label">
              <span className="eyebrow">{tab === "week" ? "Week" : "Month"}</span>
              <strong>{range ? rangeLabel(range) : ""}</strong>
            </div>
            <div className="range-nav-controls">
              <button
                type="button"
                className="icon-button"
                onClick={() => shiftRange(-1)}
                aria-label={`Previous ${tab}`}
              >
                <ChevronLeft size={20} />
              </button>
              <button
                type="button"
                className="icon-button"
                onClick={() => shiftRange(1)}
                aria-label={`Next ${tab}`}
              >
                <ChevronRight size={20} />
              </button>
              {!atCurrentRange ? (
                <button
                  type="button"
                  className="button ghost small"
                  onClick={() => setAnchor(today)}
                >
                  This {tab}
                </button>
              ) : null}
            </div>
          </>
        ) : (
          <div className="range-nav-label">
            <span className="eyebrow">All time</span>
            <strong>Every task you have recorded</strong>
          </div>
        )}
      </div>

      {stats.isLoading ? (
        <PageLoader label="Loading stats…" />
      ) : stats.isError ? (
        <ErrorState
          title="Could not load stats"
          message={errorMessage(stats.error)}
          onRetry={() => void stats.refetch()}
        />
      ) : summary ? (
        <>
          <div className="stats-grid">
            <StatCard
              label="Planned"
              value={summary.planned}
              sub={`${summary.planned === 1 ? "task" : "tasks"} in this range`}
            />
            <StatCard
              label="Completed"
              value={summary.completed}
              sub={`${summary.completed === 1 ? "task" : "tasks"} finished`}
            />
            <StatCard
              label="Completion"
              value={formatPercent(rate)}
              sub={`${summary.completed} of ${summary.planned}`}
            />
            <StatCard
              label="Avg PD"
              value={formatAverage(summary.avgPd)}
              sub="all planned tasks"
            />
            <StatCard
              label="Avg AD"
              value={formatAverage(summary.avgAd)}
              sub="completed tasks only"
            />
            <StatCard
              label="Calibration"
              value={formatGap(summary.gap)}
              sub={gapLabel(summary.gap)}
              tone={`gap-${gapToneValue}`}
            />
            <StatCard
              label="Hard tasks"
              value={`${summary.hardCompleted}/${summary.hardTotal}`}
              sub="PD 7 or higher"
            />
            <StatCard
              label="Active days"
              value={summary.activeDays}
              sub={`${summary.activeDays === 1 ? "day" : "days"} with tasks`}
            />
          </div>

          <section className="breakdown-section">
            <div className="section-heading">
              <div>
                <span className="eyebrow">Breakdown</span>
                <h2>{tab === "week" ? "Day by day" : tab === "month" ? "Week by week" : "Month by month"}</h2>
              </div>
              <p className="section-note">
                PD covers all planned tasks. AD and calibration use completed tasks only.
              </p>
            </div>

            {rows.length === 0 || rows.every((row) => row.planned === 0) ? (
              <EmptyState
                title="No tasks in this range"
                message="Add tasks from Today or from a day on the calendar, then come back here."
              />
            ) : (
              <BreakdownList rows={rows} />
            )}
          </section>
        </>
      ) : null}
    </div>
  );
}
