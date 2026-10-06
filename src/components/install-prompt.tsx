import { useEffect, useState } from "react";
import { Download, Share, X } from "lucide-react";
import { Button } from "@/components/ui/button";

type BIPEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };
const KEY = "cropcare-install-dismissed";

/** Bottom banner offering "Install CropCare" (Android/desktop) or Share → Add to Home Screen (iOS). */
export function InstallPrompt() {
  const [evt, setEvt] = useState<BIPEvent | null>(null);
  const [ios, setIos] = useState(false);
  const [show, setShow] = useState(false);

  useEffect(() => {
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as unknown as { standalone?: boolean }).standalone === true;
    const dismissed = Number(localStorage.getItem(KEY) ?? 0);
    if (standalone || window.self !== window.top || Date.now() - dismissed < 7 * 864e5) return;

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setEvt(e as BIPEvent);
      setShow(true);
    };
    const onInstalled = () => setShow(false);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);

    const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
    if (isIos) {
      setIos(true);
      const t = setTimeout(() => setShow(true), 4000);
      return () => {
        clearTimeout(t);
        window.removeEventListener("beforeinstallprompt", onPrompt);
        window.removeEventListener("appinstalled", onInstalled);
      };
    }
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (!show) return null;
  const dismiss = () => {
    localStorage.setItem(KEY, String(Date.now()));
    setShow(false);
  };

  return (
    <div
      role="dialog"
      aria-label="Install CropCare"
      className="fixed inset-x-3 bottom-3 z-50 mx-auto flex max-w-md items-center gap-3 rounded-xl border border-border bg-card p-4 shadow-lg sm:bottom-5"
    >
      <img src="/pwa-192.png" alt="" className="h-11 w-11 shrink-0 rounded-lg" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">Install CropCare</p>
        <p className="text-xs text-muted-foreground">
          {ios ? (
            <>
              Tap <Share className="inline h-3.5 w-3.5" aria-label="Share" /> then “Add to Home
              Screen”.
            </>
          ) : (
            "Open it from your home screen, even in the field."
          )}
        </p>
      </div>
      {!ios && evt && (
        <Button
          size="sm"
          className="gap-1.5"
          onClick={async () => {
            await evt.prompt();
            await evt.userChoice;
            setEvt(null);
            setShow(false);
          }}
        >
          <Download className="h-4 w-4" /> Install
        </Button>
      )}
      <Button variant="ghost" size="icon" aria-label="Dismiss" onClick={dismiss}>
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}
