"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AlertCircle, CheckCircle2, Info, X, AlertTriangle } from "lucide-react";
import { dismiss, getToasts, subscribe, type Toast as ToastT } from "@/lib/toast";

export function Toaster() {
  const [mounted, setMounted] = useState(false);
  const [toasts, setToasts] = useState<ToastT[]>([]);

  useEffect(() => {
    setMounted(true);
    setToasts(getToasts());
    return subscribe(setToasts);
  }, []);

  if (!mounted) return null;

  return createPortal(
    <div
      aria-live="polite"
      aria-atomic="false"
      className="pointer-events-none fixed inset-x-0 top-4 z-[100] flex flex-col items-end gap-2 px-4 sm:right-4 sm:left-auto sm:max-w-sm"
    >
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} />
      ))}
    </div>,
    document.body,
  );
}

const variantStyles: Record<
  ToastT["variant"],
  { container: string; icon: string; Icon: typeof CheckCircle2 }
> = {
  success: {
    container: "border-success/40 bg-bg-elevated",
    icon: "text-success",
    Icon: CheckCircle2,
  },
  error: {
    container: "border-danger/40 bg-bg-elevated",
    icon: "text-danger",
    Icon: AlertCircle,
  },
  warn: {
    container: "border-warn/40 bg-bg-elevated",
    icon: "text-warn",
    Icon: AlertTriangle,
  },
  info: {
    container: "border-border bg-bg-elevated",
    icon: "text-accent",
    Icon: Info,
  },
};

function ToastItem({ toast: t }: { toast: ToastT }) {
  const [exiting, setExiting] = useState(false);
  const { container, icon, Icon } = variantStyles[t.variant];

  useEffect(() => {
    if (t.duration === null) return;
    const id = window.setTimeout(() => {
      setExiting(true);
      window.setTimeout(() => dismiss(t.id), 200);
    }, t.duration);
    return () => window.clearTimeout(id);
  }, [t.id, t.duration]);

  const close = () => {
    setExiting(true);
    window.setTimeout(() => dismiss(t.id), 200);
  };

  return (
    <div
      role={t.variant === "error" ? "alert" : "status"}
      className={[
        "pointer-events-auto w-full overflow-hidden rounded-lg border shadow-card backdrop-blur",
        container,
        exiting ? "toast-exit" : "toast-enter",
      ].join(" ")}
    >
      <div className="flex items-start gap-3 px-4 py-3">
        <Icon
          size={18}
          className={`mt-0.5 shrink-0 ${icon}`}
          aria-hidden="true"
        />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium leading-snug text-text-primary">
            {t.title}
          </p>
          {t.description ? (
            <p className="mt-1 text-xs leading-snug text-text-secondary">
              {t.description}
            </p>
          ) : null}
          {t.action ? (
            <button
              type="button"
              onClick={() => {
                t.action!.onClick();
                close();
              }}
              className="mt-2 inline-flex h-7 items-center rounded-sm border border-border bg-bg px-2.5 text-xs font-medium text-text-primary transition-colors duration-base ease-out-expo hover:border-accent"
            >
              {t.action.label}
            </button>
          ) : null}
        </div>
        <button
          type="button"
          onClick={close}
          aria-label="Dismiss notification"
          className="ml-1 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-sm text-text-muted transition-colors duration-base ease-out-expo hover:bg-bg-sunken hover:text-text-primary"
        >
          <X size={14} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
