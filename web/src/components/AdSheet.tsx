import { useEffect, useState } from "react";

import { errorMessage } from "../api/client";
import type { Task } from "../api/types";
import { useUpdateTask } from "../hooks/useTasks";
import { DifficultyPicker } from "./DifficultyPicker";
import { Sheet } from "./Sheet";
import { useToast } from "./Toast";

interface AdSheetProps {
  task: Task | null;
  onClose: () => void;
}

export function AdSheet({ task, onClose }: AdSheetProps) {
  const [actualDifficulty, setActualDifficulty] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const updateTask = useUpdateTask();
  const { showToast } = useToast();

  useEffect(() => {
    if (!task) return;
    setActualDifficulty(task.actualDifficulty);
    setError(null);
  }, [task]);

  if (!task) return null;

  const editing = task.completed && task.actualDifficulty !== null;

  async function handleSave() {
    if (!task) return;
    if (actualDifficulty === null) {
      setError("Pick an actual difficulty from 1 to 10.");
      return;
    }

    setError(null);
    try {
      await updateTask.mutateAsync({
        id: task.id,
        input: editing
          ? { actualDifficulty }
          : { completed: true, actualDifficulty },
      });
      showToast(editing ? "Actual difficulty updated." : "Task completed.", "success");
      onClose();
    } catch (saveError) {
      setError(errorMessage(saveError));
    }
  }

  const footer = (
    <>
      <div />
      <div className="sheet-footer-actions">
        <button type="button" className="button ghost" onClick={onClose} disabled={updateTask.isPending}>
          Cancel
        </button>
        <button
          type="button"
          className="button primary"
          onClick={handleSave}
          disabled={updateTask.isPending}
        >
          {updateTask.isPending ? "Saving…" : editing ? "Save rating" : "Complete task"}
        </button>
      </div>
    </>
  );

  return (
    <Sheet
      open
      title={editing ? "Actual difficulty" : "How hard was it?"}
      subtitle={task.what}
      onClose={onClose}
      footer={footer}
    >
      <div className="ad-sheet">
        <p className="ad-sheet-note">
          Perceived difficulty was <strong>{task.perceivedDifficulty}/10</strong>. How hard did it
          actually feel once you did it?
        </p>
        <DifficultyPicker
          label="Actual difficulty"
          value={actualDifficulty}
          onChange={setActualDifficulty}
          disabled={updateTask.isPending}
          hint="1 is trivial, 10 is brutal. Be honest — this is what makes the calibration stats useful."
        />
        {error ? (
          <p className="form-error" role="alert">
            {error}
          </p>
        ) : null}
      </div>
    </Sheet>
  );
}
