import { Clock3, Hash, MapPin, Pencil } from "lucide-react";

import type { Task } from "../api/types";
import { DifficultyBadge } from "./DifficultyBadge";

interface TaskListProps {
  tasks: Task[];
  pendingId: number | null;
  onToggle: (task: Task) => void;
  onEdit: (task: Task) => void;
  onEditAd: (task: Task) => void;
}

function PreviewValue({ value }: { value: string }) {
  if (!value) {
    return <span className="muted">—</span>;
  }
  return <span>{value}</span>;
}

function TaskCheckbox({
  task,
  pending,
  onToggle,
}: {
  task: Task;
  pending: boolean;
  onToggle: (task: Task) => void;
}) {
  return (
    <input
      type="checkbox"
      className="task-checkbox"
      checked={task.completed}
      disabled={pending}
      onChange={() => onToggle(task)}
      aria-label={`${task.completed ? "Mark incomplete" : "Mark complete"}: ${task.what}`}
    />
  );
}

export function TaskTable({ tasks, pendingId, onToggle, onEdit, onEditAd }: TaskListProps) {
  return (
    <div className="task-table-wrap desktop-only">
      <table className="task-table">
        <thead>
          <tr>
            <th className="col-check" scope="col">
              <span className="sr-only">Done</span>
            </th>
            <th scope="col">What</th>
            <th scope="col">How much</th>
            <th scope="col">When</th>
            <th scope="col">Where</th>
            <th className="col-difficulty" scope="col">
              PD
            </th>
            <th className="col-difficulty" scope="col">
              AD
            </th>
            <th className="col-actions" scope="col">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {tasks.map((task) => {
            const pending = pendingId === task.id;
            return (
              <tr
                key={task.id}
                className={`${task.completed ? "completed" : ""}${pending ? " pending" : ""}`}
              >
                <td className="col-check">
                  <TaskCheckbox task={task} pending={pending} onToggle={onToggle} />
                </td>
                <td className="col-what">
                  <span className="task-title">{task.what}</span>
                </td>
                <td>
                  <PreviewValue value={task.howMuch} />
                </td>
                <td>
                  <PreviewValue value={task.when} />
                </td>
                <td>
                  <PreviewValue value={task.where} />
                </td>
                <td className="col-difficulty">
                  <DifficultyBadge kind="pd" value={task.perceivedDifficulty} />
                </td>
                <td className="col-difficulty">
                  <DifficultyBadge
                    kind="ad"
                    value={task.actualDifficulty}
                    onClick={task.completed ? () => onEditAd(task) : undefined}
                  />
                </td>
                <td className="col-actions">
                  <button
                    type="button"
                    className="icon-button row-action"
                    onClick={() => onEdit(task)}
                    aria-label={`Edit ${task.what}`}
                    title="Edit task"
                  >
                    <Pencil size={16} />
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function TaskCards({ tasks, pendingId, onToggle, onEdit, onEditAd }: TaskListProps) {
  return (
    <div className="task-cards mobile-only">
      {tasks.map((task) => {
        const pending = pendingId === task.id;
        return (
          <article
            key={task.id}
            className={`task-card${task.completed ? " completed" : ""}${pending ? " pending" : ""}`}
          >
            <div className="task-card-top">
              <TaskCheckbox task={task} pending={pending} onToggle={onToggle} />
              <button
                type="button"
                className="task-card-title"
                onClick={() => onEdit(task)}
                aria-label={`Edit ${task.what}`}
              >
                {task.what}
              </button>
              <button
                type="button"
                className="icon-button row-action"
                onClick={() => onEdit(task)}
                aria-label={`Edit ${task.what}`}
              >
                <Pencil size={16} />
              </button>
            </div>

            {task.howMuch || task.when || task.where ? (
              <div className="task-card-meta">
                {task.howMuch ? (
                  <span>
                    <Hash size={14} aria-hidden="true" />
                    {task.howMuch}
                  </span>
                ) : null}
                {task.when ? (
                  <span>
                    <Clock3 size={14} aria-hidden="true" />
                    {task.when}
                  </span>
                ) : null}
                {task.where ? (
                  <span>
                    <MapPin size={14} aria-hidden="true" />
                    {task.where}
                  </span>
                ) : null}
              </div>
            ) : null}

            <div className="task-card-difficulties">
              <div className="task-difficulty-item">
                <span className="task-difficulty-label">Perceived</span>
                <DifficultyBadge kind="pd" value={task.perceivedDifficulty} showKind />
              </div>
              <div className="task-difficulty-item">
                <span className="task-difficulty-label">Actual</span>
                <DifficultyBadge
                  kind="ad"
                  value={task.actualDifficulty}
                  showKind
                  onClick={task.completed ? () => onEditAd(task) : undefined}
                />
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}
