import { ArrowRight, ArrowUpRight } from "lucide-react";
import { Link } from "react-router-dom";

import { useStats } from "../hooks/useTasks";
import { getWeekRange, rangeLabel } from "../lib/date";
import {
  completionRate,
  formatAverage,
  formatGap,
  formatPercent,
  gapTone,
} from "../lib/stats";

export function WeekSummaryCard({ today }: { today: string }) {
  const week = getWeekRange(today);
  const stats = useStats(week.from, week.to);

  if (stats.isLoading) {
    return null;
  }

  if (stats.isError || !stats.data) {
    return (
      <section className="week-summary" aria-label="This week summary">
        <div className="week-summary-head">
          <span className="eyebrow">This week</span>
          <span className="muted small">{rangeLabel(week)}</span>
        </div>
        <p className="muted">Stats are unavailable right now.</p>
      </section>
    );
  }

  const summary = stats.data.summary;
  const rate = completionRate(summary.planned, summary.completed);
  const tone = gapTone(summary.gap);

  return (
    <section className="week-summary" aria-label="This week summary">
      <div className="week-summary-head">
        <span className="eyebrow">This week</span>
        <Link className="text-link" to="/stats">
          Full stats
          <ArrowUpRight size={14} />
        </Link>
      </div>

      <div className="week-summary-grid">
        <div className="week-stat">
          <span className="week-stat-value">
            {summary.completed}
            <small>/{summary.planned}</small>
          </span>
          <span className="week-stat-label">done</span>
        </div>
        <div className="week-stat">
          <span className="week-stat-value">{formatPercent(rate)}</span>
          <span className="week-stat-label">completion</span>
        </div>
        <div className="week-stat">
          <span className="week-stat-value week-stat-difficulty">
            {formatAverage(summary.avgPd)}
            <ArrowRight size={14} aria-hidden="true" />
            {formatAverage(summary.avgAd)}
          </span>
          <span className="week-stat-label">PD → AD</span>
        </div>
        <div className="week-stat">
          <span className={`week-stat-value gap-${tone}`}>{formatGap(summary.gap)}</span>
          <span className="week-stat-label">calibration</span>
        </div>
      </div>

      <div className="progress-track" aria-hidden="true">
        <div className="progress-fill" style={{ width: `${Math.min(100, rate * 100)}%` }} />
      </div>
      <p className="week-summary-footnote">
        {rangeLabel(week)} · {summary.hardCompleted}/{summary.hardTotal} hard{" "}
        {summary.hardTotal === 1 ? "task" : "tasks"} done
      </p>
    </section>
  );
}
