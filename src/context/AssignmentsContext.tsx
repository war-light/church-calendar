import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { generateMonthAssignments } from "../lib/algorithm";
import { getDaysInMonth } from "../lib/dateUtils";
import { supabase } from "../lib/supabase";
import { Assignment } from "../types";
import { useMembersContext } from "./MembersContext";
import { useMonthsContext } from "./MonthsContext";

interface AssignmentsContextType {
  assignments: Assignment[];
  loading: boolean;
  error: string | null;
  fetchAssignments: (monthId?: string) => Promise<void>;
  updateAssignment: (
    id: string,
    memberId: string | null,
  ) => Promise<{ error: Error | null }>;
  toggleLock: (id: string) => Promise<{ error: Error | null }>;
  setAllLocked: (locked: boolean) => Promise<{ error: Error | null }>;
  regenerateMonth: () => Promise<{ error: Error | null }>;
  clearMonth: () => Promise<{ error: Error | null }>;
}

const AssignmentsContext = createContext<AssignmentsContextType | undefined>(
  undefined,
);

export function AssignmentsProvider({ children }: { children: ReactNode }) {
  const { selectedMonth, createMonth } = useMonthsContext();
  const { members } = useMembersContext();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const membersRef = useRef(members);
  useEffect(() => {
    membersRef.current = members;
  }, [members]);

  const isValidUuid = (id: string): boolean => {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      id,
    );
  };

  const ensureValidUuid = (id: string): string => {
    return isValidUuid(id) ? id : crypto.randomUUID();
  };

  const ensureMonthSaved = async () => {
    if (!selectedMonth) return null;
    if (selectedMonth.id.startsWith("virtual-")) {
      const { data: newMonth, error } = await createMonth(
        selectedMonth.year,
        selectedMonth.month,
      );
      if (error || !newMonth) {
        console.error("Failed to auto-create month:", error);
        return null;
      }
      return newMonth;
    }
    return selectedMonth;
  };

  const fetchAssignments = useCallback(
    async (monthId?: string) => {
      const targetMonthId = monthId || selectedMonth?.id;
      if (!targetMonthId) {
        setAssignments([]);
        return;
      }

      setLoading(true);
      setError(null);

      // Only query database if targetMonthId is a valid UUID
      if (isValidUuid(targetMonthId)) {
        const { data, error: fetchError } = await supabase
          .from("assignments")
          .select("*")
          .eq("month_id", targetMonthId)
          .order("day_date", { ascending: true });

        if (fetchError) {
          setError(fetchError.message);
        } else if (data && data.length > 0) {
          setAssignments(data as Assignment[]);
          setLoading(false);
          return;
        }
      }

      // Fallback: Generate empty slots (no member assigned) for selectedMonth
      if (selectedMonth) {
        const daysInMonth = getDaysInMonth(
          selectedMonth.year,
          selectedMonth.month,
        );
        const virtualAssignments = daysInMonth.flatMap((day) => {
          const slotCount =
            day.eventType === "wednesday"
              ? 1
              : day.eventType === "friday"
                ? 2
                : 3;
          return Array.from({ length: slotCount }, () => ({
            id: crypto.randomUUID(),
            month_id: selectedMonth.id,
            day_date: day.date,
            event_type: day.eventType,
            member_id: null as string | null,
            locked: false,
          }));
        });
        setAssignments(virtualAssignments);
      }
      setLoading(false);
    },
    [selectedMonth?.id],
  );

  useEffect(() => {
    if (selectedMonth?.id) {
      fetchAssignments(selectedMonth.id);
    }
  }, [selectedMonth?.id, fetchAssignments]);

  const updateAssignment = async (id: string, memberId: string | null) => {
    const targetMonth = await ensureMonthSaved();

    if (!isValidUuid(id) && targetMonth) {
      const updatedList = assignments.map((a) =>
        a.id === id ? { ...a, member_id: memberId } : a,
      );
      const prepared = updatedList.map((a) => ({
        ...a,
        id: ensureValidUuid(a.id),
        month_id: targetMonth.id,
      }));
      const { error: upsertError } = await supabase
        .from("assignments")
        .upsert(prepared);
      if (upsertError) return { error: upsertError as any };
      setAssignments(prepared);
      return { error: null };
    }

    const { error } = await supabase
      .from("assignments")
      .update({ member_id: memberId })
      .eq("id", id);

    if (error) {
      return { error };
    }

    setAssignments((prev) =>
      prev.map((a) => (a.id === id ? { ...a, member_id: memberId } : a)),
    );
    return { error: null };
  };

  const toggleLock = async (id: string) => {
    const targetMonth = await ensureMonthSaved();
    const target = assignments.find((a) => a.id === id);
    if (!target) return { error: new Error("Assignment not found") };

    const newLockedState = !target.locked;

    if (!isValidUuid(id) && targetMonth) {
      const updatedList = assignments.map((a) =>
        a.id === id ? { ...a, locked: newLockedState } : a,
      );
      const prepared = updatedList.map((a) => ({
        ...a,
        id: ensureValidUuid(a.id),
        month_id: targetMonth.id,
      }));
      const { error: upsertError } = await supabase
        .from("assignments")
        .upsert(prepared);
      if (upsertError) return { error: upsertError as any };
      setAssignments(prepared);
      return { error: null };
    }

    const { error } = await supabase
      .from("assignments")
      .update({ locked: newLockedState })
      .eq("id", id);

    if (error) {
      return { error };
    }

    setAssignments((prev) =>
      prev.map((a) => (a.id === id ? { ...a, locked: newLockedState } : a)),
    );
    return { error: null };
  };

  const setAllLocked = async (locked: boolean) => {
    if (!selectedMonth) {
      return { error: new Error("No month selected") };
    }

    const targetMonth = await ensureMonthSaved();
    if (!targetMonth) {
      return { error: new Error("Failed to save month record in database") };
    }

    if (assignments.length === 0) {
      return { error: null };
    }

    const updatedAssignments = assignments.map((a) => ({
      ...a,
      id: ensureValidUuid(a.id),
      month_id: targetMonth.id,
      locked,
    }));

    const { error: upsertError } = await supabase
      .from("assignments")
      .upsert(updatedAssignments);

    if (upsertError) {
      return { error: upsertError };
    }

    setAssignments(updatedAssignments);
    return { error: null };
  };

  const regenerateMonth = async () => {
    if (!selectedMonth) {
      return { error: new Error("No month selected for regeneration") };
    }

    setLoading(true);
    setError(null);

    const targetMonth = await ensureMonthSaved();
    if (!targetMonth) {
      setLoading(false);
      return { error: new Error("Failed to save month record in database") };
    }

    const daysInMonth = getDaysInMonth(targetMonth.year, targetMonth.month);
    const activeMembers = members.filter((m) => m.active);

    // Run algorithm preserving locked assignments
    const regenerated = generateMonthAssignments(
      daysInMonth,
      activeMembers,
      assignments,
    );

    // Attach valid UUIDs
    const preparedAssignments = regenerated.map((a) => ({
      ...a,
      id: ensureValidUuid(a.id),
      month_id: targetMonth.id,
    }));

    const { error: upsertError } = await supabase
      .from("assignments")
      .upsert(preparedAssignments);

    if (upsertError) {
      setError(upsertError.message);
      setLoading(false);
      return { error: upsertError };
    }

    setAssignments(preparedAssignments);
    setLoading(false);
    return { error: null };
  };

  const clearMonth = async () => {
    if (!selectedMonth) {
      return { error: new Error("No month selected") };
    }

    setLoading(true);
    setError(null);

    const clearedAssignments = assignments.map((a) =>
      a.locked ? a : { ...a, member_id: null },
    );

    if (isValidUuid(selectedMonth.id)) {
      const { error: upsertError } = await supabase
        .from("assignments")
        .upsert(clearedAssignments);

      if (upsertError) {
        setError(upsertError.message);
        setLoading(false);
        return { error: upsertError };
      }
    }

    setAssignments(clearedAssignments);
    setLoading(false);
    return { error: null };
  };

  return (
    <AssignmentsContext.Provider
      value={{
        assignments,
        loading,
        error,
        fetchAssignments,
        updateAssignment,
        toggleLock,
        setAllLocked,
        regenerateMonth,
        clearMonth,
      }}
    >
      {children}
    </AssignmentsContext.Provider>
  );
}

export function useAssignmentsContext() {
  const context = useContext(AssignmentsContext);
  if (!context) {
    throw new Error(
      "useAssignmentsContext must be used within an AssignmentsProvider",
    );
  }
  return context;
}
