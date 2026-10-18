import { useId, useState } from "react";
import { Lock } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function PasswordForm({
  fileName,
  error,
  busy,
  onSubmit,
  compact = false,
}: {
  fileName: string;
  error?: string;
  busy?: boolean;
  onSubmit: (password: string) => void;
  compact?: boolean;
}) {
  const [password, setPassword] = useState("");
  const id = useId();

  return (
    <form
      className="space-y-2"
      onSubmit={(event) => {
        event.preventDefault();
        if (password) onSubmit(password);
      }}
    >
      {!compact && (
        <div className="flex items-center gap-2 text-sm font-medium">
          <Lock className="size-4" />
          “{fileName}” is password-protected
        </div>
      )}
      <label className="sr-only" htmlFor={id}>
        Password for {fileName}
      </label>
      <div className={compact ? "flex flex-col gap-2" : "flex gap-2"}>
        <Input
          id={id}
          autoComplete="off"
          aria-invalid={!!error}
          placeholder="Enter password"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
        <Button type="submit" size="lg" variant="ink" disabled={!password || busy}>
          Unlock
        </Button>
      </div>
      {error ? (
        <p className="text-xs font-medium text-danger">{error}</p>
      ) : (
        !compact && (
          <p className="text-xs text-muted-foreground">
            The password stays on your device. The output won’t be password-protected.
          </p>
        )
      )}
    </form>
  );
}
