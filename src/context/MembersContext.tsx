import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { supabase } from "../lib/supabase";
import { Member } from "../types";

interface MembersContextType {
  members: Member[];
  loading: boolean;
  error: string | null;
  fetchMembers: () => Promise<void>;
  addMember: (name: string) => Promise<{ error: Error | null }>;
  removeMember: (id: string) => Promise<{ error: Error | null }>;
}

const MembersContext = createContext<MembersContextType | undefined>(undefined);

export function MembersProvider({ children }: { children: ReactNode }) {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMembers = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error: fetchError } = await supabase
      .from("members")
      .select("*")
      .eq("active", true)
      .order("name", { ascending: true });

    if (fetchError) {
      setError(fetchError.message);
    } else if (data) {
      setMembers(data as Member[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  const addMember = async (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return { error: new Error("Name cannot be empty") };

    const { data, error } = await supabase
      .from("members")
      .insert([{ name: trimmed, active: true }])
      .select()
      .single();

    if (error) {
      return { error };
    }

    if (data) {
      setMembers((prev) =>
        [...prev, data as Member].sort((a, b) => a.name.localeCompare(b.name)),
      );
    }
    return { error: null };
  };

  const removeMember = async (id: string) => {
    const { error } = await supabase
      .from("members")
      .update({ active: false })
      .eq("id", id);

    if (error) {
      return { error };
    }

    setMembers((prev) => prev.filter((m) => m.id !== id));
    return { error: null };
  };

  return (
    <MembersContext.Provider
      value={{
        members,
        loading,
        error,
        fetchMembers,
        addMember,
        removeMember,
      }}
    >
      {children}
    </MembersContext.Provider>
  );
}

export function useMembersContext() {
  const context = useContext(MembersContext);
  if (!context) {
    throw new Error("useMembersContext must be used within a MembersProvider");
  }
  return context;
}
