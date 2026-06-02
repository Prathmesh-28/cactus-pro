import { useEffect, useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { ChevronDown, History, LogOut, UserCog, User } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { ManageMembersDialog } from "./manage-members-dialog";
import { VersionHistoryDialog } from "./version-history-dialog";

function firstNameFrom(fullName: string | null, email: string | null | undefined): string {
  if (fullName && fullName.trim().length > 0) {
    return fullName.trim().split(/\s+/)[0];
  }
  if (!email) return "Account";
  const local = email.split("@")[0] ?? "";
  const first = local.split(/[._-]/)[0] ?? local;
  if (!first) return "Account";
  return first.charAt(0).toUpperCase() + first.slice(1);
}

export function AccountMenu() {
  const { user, roles, canEdit, isAdmin, signOut } = useAuth();
  const [membersOpen, setMembersOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [fullName, setFullName] = useState<string | null>(null);
  const role = roles[0] ?? "viewer";

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("full_name")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => setFullName(data?.full_name ?? null));
  }, [user]);

  const firstName = firstNameFrom(fullName, user?.email);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <User className="size-4" />
            <span className="hidden sm:inline max-w-[160px] truncate">{firstName}</span>
            <span className="text-[10px] uppercase tracking-widest text-muted-foreground hidden md:inline">
              {role}
            </span>
            <ChevronDown className="size-3.5 opacity-60" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          <DropdownMenuLabel className="font-normal">
            <div className="text-sm font-medium">{firstName}</div>
            <div className="text-xs text-muted-foreground truncate">{user?.email}</div>
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground mt-0.5">
              {role} {canEdit ? "· can edit" : "· read-only"}
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          {canEdit && (
            <DropdownMenuItem onClick={() => setHistoryOpen(true)}>
              <History className="size-4 mr-2" /> Version history
            </DropdownMenuItem>
          )}
          {isAdmin && (
            <DropdownMenuItem onClick={() => setMembersOpen(true)}>
              <UserCog className="size-4 mr-2" /> Manage members
            </DropdownMenuItem>
          )}
          {(canEdit || isAdmin) && <DropdownMenuSeparator />}
          <DropdownMenuItem onClick={() => signOut()}>
            <LogOut className="size-4 mr-2" /> Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      {isAdmin && <ManageMembersDialog open={membersOpen} onOpenChange={setMembersOpen} />}
      {canEdit && <VersionHistoryDialog open={historyOpen} onOpenChange={setHistoryOpen} />}
    </>
  );
}
