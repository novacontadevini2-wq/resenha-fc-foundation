import { useNavigate } from "@tanstack/react-router";
import { LogOut } from "lucide-react";
import { toast } from "sonner";

import { BrandMark } from "@/components/brand/BrandMark";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";

export function AppHeader() {
  const { isAdmin, signOut } = useAuth();
  const navigate = useNavigate();

  async function handleSignOut() {
    await signOut();
    toast.success("Sessão encerrada.");
    navigate({ to: "/login", replace: true });
  }

  return (
    <header className="surface-navy sticky top-0 z-30 border-b border-white/10">
      <div className="mx-auto flex min-w-0 max-w-3xl items-center justify-between gap-3 px-4 py-3">
        <BrandMark size="sm" tone="light" className="min-w-0" />
        <div className="flex items-center gap-2">
          <div className="hidden sm:block">
            <InstallAppButton />
          </div>
          <NotificationBell />
          <Badge className="bg-orange/15 text-orange hover:bg-orange/15">
            {isAdmin ? "Admin" : "Jogador"}
          </Badge>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Sair"
            onClick={handleSignOut}
            className="text-navy-foreground/80 hover:bg-white/10 hover:text-navy-foreground"
          >
            <LogOut className="size-5" />
          </Button>
        </div>
      </div>
    </header>
  );
}
