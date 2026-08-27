import type { ReactNode } from "react";

import { AppHeader } from "@/components/layout/AppHeader";
import { BottomNav } from "@/components/layout/BottomNav";

interface AppLayoutProps {
  title?: string;
  subtitle?: string;
  children: ReactNode;
}

export function AppLayout({ title, subtitle, children }: AppLayoutProps) {
  return (
    <div className="app-shell min-h-screen bg-background pb-24">
      <AppHeader />
      <main className="app-main mx-auto w-full max-w-3xl px-4 py-5">
        {title ? (
          <div className="mb-4">
            <h1 className="text-title text-navy">{title}</h1>
            {subtitle ? <p className="text-meta mt-1">{subtitle}</p> : null}
          </div>
        ) : null}
        {children}
      </main>
      <BottomNav />
    </div>
  );
}
