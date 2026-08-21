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
import { Label } from "@/components/ui/label";
import { AlertCircle, KeyRound, Lock } from "lucide-react";
import React, { useState } from "react";
import { useAuthContext } from "../context/AuthContext";
import { requireAdminEmail } from "../lib/adminConfig";

interface LoginFormProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LoginForm: React.FC<LoginFormProps> = ({ isOpen, onClose }) => {
  const { signIn } = useAuthContext();
  const [passcode, setPasscode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!passcode.trim()) {
      setError("Please enter the admin passcode.");
      return;
    }

    let adminEmail: string;
    try {
      adminEmail = requireAdminEmail();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Configuration error.");
      return;
    }

    setSubmitting(true);
    const { error: authError } = await signIn(adminEmail, passcode);
    setSubmitting(false);

    if (authError) {
      setError(authError.message || "Invalid passcode. Please try again.");
    } else {
      setPasscode("");
      onClose();
    }
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center space-x-3 mb-2">
            <div className="p-2.5 bg-amber-500/10 border border-amber-500/20 text-amber-500 rounded-xl shrink-0">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold font-heading">
                Admin Sign In
              </DialogTitle>
              <DialogDescription className="text-xs">
                Enter the shared passcode to unlock editing controls
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {error && (
          <div className="mb-4 p-3 bg-destructive/15 border border-destructive/30 rounded-xl flex items-center space-x-2 text-xs text-destructive">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="passcode" className="text-xs font-semibold">
              Admin Passcode
            </Label>
            <div className="relative">
              <KeyRound className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
              <Input
                id="passcode"
                type="password"
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                placeholder="••••••••"
                autoFocus
                required
                className="pl-9 text-sm"
              />
            </div>
          </div>

          <DialogFooter className="pt-2 flex items-center justify-end space-x-2">
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={submitting}
              className="text-xs font-semibold"
            >
              {submitting ? "Signing in..." : "Sign In"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
