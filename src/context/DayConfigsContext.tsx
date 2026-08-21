import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { supabase } from "../lib/supabase";
import { EventType } from "../types";

export interface DayConfig {
  id: string;
  event_type: EventType;
  slot_count: number;
}

interface DayConfigsContextType {
  configs: Record<EventType, number>;
  loading: boolean;
  error: string | null;
}

const DEFAULT_CONFIGS: Record<EventType, number> = {
  wednesday: 2,
  friday: 2,
  saturday: 3,
  special: 1,
};

const DayConfigsContext = createContext<DayConfigsContextType | undefined>(
  undefined,
);

export function DayConfigsProvider({ children }: { children: ReactNode }) {
  const [configs, setConfigs] =
    useState<Record<EventType, number>>(DEFAULT_CONFIGS);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchConfigs = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error: fetchError } = await supabase
      .from("day_configs")
      .select("*");

    if (fetchError) {
      setError(fetchError.message);
    } else if (data && data.length > 0) {
      const map = { ...DEFAULT_CONFIGS };
      for (const row of data as DayConfig[]) {
        map[row.event_type] = row.slot_count;
      }
      setConfigs(map);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchConfigs();
  }, [fetchConfigs]);

  return (
    <DayConfigsContext.Provider value={{ configs, loading, error }}>
      {children}
    </DayConfigsContext.Provider>
  );
}

export function useDayConfigsContext() {
  const context = useContext(DayConfigsContext);
  if (!context) {
    throw new Error(
      "useDayConfigsContext must be used within a DayConfigsProvider",
    );
  }
  return context;
}
