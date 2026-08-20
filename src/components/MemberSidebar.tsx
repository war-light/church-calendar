import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { AlertCircle, Trash2, UserPlus, Users } from "lucide-react";
import React, { useMemo, useState } from "react";
import { useAssignmentsContext } from "../context/AssignmentsContext";
import { useMembersContext } from "../context/MembersContext";
import { getMemberColor } from "../lib/memberColors";

interface MemberSidebarProps {
  isAdmin: boolean;
}

export const MemberSidebar: React.FC<MemberSidebarProps> = ({ isAdmin }) => {
  const { members, addMember, removeMember } = useMembersContext();
  const { assignments } = useAssignmentsContext();
  const [newName, setNewName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dutyCounts = useMemo(() => {
    const map: Record<string, number> = {};
    assignments.forEach((a) => {
      if (a.member_id) map[a.member_id] = (map[a.member_id] || 0) + 1;
    });
    return map;
  }, [assignments]);

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!isAdmin) return;
    const trimmed = newName.trim();
    if (!trimmed) {
      setError("Please enter a member name.");
      return;
    }
    setSubmitting(true);
    const { error: addErr } = await addMember(trimmed);
    setSubmitting(false);
    if (addErr) {
      setError(addErr.message);
    } else {
      setNewName("");
    }
  };

  const handleRemoveMember = async (id: string, name: string) => {
    if (!isAdmin) return;
    if (window.confirm(`Remove ${name} from the active roster?`)) {
      await removeMember(id);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row gap-4">
        <div className="p-2 bg-primary/10 border border-primary/20 text-primary rounded-xl shrink-0">
          <Users className="w-5 h-5" />
        </div>
        <div>
          <CardTitle className="font-bold text-base font-heading">
            Department Roster
          </CardTitle>
          <p>
            {members.length} Active{" "}
            {members.length === 1 ? "Member" : "Members"}
          </p>
          {isAdmin && <span> · Drag to assign</span>}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {error && (
          <div className="p-2.5 bg-destructive/15 border border-destructive/30 rounded-xl text-xs text-destructive flex items-center space-x-1.5">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {isAdmin && (
          <form onSubmit={handleAddMember} className="flex gap-2 pt-1">
            <Input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Add new member..."
              className="flex-1 text-xs h-9"
            />
            <Button
              type="submit"
              size="sm"
              disabled={submitting || !newName.trim()}
              className="gap-1 shrink-0 h-9 rounded-xl text-xs font-semibold"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Add</span>
            </Button>
          </form>
        )}

        <div className="space-y-2 overflow-y-auto max-h-[540px] pr-1">
          {members.length === 0 ? (
            <div className="py-6 text-center text-xs text-muted-foreground border border-dashed border-border rounded-xl">
              No active members registered.
            </div>
          ) : (
            members.map((member) => {
              const count = dutyCounts[member.id] || 0;
              const color = getMemberColor(member.id);
              return (
                <DraggableMemberCard
                  key={member.id}
                  memberId={member.id}
                  name={member.name}
                  count={count}
                  isAdmin={isAdmin}
                  colorBg={color.bg}
                  colorText={color.text}
                  onRemove={() => handleRemoveMember(member.id, member.name)}
                />
              );
            })
          )}
        </div>
      </CardContent>
    </Card>
  );
};

interface DraggableMemberCardProps {
  memberId: string;
  name: string;
  count: number;
  isAdmin: boolean;
  colorBg: string;
  colorText: string;
  onRemove: () => void;
}

const DraggableMemberCard: React.FC<DraggableMemberCardProps> = ({
  memberId,
  name,
  count,
  isAdmin,
  colorBg,
  colorText,
  onRemove,
}) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: memberId,
      disabled: !isAdmin,
      data: { memberId },
    });

  const style = transform
    ? { transform: CSS.Translate.toString(transform) }
    : undefined;

  return (
    <Card
      ref={setNodeRef}
      style={style}
      {...(isAdmin ? listeners : {})}
      {...(isAdmin ? attributes : {})}
      className={`p-2.5 rounded-xl border transition-all group
        ${isDragging ? "opacity-40 scale-95 border-primary/50" : "border-border/80 hover:border-border"}
        ${isAdmin ? "cursor-grab active:cursor-grabbing" : "cursor-default"}
        bg-background/60`}
    >
      <CardContent className="flex items-center justify-between p-0">
        <div className="flex items-center space-x-2.5 min-w-0">
          <Avatar
            className={`w-7 h-7 text-xs font-bold shrink-0 ${colorBg} ${colorText}`}
          >
            <AvatarFallback className={`${colorBg} ${colorText}`}>
              {name.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="text-xs font-semibold truncate">{name}</p>
            <label className="text-[10px] text-muted-foreground font-mono">
              {count} {count === 1 ? "duty" : "duties"} this month
            </label>
          </div>
        </div>

        {isAdmin && (
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
            onPointerDown={(e) => e.stopPropagation()}
            className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg opacity-0 group-hover:opacity-100 transition-all ml-2 shrink-0"
            title={`Remove ${name}`}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        )}
      </CardContent>
    </Card>
  );
};
