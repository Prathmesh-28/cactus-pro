import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/set-password")({
  head: () => ({ meta: [{ title: "Set your password · Cactus Partners" }] }),
  component: SetPasswordPage,
});

function SetPasswordPage() {
  const nav = useNavigate();
  const [ready, setReady] = useState(false);
  const [email, setEmail] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    // Supabase invite link delivers a session via URL hash; the client picks it up automatically.
    supabase.auth.getSession().then(({ data }) => {
      setEmail(data.session?.user.email ?? null);
      setUserId(data.session?.user.id ?? null);
      setReady(true);
    });
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    const trimmedName = fullName.trim();
    if (!trimmedName) return setErr("Please enter your full name.");
    if (password.length < 6) return setErr("Password must be at least 6 characters.");
    if (password !== confirm) return setErr("Passwords do not match.");
    setBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password,
        data: { full_name: trimmedName },
      });
      if (error) throw error;
      if (userId) {
        await supabase
          .from("profiles")
          .update({ full_name: trimmedName })
          .eq("id", userId);
      }
      setDone(true);
      setTimeout(() => nav({ to: "/" }), 1200);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Failed to set password");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen grid place-items-center bg-background px-4">
      <div className="w-full max-w-sm rounded-lg border border-border bg-card p-8 shadow-[var(--shadow-card)]">
        <div className="mb-6 text-center">
          <h1 className="font-serif text-2xl">Set your password</h1>
          {email && <p className="text-sm text-muted-foreground mt-1">{email}</p>}
        </div>
        {!ready ? (
          <p className="text-sm text-muted-foreground text-center">Loading…</p>
        ) : !email ? (
          <p className="text-sm text-destructive text-center">
            This link is invalid or expired. Ask your admin to send a new invite.
          </p>
        ) : done ? (
          <p className="text-sm text-center">Password set. Redirecting…</p>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="fn">Full name</Label>
              <Input id="fn" type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} required placeholder="Your full name" autoComplete="name" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pw">New password</Label>
              <Input id="pw" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pw2">Confirm password</Label>
              <Input id="pw2" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required minLength={6} />
            </div>
            {err && <p className="text-sm text-destructive">{err}</p>}
            <Button type="submit" disabled={busy} className="w-full">
              {busy ? "Saving…" : "Set password & continue"}
            </Button>
            <p className="text-xs text-muted-foreground text-center">
              From now on, sign in with your email and this password.
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
