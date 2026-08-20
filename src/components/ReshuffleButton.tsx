import { Button } from "@/components/ui/button";
import { Dices, Loader2, Lock, Trash2, Unlock } from "lucide-react";
import React, { useState } from "react";
import { useAssignmentsContext } from "../context/AssignmentsContext";

interface ReshuffleButtonProps {
  isAdmin?: boolean;
}

export const ReshuffleButton: React.FC<ReshuffleButtonProps> = ({
  isAdmin = true,
}) => {
  const { assignments, regenerateMonth, clearMonth, setAllLocked, loading } =
    useAssignmentsContext();
  const [submittingRandomize, setSubmittingRandomize] = useState(false);
  const [submittingClear, setSubmittingClear] = useState(false);
  const [submittingLocked, setSubmittingLocked] = useState(false);

  const allLocked =
    assignments.length > 0 && assignments.every((a) => a.locked);

  const handleRandomize = async () => {
    if (!isAdmin) return;
    setSubmittingRandomize(true);
    const { error } = await regenerateMonth();
    setSubmittingRandomize(false);
    if (error) {
      alert(`Failed to randomize assignments: ${error.message}`);
    }
  };

  const handleClear = async () => {
    if (!isAdmin) return;
    setSubmittingClear(true);
    const { error } = await clearMonth();
    setSubmittingClear(false);
    if (error) {
      alert(`Failed to clear assignments: ${error.message}`);
    }
  };

  const handleLockToggle = async () => {
    if (!isAdmin) return;
    setSubmittingLocked(true);
    const { error } = await setAllLocked(!allLocked);
    setSubmittingLocked(false);
    if (error) {
      alert(
        `Failed to ${allLocked ? "unlock" : "lock"} assignments: ${error.message}`,
      );
    }
  };

  const isBusy =
    loading || submittingRandomize || submittingClear || submittingLocked;

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="secondary"
        onClick={handleLockToggle}
        disabled={isBusy || !isAdmin}
        title={
          isAdmin
            ? allLocked
              ? "Unlock all assignment slots for this month"
              : "Lock all assignment slots for this month"
            : "Enable Edit Mode to lock/unlock"
        }
        className="gap-1.5 rounded-xl text-xs font-semibold shrink-0 shadow-xs"
      >
        {submittingLocked ? (
          <Loader2 className="animate-spin text-amber-500" />
        ) : allLocked ? (
          <Unlock className="text-amber-500" />
        ) : (
          <Lock className="text-amber-500" />
        )}
        <span>
          {submittingLocked
            ? "Updating..."
            : allLocked
              ? "Unlock All"
              : "Lock All"}
        </span>
      </Button>

      <Button
        variant="secondary"
        onClick={handleRandomize}
        disabled={isBusy || !isAdmin}
        title={
          isAdmin
            ? "Randomize unlocked assignment slots for this month"
            : "Enable Edit Mode to randomize"
        }
        className="gap-1.5 rounded-xl text-xs font-semibold shrink-0 shadow-xs"
      >
        {submittingRandomize ? (
          <Loader2 className="animate-spin" />
        ) : (
          <Dices className="text-amber-500" />
        )}
        <span>{submittingRandomize ? "Randomizing..." : "Randomize"}</span>
      </Button>

      <Button
        variant="outline"
        onClick={handleClear}
        disabled={isBusy || !isAdmin}
        title={
          isAdmin
            ? "Clear all unlocked assignment slots for this month"
            : "Enable Edit Mode to clear"
        }
        className="bg-transparent rounded-xl"
      >
        {submittingClear ? (
          <Loader2 className="w-4 h-4 animate-spin text-destructive" />
        ) : (
          <Trash2 className="w-4 h-4 text-destructive" />
        )}
        <span>{submittingClear ? "Clearing..." : "Clear All"}</span>
      </Button>
    </div>
  );
};
