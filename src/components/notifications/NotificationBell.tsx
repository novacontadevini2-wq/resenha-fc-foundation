import { Link } from "@tanstack/react-router";
import { Bell } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

export function NotificationBell() {
  const [unread, setUnread] = useState(0);
  useEffect(() => {
    let active = true;
    async function load() {
      const { count } = await supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .is("read_at", null);
      if (active) setUnread(count ?? 0);
    }
    void load();
    const channel = supabase
      .channel("notification-count")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications" },
        () => void load(),
      )
      .subscribe();
    return () => {
      active = false;
      void supabase.removeChannel(channel);
    };
  }, []);
  return (
    <Button
      asChild
      variant="ghost"
      size="icon"
      aria-label="Notificações"
      className="relative text-navy-foreground/80 hover:bg-white/10 hover:text-navy-foreground"
    >
      <Link to="/app/notificacoes">
        <Bell className="size-5" />
        {unread > 0 ? (
          <span className="absolute right-0 top-0 flex size-4 items-center justify-center rounded-full bg-orange text-[10px] font-bold text-navy">
            {unread > 9 ? "9+" : unread}
          </span>
        ) : null}
      </Link>
    </Button>
  );
}
