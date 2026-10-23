import { useState } from "react";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";

import { errorMessage } from "../api/client";
import type { Task } from "../api/types";
import { AdSheet } from "../components/AdSheet";
import { EmptyState, ErrorState, PageLoader } from "../components/States";
import { TaskForm } from "../components/TaskForm";
import { TaskCards, TaskTable } from "../components/TaskList";
import { useToast } from "../components/Toast";
import { WeekSummaryCard } from "../components/WeekSummaryCard";
import { useTasks, useUpdateTask } from "../hooks/useTasks";
import { useToday } from "../hooks/useToday";
import {
  addDaysKey,
  dayOfWeekLabel,
  isValidDateKey,
  longDayLabel,
  pathForDate,
} from "../lib/date";
import { NotFoundPage } from "./NotFoundPage";

type DayMode = "today" | "tomorrow" | "date";

export function DayPage({ mode }: { mode: DayMode }) {
  const today = useToday();
  const params = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const tomorrow = addDaysKey(today, 1);
  const dateKey =
    mode === "today" ? today : mode === "tomorrow" ? tomorrow : (params.date ?? "");
  const valid = isValidDateKey(dateKey);
  const isToday = valid && dateKey === today;
  const isTomorrow = valid && dateKey === tomorrow;

  const tasksQuery = useTasks(dateKey, valid);
  const updateTask = useUpdateTask();

  const [formOpen, setFormOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [adTask, setAdTask] = useState<Task | null>(null);
  const [pendingId, setPendingId] = useState<number | null>(null);

  if (!valid) {
    return <NotFoundPage />;
  }

  const tasks = tasksQuery.data ?? [];
  const completedCount = tasks.filter((task) => task.completed).length;

  function openCreate() {
    setEditingTask(null);
    setFormOpen(true);
  }

  function openEdit(task: Task) {
    setEditingTask(task);
    setFormOpen(true);
  }

  function closeForm() {
    setFormOpen(false);
    setEditingTask(null);
  }

  async function handleToggle(task: Task) {
    if (pendingId !== null) return;

    if (!task.completed && task.actualDifficulty === null) {
      setAdTask(task);
      return;
    }

    setPendingId(task.id);
    try {
      await updateTask.mutateAsync({
        id: task.id,
        input: { completed: !task.completed },
      });
      showToast(task.completed ? "Marked incomplete." : "Task completed.", task.completed ? "info" : "success");
    } catch (toggleError) {
      showToast(errorMessage(toggleError));
    } finally {
      setPendingId(null);
    }
  }

  return (
    <div className="page day-page">
      <header className="day-header">
        <div className="day-header-main">
          <span className="eyebrow">
            {isToday ? "Today" : isTomorrow ? "Tomorrow" : dayOfWeekLabel(dateKey)}
          </span>
          <h1>{isToday ? "ATTACK TODAY" : isTomorrow ? "ATTACK TOMORROW" : "ATTACK DAY"}</h1>
          <p className="day-date">{longDayLabel(dateKey)}</p>
        </div>

        <div className="day-controls">
          {isToday ? (
            <Link to="/tomorrow" className="button ghost small day-context-action">
              Plan tomorrow
            </Link>
          ) : (
            <button
              type="button"
              className="button secondary small day-context-action"
              onClick={() => navigate("/today")}
            >
              Today
            </button>
          )}
          <div className="date-stepper">
            <button
              type="button"
              className="icon-button"
              onClick={() => navigate(pathForDate(addDaysKey(dateKey, -1), today))}
              aria-label="Previous day"
              title="Previous day"
            >
              <ChevronLeft size={20} />
            </button>
            <button
              type="button"
              className="icon-button"
              onClick={() => navigate(pathForDate(addDaysKey(dateKey, 1), today))}
              aria-label="Next day"
              title="Next day"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        </div>
      </header>

      <div className="list-toolbar">
        <p className="task-summary">
          {tasks.length === 0 ? (
            "No tasks yet"
          ) : (
            <>
              <strong>{tasks.length}</strong> {tasks.length === 1 ? "task" : "tasks"} ·{" "}
              <strong>{completedCount}</strong> done
            </>
          )}
        </p>
        {tasks.length > 0 ? (
          <button type="button" className="button primary" onClick={openCreate}>
            <Plus size={17} />
            Add task
          </button>
        ) : null}
      </div>

      {tasksQuery.isLoading ? (
        <PageLoader label="Loading tasks…" />
      ) : tasksQuery.isError ? (
        <ErrorState
          title="Could not load tasks"
          message={errorMessage(tasksQuery.error)}
          onRetry={() => void tasksQuery.refetch()}
        />
      ) : tasks.length === 0 ? (
        <EmptyState
          title="No tasks on this day"
          message="Break the work into what, how much, when, and where. Then give it a perceived difficulty."
          action={
            <button type="button" className="button primary" onClick={openCreate}>
              <Plus size={17} />
              Add the first task
            </button>
          }
        />
      ) : (
        <>
          <TaskTable
            tasks={tasks}
            pendingId={pendingId}
            onToggle={handleToggle}
            onEdit={openEdit}
            onEditAd={setAdTask}
          />
          <TaskCards
            tasks={tasks}
            pendingId={pendingId}
            onToggle={handleToggle}
            onEdit={openEdit}
            onEditAd={setAdTask}
          />
        </>
      )}

      {isToday && !tasksQuery.isLoading ? <WeekSummaryCard today={today} /> : null}

      <TaskForm open={formOpen} dateKey={dateKey} task={editingTask} onClose={closeForm} />
      <AdSheet task={adTask} onClose={() => setAdTask(null)} />
    </div>
  );
}
