import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { AlertCircle, Check, Trash2, UserPlus, Users } from "lucide-react";
import { useState } from "react";
import { useMembersContext } from "../context/MembersContext";

interface MemberManagerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MemberManager: React.FC<MemberManagerProps> = ({
  isOpen,
  onClose,
}) => {
  const {
    members,
    addMember,
    removeMember,
    error: contextError,
  } = useMembersContext();
  const [newName, setNewName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    const trimmed = newName.trim();
    if (!trimmed) {
      setLocalError("Member name cannot be blank.");
      return;
    }

    setSubmitting(true);
    const { error } = await addMember(trimmed);
    setSubmitting(false);

    if (error) {
      setLocalError(error.message);
    } else {
      setNewName("");
    }
  };

  const handleRemoveMember = async (id: string, name: string) => {
    if (
      window.confirm(
        `Are you sure you want to remove ${name} from active department members?`,
      )
    ) {
      await removeMember(id);
    }
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="sm:max-w-lg flex flex-col max-h-[85vh]">
        <DialogHeader>
          <div className="flex items-center space-x-3 mb-2">
            <div className="p-2.5 bg-primary/10 border border-primary/20 text-primary rounded-xl shrink-0">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold font-heading">
                Department Roster
              </DialogTitle>
              <DialogDescription className="text-xs">
                Manage active members for automated scheduling
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {(localError || contextError) && (
          <div className="mb-4 p-3 bg-destructive/15 border border-destructive/30 rounded-xl flex items-center space-x-2 text-xs text-destructive">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{localError || contextError}</span>
          </div>
        )}

        {/* Add Member Form */}
        <form onSubmit={handleAddMember} className="flex gap-2 mb-4">
          <Input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="New member name..."
            className="flex-1 text-sm"
          />
          <Button
            type="submit"
            disabled={submitting || !newName.trim()}
            className="gap-1.5 shrink-0 text-xs font-semibold"
          >
            <UserPlus className="w-4 h-4" />
            <span>Add</span>
          </Button>
        </form>

        {/* Roster List */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar min-h-[150px]">
          <div className="text-xs font-semibold text-muted-foreground px-1 mb-2">
            Active Members ({members.length})
          </div>

          {members.length === 0 ? (
            <div className="py-8 text-center text-xs text-muted-foreground border border-dashed border-border rounded-xl">
              No active department members found. Add one above.
            </div>
          ) : (
            members.map((member) => (
              <div
                key={member.id}
                className="flex items-center justify-between p-3 bg-background/60 border border-border rounded-xl hover:border-primary/50 transition-all"
              >
                <span className="font-medium text-sm">{member.name}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleRemoveMember(member.id, member.name)}
                  className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                  title={`Remove ${member.name}`}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <DialogFooter className="pt-4 border-t border-border mt-4">
          <Button onClick={onClose} className="gap-1.5 text-xs font-semibold">
            <Check className="w-4 h-4" />
            <span>Done</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
