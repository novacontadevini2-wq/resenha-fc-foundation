import { Link } from "@tanstack/react-router";
import { Home, Shield, Shuffle, Trophy, Users } from "lucide-react";

import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

const items = [
  { to: "/app/principal", label: "Principal", icon: Home },
  { to: "/app/jogadores", label: "Jogadores", icon: Users },
  { to: "/app/sorteio", label: "Sorteio", icon: Shuffle },
  { to: "/app/torneios", label: "Torneio", icon: Trophy },
] as const;

export function BottomNav() {
  const { isAdmin } = useAuth();
  const navItems = isAdmin
    ? [...items, { to: "/app/admin", label: "Admin", icon: Shield } as const]
    : items;

  return (
    <nav
      className="surface-navy fixed inset-x-0 bottom-0 z-40 border-t border-white/10 shadow-nav"
      aria-label="Navegação principal"
    >
      <ul className="mx-auto flex max-w-3xl items-stretch">
        {navItems.map((item) => (
          <li key={item.to} className="flex-1">
            <Link
              to={item.to}
              className="flex min-h-16 flex-col items-center justify-center gap-1 px-1 py-2 text-navy-foreground/65 transition-colors"
              activeProps={{ className: "!text-orange" }}
            >
              {({ isActive }) => (
                <>
                  <span
                    className={cn(
                      "flex size-9 items-center justify-center rounded-xl transition-colors",
                      isActive && "bg-orange/15",
                    )}
                  >
                    <item.icon className="size-5" />
                  </span>
                  <span className="text-[11px] font-semibold uppercase tracking-wide">
                    {item.label}
                  </span>
                </>
              )}
            </Link>
          </li>
        ))}
      </ul>
      <div className="h-[env(safe-area-inset-bottom)]" />
    </nav>
  );
}
