import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useDroppable } from "@dnd-kit/core";
import { Lock, Unlock, X } from "lucide-react";
import { getMemberColor } from "../lib/memberColors";
import { cn } from "../lib/utils";
import { Assignment, Member } from "../types";

interface DayCellProps {
  date: string;
  assignments: Assignment[];
  memberMap: Record<string, Member>;
  maxSlots: number;
  isAdmin: boolean;
  activeDragMemberId: string | null;
  onClearAssignment: (assignmentId: string) => void;
  onToggleLock: (assignmentId: string) => void;
  formatDate: (d: string) => string;
}

export const DayCell: React.FC<DayCellProps> = ({
  date,
  assignments,
  memberMap,
  maxSlots,
  isAdmin,
  activeDragMemberId,
  onClearAssignment,
  onToggleLock,
  formatDate,
}) => {
  const filledAssignments = assignments.filter((a) => a.member_id !== null);
  const isFull = filledAssignments.length >= maxSlots;

  // The drop zone id is the date string
  const { setNodeRef, isOver } = useDroppable({
    id: date,
    disabled: !isAdmin,
    data: { date, assignments, maxSlots },
  });

  // Determine if the active drag member is already in this day (duplicate)
  const activeMemberAlreadyHere =
    activeDragMemberId !== null &&
    assignments.some((a) => a.member_id === activeDragMemberId);

  const showOverlay = isOver && isAdmin && activeDragMemberId !== null;
  const overlayIsBlocked = showOverlay && (isFull || activeMemberAlreadyHere);

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "relative flex flex-col gap-1.5 p-2 transition-all duration-150 min-h-28",
        isOver && !overlayIsBlocked
          ? "bg-primary/10 border border-primary/60 ring-1 ring-primary/30"
          : "border border-border/60 bg-background/50",
        !isAdmin && "pointer-events-none",
      )}
    >
      {/* Date label */}
      <span className="text-xs font-semibold text-muted-foreground mb-0.5">
        {formatDate(date)}
      </span>

      {/* Assigned member badges */}
      <div className="flex flex-wrap gap-1.5">
        {assignments.map((assignment) => {
          const member = assignment.member_id
            ? memberMap[assignment.member_id]
            : null;
          if (!member) return null;
          const color = getMemberColor(member.id);
          return (
            <Badge
              key={assignment.id}
              variant="outline"
              className={cn(
                "flex rounded-md px-2 py-1.5 text-xs transition-all border min-h-fit",
                color.bg,
                color.text,
                color.border,
              )}
            >
              <span className="truncate leading-tight">{member.name}</span>
              <div className="flex items-center gap-0.5 shrink-0">
                {isAdmin && (
                  <Tooltip>
                    <TooltipTrigger>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onToggleLock(assignment.id)}
                        className="h-4 w-4 p-0 opacity-70 hover:opacity-100 hover:bg-black/10"
                      >
                        {assignment.locked ? (
                          <Lock className="w-3 h-3" />
                        ) : (
                          <Unlock className="w-3 h-3" />
                        )}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{assignment.locked ? "Unlock slot" : "Lock slot"}</p>
                    </TooltipContent>
                  </Tooltip>
                )}
                {isAdmin && !assignment.locked && (
                  <Tooltip>
                    <TooltipTrigger>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onClearAssignment(assignment.id)}
                        className="h-4 w-4 p-0 opacity-70 hover:opacity-100 hover:bg-black/10"
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Remove assignment</p>
                    </TooltipContent>
                  </Tooltip>
                )}
              </div>
            </Badge>
          );
        })}
      </div>

      {/* Blocked overlay on drag-over when full or duplicate */}
      {overlayIsBlocked && (
        <div className="absolute bg-red-500/20 inset-0 flex items-center justify-center text-center animate-in fade-in duration-150 z-10">
          <p>
            {activeMemberAlreadyHere ? "Already assigned today" : "Slot full"}
          </p>
        </div>
      )}
    </div>
  );
};
