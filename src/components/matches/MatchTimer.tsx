import { Timer } from "lucide-react";
import { useEffect, useState } from "react";

import type { MatchStatus } from "@/types";

function format(totalSeconds: number) {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const seconds = safe % 60;
  const pad = (value: number) => String(value).padStart(2, "0");
  return hours > 0 ? `${pad(hours)}:${pad(minutes)}:${pad(seconds)}` : `${pad(minutes)}:${pad(seconds)}`;
}

export function MatchTimer({
  status,
  startedAt,
  finishedAt,
  className,
}: {
  status: MatchStatus | string;
  startedAt: string | null;
  finishedAt: string | null;
  className?: string;
}) {
  const running = status === "in_progress" && Boolean(startedAt);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!running) return;
    setNow(Date.now());
    const interval = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, [running, startedAt]);

  if (!startedAt || status === "scheduled" || status === "cancelled") return null;

  const start = new Date(startedAt).getTime();
  const end = running ? now : finishedAt ? new Date(finishedAt).getTime() : start;
  const elapsed = (end - start) / 1000;

  return (
    <div
      className={`inline-flex items-center gap-2 rounded-full border border-navy/10 bg-navy/5 px-3 py-1 font-display text-lg font-bold text-navy ${className ?? ""}`}
    >
      <Timer className={`size-4 ${running ? "text-orange" : "text-navy/60"}`} />
      <span>{format(elapsed)}</span>
      <span className="text-xs font-medium text-navy/60">{running ? "em andamento" : "tempo final"}</span>
    </div>
  );
}
