import { toast } from "@/components/ui/toast";

// Single shared admin account used by all editors. The email is hidden from
// the login UI — editors only ever enter the shared passcode.
export const ADMIN_EMAIL =
  import.meta.env.VITE_ADMIN_EMAIL;

if (!ADMIN_EMAIL) {
  toast.error("Missing Config", {
    description:
      "VITE_ADMIN_EMAIL is not set. Authentication will fail.",
  });
}