import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { generateMonthAssignments } from "../lib/algorithm";
import { getDaysInMonth } from "../lib/dateUtils";
import { supabase } from "../lib/supabase";
import { MonthRecord } from "../types";

interface MonthsContextType {
  months: MonthRecord[];
  currentMonth: MonthRecord | null;
  selectedMonth: MonthRecord | null;
  setSelectedMonth: (month: MonthRecord | null) => void;
  loading: boolean;
  error: string | null;
  fetchMonths: () => Promise<void>;
  createMonth: (
    year: number,
    month: number,
  ) => Promise<{ data: MonthRecord | null; error: Error | null }>;
}

const MonthsContext = createContext<MonthsContextType | undefined>(undefined);

export function MonthsProvider({ children }: { children: ReactNode }) {
  const [months, setMonths] = useState<MonthRecord[]>([]);
  const [currentMonth, setCurrentMonth] = useState<MonthRecord | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<MonthRecord | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMonths = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error: fetchError } = await supabase
      .from("months")
      .select("*")
      .order("year", { ascending: true })
      .order("month", { ascending: true });

    if (fetchError) {
      setError(fetchError.message);
    } else if (data) {
      const monthRecords = data as MonthRecord[];
      setMonths(monthRecords);

      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonthNum = now.getMonth() + 1;

      // Find stored current month, or stored matching year/month, or default to current month fallback
      const current =
        monthRecords.find((m) => m.is_current) ||
        monthRecords.find(
          (m) => m.year === currentYear && m.month === currentMonthNum,
        ) ||
        monthRecords[monthRecords.length - 1] ||
        ({
          id: `virtual-${currentYear}-${currentMonthNum}`,
          year: currentYear,
          month: currentMonthNum,
          is_current: true,
        } as MonthRecord);

      setCurrentMonth(current);
      setSelectedMonth((prev) => prev || current);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchMonths();
  }, [fetchMonths]);

  const createMonth = async (year: number, month: number) => {
    setLoading(true);
    setError(null);

    // Check if month already exists in stored months
    const existing = months.find((m) => m.year === year && m.month === month);
    if (existing) {
      setSelectedMonth(existing);
      setLoading(false);
      return { data: existing, error: null };
    }

    // 1. Create the month record
    const { data: monthData, error: monthError } = await supabase
      .from("months")
      .insert([{ year, month, is_current: false }])
      .select()
      .single();

    if (monthError) {
      setLoading(false);
      return { data: null, error: monthError };
    }

    const newMonthRecord = monthData as MonthRecord;

    // 2. Fetch active members to generate initial assignments
    const { data: membersData } = await supabase
      .from("members")
      .select("*")
      .eq("active", true);

    const members = membersData || [];
    const daysInMonth = getDaysInMonth(year, month);
    const initialAssignments = generateMonthAssignments(
      daysInMonth,
      members,
      [],
    );

    // 3. Attach month_id to initial assignments and insert into database
    const assignmentsToInsert = initialAssignments.map((a) => ({
      id: a.id,
      month_id: newMonthRecord.id,
      day_date: a.day_date,
      event_type: a.event_type,
      member_id: a.member_id,
      locked: a.locked,
    }));

    if (assignmentsToInsert.length > 0) {
      const { error: assignError } = await supabase
        .from("assignments")
        .insert(assignmentsToInsert);

      if (assignError) {
        setLoading(false);
        return { data: newMonthRecord, error: assignError };
      }
    }

    // 4. Update state
    setMonths((prev) =>
      [...prev, newMonthRecord].sort(
        (a, b) => a.year - b.year || a.month - b.month,
      ),
    );
    setSelectedMonth(newMonthRecord);
    setLoading(false);

    return { data: newMonthRecord, error: null };
  };

  return (
    <MonthsContext.Provider
      value={{
        months,
        currentMonth,
        selectedMonth,
        setSelectedMonth,
        loading,
        error,
        fetchMonths,
        createMonth,
      }}
    >
      {children}
    </MonthsContext.Provider>
  );
}

export function useMonthsContext() {
  const context = useContext(MonthsContext);
  if (!context) {
    throw new Error("useMonthsContext must be used within a MonthsProvider");
  }
  return context;
}
