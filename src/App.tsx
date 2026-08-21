import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  Church,
  Edit3,
  KeyRound,
  Loader2,
  LogOut,
  Moon,
  Sun,
  Users,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { CalendarGrid } from "./components/CalendarGrid";
import { ExportButton } from "./components/ExportButton";
import { LoginForm } from "./components/LoginForm";
import { MemberManager } from "./components/MemberManager";
import { MemberSidebar } from "./components/MemberSidebar";
import { MonthPicker } from "./components/MonthPicker";
import { ReshuffleButton } from "./components/ReshuffleButton";
import { AppProviders } from "./context/AppProviders";
import { useAssignmentsContext } from "./context/AssignmentsContext";
import { useAuthContext } from "./context/AuthContext";
import { useMembersContext } from "./context/MembersContext";
import { useMonthsContext } from "./context/MonthsContext";
import { applyThemeClass, useThemeStore } from "./hooks/useThemeStore";
import { getMemberColor } from "./lib/memberColors";

function MainContent() {
  const { selectedMonth, loading: monthsLoading } = useMonthsContext();
  const { members, loading: membersLoading } = useMembersContext();
  const {
    assignments,
    updateAssignment,
    toggleLock,
    loading: assignmentsLoading,
  } = useAssignmentsContext();

  const { isAdmin: isAuthenticated, signOut } = useAuthContext();

  const { theme, toggleTheme } = useThemeStore();

  useEffect(() => {
    applyThemeClass(theme);
  }, [theme]);

  const [isEditMode, setIsEditMode] = useState<boolean>(false);
  const [isMemberManagerOpen, setIsMemberManagerOpen] = useState(false);
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [activeDragMemberId, setActiveDragMemberId] = useState<string | null>(
    null,
  );

  const gridRef = useRef<HTMLDivElement>(null);

  // Admin controls require a signed-in editor
  const isAdmin = isAuthenticated && isEditMode;

  useEffect(() => {
    if (!isAuthenticated) setIsEditMode(false);
  }, [isAuthenticated]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveDragMemberId(event.active.id as string);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveDragMemberId(null);
    if (!event.over || !isAdmin) return;

    const memberId = event.active.id as string;
    const droppableData = event.over.data.current as
      | {
          date: string;
          assignments: typeof assignments;
          maxSlots: number;
        }
      | undefined;

    if (!droppableData) return;

    const { assignments: dayAssignments, maxSlots } = droppableData;
    const filledCount = dayAssignments.filter(
      (a) => a.member_id !== null,
    ).length;

    // Check capacity
    if (filledCount >= maxSlots) return;

    // Prevent duplicate in same day
    if (dayAssignments.some((a) => a.member_id === memberId)) return;

    // Fill first empty slot
    const emptySlot = dayAssignments.find((a) => a.member_id === null);
    if (!emptySlot) return;

    await updateAssignment(emptySlot.id, memberId);
  };

  const handleUpdateAssignment = async (
    id: string,
    memberId: string | null,
  ) => {
    await updateAssignment(id, memberId);
  };

  const handleToggleLock = async (id: string) => {
    await toggleLock(id);
  };

  const monthLabel = selectedMonth
    ? `${selectedMonth.year}-${String(selectedMonth.month).padStart(2, "0")}`
    : "Calendar";

  const isLoading = monthsLoading || membersLoading || assignmentsLoading;

  // Find active drag member for overlay
  const activeDragMember = activeDragMemberId
    ? members.find((m) => m.id === activeDragMemberId)
    : null;

  const isDark =
    theme === "dark" ||
    (theme === "system" &&
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches);

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="min-h-screen bg-background text-foreground flex flex-col font-sans selection:bg-primary selection:text-primary-foreground">
        {/* Header */}
        <header className="sticky top-0 z-40 bg-card/90 backdrop-blur-md border-b border-border shadow-xs">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-primary rounded-xl text-primary-foreground shadow-xs">
                <Church className="w-5 h-5" />
              </div>
              <h1>Department Calendar</h1>
            </div>

            <div className="flex items-center space-x-3 sm:space-x-4">
              {/* Theme Toggle */}
              <Tooltip>
                <TooltipTrigger>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={toggleTheme}
                    className="h-9 w-9 rounded-xl"
                  >
                    {isDark ? (
                      <Sun className="w-4 h-4 text-amber-400" />
                    ) : (
                      <Moon className="w-4 h-4 text-slate-700" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Switch to {isDark ? "Light" : "Dark"} mode</p>
                </TooltipContent>
              </Tooltip>

              {/* Edit Mode Toggle */}
              <div className="flex items-center space-x-2.5 bg-background border border-border rounded-xl px-3 py-1.5 shadow-xs">
                <Edit3
                  className={`w-3.5 h-3.5 ${isEditMode ? "text-primary" : "text-muted-foreground"}`}
                />
                <Label
                  htmlFor="edit-mode"
                  className={`text-xs font-semibold ${!isAuthenticated ? "cursor-not-allowed text-muted-foreground" : "cursor-pointer"}`}
                >
                  Edit mode
                </Label>
                <Switch
                  id="edit-mode"
                  checked={isEditMode}
                  onCheckedChange={setIsEditMode}
                  disabled={!isAuthenticated}
                />
              </div>

              {isAdmin && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsMemberManagerOpen(true)}
                  className="gap-1.5 rounded-xl text-xs font-semibold"
                >
                  <Users className="w-3.5 h-3.5 text-primary" />
                  <span>Roster</span>
                </Button>
              )}

              {isAuthenticated ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => signOut()}
                  className="gap-1.5 rounded-xl text-xs font-semibold text-muted-foreground"
                  title="Sign out of admin session"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign Out</span>
                </Button>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsLoginOpen(true)}
                  className="gap-1.5 rounded-xl text-xs font-semibold"
                >
                  <KeyRound className="w-3.5 h-3.5 text-primary" />
                  <span>Sign In</span>
                </Button>
              )}
            </div>
          </div>
        </header>

        {/* Main */}
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
          {/* Toolbar */}
          <Card className="border-border shadow-xs bg-card/60">
            <CardContent className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 gap-4">
              <div className="flex items-center space-x-3">
                <MonthPicker isAdmin={isAdmin} />
              </div>
              <div className="flex items-center gap-2.5">
                <ReshuffleButton isAdmin={isAdmin} />
                <ExportButton
                  targetRef={gridRef}
                  monthLabel={monthLabel}
                  editMode={isEditMode}
                  onEditModeChange={setIsEditMode}
                />
              </div>
            </CardContent>
          </Card>

          {/* Grid + Sidebar */}
          {isLoading && assignments.length === 0 ? (
            <Card className="flex flex-col items-center justify-center py-20 text-muted-foreground bg-card/50 border-border">
              <Loader2 className="w-8 h-8 animate-spin text-primary mb-3" />
              <p>Loading department schedule...</p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
              <div className="lg:col-span-3">
                <CalendarGrid
                  ref={gridRef}
                  monthRecord={selectedMonth}
                  assignments={assignments}
                  members={members}
                  isAdmin={isAdmin}
                  activeDragMemberId={activeDragMemberId}
                  onUpdateAssignment={handleUpdateAssignment}
                  onToggleLock={handleToggleLock}
                />
              </div>
              <div className="lg:col-span-1">
                <MemberSidebar isAdmin={isAdmin} />
              </div>
            </div>
          )}
        </main>

        <footer className="border-t border-border py-6 text-xs text-muted-foreground">
          <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
            <p>
              © {new Date().getFullYear()} Church Department Scheduler. Internal
              Tool.
            </p>
          </div>
        </footer>

        <DragOverlay dropAnimation={null}>
          {activeDragMember &&
            (() => {
              const color = getMemberColor(activeDragMember.id);
              return (
                <div
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold shadow-xl border opacity-95 cursor-grabbing ${color.bg} ${color.text} ${color.border}`}
                  style={{ width: "max-content" }}
                >
                  {activeDragMember.name}
                </div>
              );
            })()}
        </DragOverlay>

        <MemberManager
          isOpen={isMemberManagerOpen}
          onClose={() => setIsMemberManagerOpen(false)}
        />

        <LoginForm isOpen={isLoginOpen} onClose={() => setIsLoginOpen(false)} />
      </div>
    </DndContext>
  );
}

export default function App() {
  return (
    <TooltipProvider>
      <AppProviders>
        <MainContent />
      </AppProviders>
    </TooltipProvider>
  );
}
