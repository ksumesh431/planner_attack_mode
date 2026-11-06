import { useEffect, useState } from "react";
import { ArrowRight, Copy } from "lucide-react";

import { errorMessage } from "../api/client";
import type { Task } from "../api/types";
import { useCloneTasks } from "../hooks/useTasks";
import { addDaysKey, isValidDateKey, mediumDayLabel } from "../lib/date";
import { Sheet } from "./Sheet";
import { useToast } from "./Toast";

type TargetMode = "next" | "custom";

interface CloneTasksSheetProps {
  open: boolean;
  sourceDate: string;
  tasks: Task[];
  onClose: () => void;
}

export function CloneTasksSheet({ open, sourceDate, tasks, onClose }: CloneTasksSheetProps) {
  const nextDay = addDaysKey(sourceDate, 1);
  const [targetMode, setTargetMode] = useState<TargetMode>("next");
  const [customDate, setCustomDate] = useState(nextDay);
  const [error, setError] = useState<string | null>(null);
  const cloneTasks = useCloneTasks();
  const { showToast } = useToast();

  useEffect(() => {
    if (!open) return;
    setTargetMode("next");
    setCustomDate(nextDay);
    setError(null);
  }, [open, nextDay]);

  if (!open) return null;

  const taskCount = tasks.length;
  const targetDate = targetMode === "next" ? nextDay : customDate;
  const targetProblem =
    targetMode === "custom" && !isValidDateKey(customDate)
      ? "Choose a valid target date."
      : targetDate === sourceDate
        ? "Choose a date other than the source day."
        : null;

  async function handleClone() {
    if (targetProblem) {
      setError(targetProblem);
      return;
    }

    setError(null);
    try {
      const result = await cloneTasks.mutateAsync({ from: sourceDate, to: targetDate });
      showToast(
        result.cloned === 0
          ? "No tasks to clone."
          : `Cloned ${result.cloned} ${result.cloned === 1 ? "task" : "tasks"} to ${mediumDayLabel(targetDate)}.`,
        result.cloned === 0 ? "info" : "success",
      );
      onClose();
    } catch (cloneError) {
      setError(errorMessage(cloneError));
    }
  }

  const footer = (
    <>
      <div />
      <div className="sheet-footer-actions">
        <button
          type="button"
          className="button ghost"
          onClick={onClose}
          disabled={cloneTasks.isPending}
        >
          Cancel
        </button>
        <button
          type="button"
          className="button primary"
          onClick={handleClone}
          disabled={cloneTasks.isPending || targetProblem !== null}
        >
          <Copy size={16} />
          {cloneTasks.isPending ? "Cloning…" : "Clone tasks"}
        </button>
      </div>
    </>
  );

  return (
    <Sheet
      open
      title="Clone tasks"
      subtitle={`Copy the plan from ${mediumDayLabel(sourceDate)} to another day.`}
      onClose={onClose}
      footer={footer}
    >
      <div className="clone-sheet">
        <p className="clone-summary">
          <strong>{taskCount}</strong> {taskCount === 1 ? "task" : "tasks"} from{" "}
          {mediumDayLabel(sourceDate)}
        </p>

        <div className="clone-options" role="group" aria-label="Clone target">
          <button
            type="button"
            className={`clone-option${targetMode === "next" ? " selected" : ""}`}
            aria-pressed={targetMode === "next"}
            onClick={() => setTargetMode("next")}
            disabled={cloneTasks.isPending}
          >
            <span className="clone-option-label">Next day</span>
            <span className="clone-option-date">
              {mediumDayLabel(nextDay)}
              <ArrowRight size={14} aria-hidden="true" />
            </span>
          </button>

          <button
            type="button"
            className={`clone-option${targetMode === "custom" ? " selected" : ""}`}
            aria-pressed={targetMode === "custom"}
            onClick={() => setTargetMode("custom")}
            disabled={cloneTasks.isPending}
          >
            <span className="clone-option-label">Custom date</span>
            <span className="clone-option-date">
              {targetMode === "custom" && isValidDateKey(customDate)
                ? mediumDayLabel(customDate)
                : "Pick a day"}
            </span>
          </button>
        </div>

        {targetMode === "custom" ? (
          <label className="field">
            <span className="field-label">Target date</span>
            <input
              type="date"
              value={customDate}
              onChange={(event) => setCustomDate(event.target.value)}
              disabled={cloneTasks.isPending}
            />
          </label>
        ) : null}

        <p className="field-hint">
          What, how much, when, where, and perceived difficulty are copied. Completion and actual
          difficulty are reset. Tasks are added alongside anything already on the target day.
        </p>

        {targetProblem ? (
          <p className="form-error" role="alert">
            {targetProblem}
          </p>
        ) : null}

        {error ? (
          <p className="form-error" role="alert">
            {error}
          </p>
        ) : null}
      </div>
    </Sheet>
  );
}
