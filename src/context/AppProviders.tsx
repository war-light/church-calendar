import { ReactNode } from "react";
import { AssignmentsProvider } from "./AssignmentsContext";
import { AuthProvider } from "./AuthContext";
import { DayConfigsProvider } from "./DayConfigsContext";
import { MembersProvider } from "./MembersContext";
import { MonthsProvider } from "./MonthsContext";

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <DayConfigsProvider>
        <MembersProvider>
          <MonthsProvider>
            <AssignmentsProvider>{children}</AssignmentsProvider>
          </MonthsProvider>
        </MembersProvider>
      </DayConfigsProvider>
    </AuthProvider>
  );
}
