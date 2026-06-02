import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Sign in · Cactus Partners" }] }),
  component: LoginPage,
});

const RESTRICTED_MESSAGE =
  "Access restricted. Please contact the administrator for an invitation.";

const DEMO_EMAIL = import.meta.env.VITE_DEMO_ADMIN_EMAIL as string | undefined;
const DEMO_PASSWORD = import.meta.env.VITE_DEMO_ADMIN_PASSWORD as string | undefined;

function LoginPage() {
  const { session, loading } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && session) nav({ to: "/" });
  }, [session, loading, nav]);

  async function signIn(e: string, p: string) {
    setErr(null);
    setBusy(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email: e, password: p });
      if (error) {
        const msg = error.message.toLowerCase();
        if (
          msg.includes("invalid login") ||
          msg.includes("invalid credentials") ||
          msg.includes("user not found") ||
          msg.includes("signups not allowed") ||
          msg.includes("email not confirmed")
        ) {
          throw new Error(RESTRICTED_MESSAGE);
        }
        throw error;
      }
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : RESTRICTED_MESSAGE);
    } finally {
      setBusy(false);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    await signIn(email, password);
  }

  async function loginAsDemo() {
    if (!DEMO_EMAIL || !DEMO_PASSWORD) return;
    setEmail(DEMO_EMAIL);
    setPassword(DEMO_PASSWORD);
    await signIn(DEMO_EMAIL, DEMO_PASSWORD);
  }

  return (
    <div className="min-h-screen grid place-items-center bg-background px-4">
      <div className="w-full max-w-sm rounded-lg border border-border bg-card p-8 shadow-[var(--shadow-card)]">
        <div className="mb-6 text-center">
          <h1 className="font-serif text-2xl">Cactus Partners Capital</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Sign in to view the dashboard
          </p>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pw">Password</Label>
            <Input id="pw" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
          </div>
          {err && <p className="text-sm text-destructive">{err}</p>}
          <Button type="submit" disabled={busy} className="w-full">
            {busy ? "Please wait…" : "Sign in"}
          </Button>
          {DEMO_EMAIL && DEMO_PASSWORD && (
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              className="w-full"
              onClick={loginAsDemo}
            >
              Demo Admin Login
            </Button>
          )}
        </form>
        <p className="mt-6 text-center text-xs text-muted-foreground">
          This dashboard is private. Access is by admin invitation only.
        </p>
      </div>
    </div>
  );
}
