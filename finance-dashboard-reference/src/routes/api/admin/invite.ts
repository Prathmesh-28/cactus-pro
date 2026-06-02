import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { Database } from "@/integrations/supabase/types";

type Role = "admin" | "editor" | "viewer";

async function authorizeAdmin(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.slice(7);

  const SUPABASE_URL = process.env.SUPABASE_URL!;
  const SUPABASE_PUBLISHABLE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY!;
  const userClient = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: claims, error: claimsErr } = await userClient.auth.getClaims(token);
  if (claimsErr || !claims?.claims?.sub) return null;
  const callerId = claims.claims.sub as string;

  const { data: isAdmin } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", callerId)
    .eq("role", "admin")
    .maybeSingle();
  if (!isAdmin) return null;
  return callerId;
}

export const Route = createFileRoute("/api/admin/invite")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const callerId = await authorizeAdmin(request);
        if (!callerId) return new Response("Forbidden", { status: 403 });

        let body: { email?: string; role?: Role };
        try {
          body = await request.json();
        } catch {
          return new Response("Invalid body", { status: 400 });
        }
        const email = (body.email ?? "").trim().toLowerCase();
        const role: Role = (body.role ?? "viewer") as Role;
        if (!email || !["admin", "editor", "viewer"].includes(role)) {
          return new Response("Invalid email or role", { status: 400 });
        }

        const redirectTo = `${new URL(request.url).origin}/set-password`;
        const { data: invited, error: inviteErr } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
          redirectTo,
        });
        if (inviteErr || !invited?.user) {
          const { data: existing } = await supabaseAdmin
            .from("profiles")
            .select("id")
            .eq("email", email)
            .maybeSingle();
          if (!existing) {
            return new Response(inviteErr?.message ?? "Invite failed", { status: 400 });
          }
          await supabaseAdmin.from("user_roles").delete().eq("user_id", existing.id);
          await supabaseAdmin.from("user_roles").insert({ user_id: existing.id, role });
          return Response.json({ ok: true, existed: true });
        }

        const newId = invited.user.id;
        if (role !== "viewer") {
          await supabaseAdmin.from("user_roles").delete().eq("user_id", newId);
          await supabaseAdmin.from("user_roles").insert({ user_id: newId, role });
        }
        return Response.json({ ok: true, invited: true });
      },
      DELETE: async ({ request }) => {
        const callerId = await authorizeAdmin(request);
        if (!callerId) return new Response("Forbidden", { status: 403 });

        let body: { userId?: string };
        try {
          body = await request.json();
        } catch {
          return new Response("Invalid body", { status: 400 });
        }
        const userId = (body.userId ?? "").trim();
        if (!userId) return new Response("Missing userId", { status: 400 });
        if (userId === callerId) return new Response("Cannot remove yourself", { status: 400 });

        await supabaseAdmin.from("user_roles").delete().eq("user_id", userId);
        await supabaseAdmin.from("profiles").delete().eq("id", userId);
        const { error: delErr } = await supabaseAdmin.auth.admin.deleteUser(userId);
        if (delErr) return new Response(delErr.message, { status: 400 });
        return Response.json({ ok: true });
      },
    },
  },
});
