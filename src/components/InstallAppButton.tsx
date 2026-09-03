import { useEffect, useState } from "react";
import { Download, Share, SquarePlus, MonitorDown } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

type Platform = "ios" | "android" | "desktop";

function detectPlatform(): Platform {
  const ua = window.navigator.userAgent;
  if (/iphone|ipad|ipod/i.test(ua)) return "ios";
  if (/android/i.test(ua)) return "android";
  return "desktop";
}

function isInstalledNow(): boolean {
  if (window.matchMedia("(display-mode: standalone)").matches) return true;
  // iOS Safari
  if ((window.navigator as { standalone?: boolean }).standalone === true) return true;
  return false;
}

export function InstallAppButton({ variant = "button" }: { variant?: "button" | "tile" }) {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [platform, setPlatform] = useState<Platform>("desktop");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setPlatform(detectPlatform());
    setInstalled(isInstalledNow());
    setReady(true);

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setDeferred(null);
      setDialogOpen(false);
    };

    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (!ready || installed) return null;

  async function handleClick() {
    if (deferred) {
      await deferred.prompt();
      const choice = await deferred.userChoice;
      if (choice.outcome === "accepted") {
        setInstalled(true);
        setDeferred(null);
        return;
      }
      setDeferred(null);
      return;
    }
    setDialogOpen(true);
  }

  const trigger =
    variant === "tile" ? (
      <button
        type="button"
        onClick={handleClick}
        className="card-surface flex flex-col items-center justify-center gap-2 rounded-2xl p-4 text-center transition-colors hover:border-orange/40"
      >
        <Download className="size-6 text-orange" />
        <span className="text-sm font-semibold text-navy">Instalar app</span>
      </button>
    ) : (
      <Button
        type="button"
        size="sm"
        onClick={handleClick}
        className={cn("gap-2 bg-orange text-orange-foreground hover:bg-orange-strong")}
      >
        <Download className="size-4" />
        Instalar app
      </Button>
    );

  return (
    <>
      {trigger}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[85dvh] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Instalar o Resenha FC</DialogTitle>
            <DialogDescription>
              Instale o app para abri-lo em janela própria, como um aplicativo nativo. A
              instalação só funciona no site publicado (HTTPS), não dentro do editor de
              pré-visualização.
            </DialogDescription>
          </DialogHeader>

          {platform === "ios" && (
            <ol className="list-decimal space-y-2 pl-5 text-sm text-foreground">
              <li>
                Abra o site no <strong>Safari</strong>.
              </li>
              <li className="flex flex-wrap items-center gap-1">
                Toque no botão <strong>Compartilhar</strong>
                <Share className="inline size-4 text-orange" aria-hidden /> (barra inferior).
              </li>
              <li className="flex flex-wrap items-center gap-1">
                Toque em <strong>"Adicionar à Tela de Início"</strong>
                <SquarePlus className="inline size-4 text-orange" aria-hidden />.
              </li>
              <li>
                Toque em <strong>Adicionar</strong>. O ícone do Resenha FC aparecerá na sua tela
                inicial.
              </li>
            </ol>
          )}

          {platform === "android" && (
            <ol className="list-decimal space-y-2 pl-5 text-sm text-foreground">
              <li>
                Abra o site no <strong>Chrome</strong>.
              </li>
              <li>
                Toque no menu <strong>⋮</strong> (canto superior direito).
              </li>
              <li>
                Toque em <strong>"Instalar app"</strong> ou{" "}
                <strong>"Adicionar à tela inicial"</strong>.
              </li>
              <li>
                Confirme em <strong>Instalar</strong>. O app abrirá em janela própria, sem barra de
                endereço.
              </li>
            </ol>
          )}

          {platform === "desktop" && (
            <ol className="list-decimal space-y-2 pl-5 text-sm text-foreground">
              <li className="flex flex-wrap items-center gap-1">
                Clique no ícone de <strong>instalar</strong>
                <MonitorDown className="inline size-4 text-orange" aria-hidden /> na barra de
                endereço do navegador,
              </li>
              <li>
                ou abra o menu <strong>⋮</strong> e escolha{" "}
                <strong>"Instalar Resenha FC"</strong>.
              </li>
              <li>O app abrirá em janela própria, como um programa instalado.</li>
            </ol>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
