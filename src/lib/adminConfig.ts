// Single shared admin account used by all editors. The email is hidden from
// the login UI — editors only ever enter the shared passcode.
export const ADMIN_EMAIL = import.meta.env.VITE_ADMIN_EMAIL;

export function requireAdminEmail(): string {
  if (!ADMIN_EMAIL) {
    throw new Error("VITE_ADMIN_EMAIL is not set. Authentication will fail.");
  }
  return ADMIN_EMAIL;
}
