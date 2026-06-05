export type ToastVariant = "success" | "error" | "warn" | "info";

export interface ToastAction {
  label: string;
  onClick: () => void;
}

export interface Toast {
  id: string;
  variant: ToastVariant;
  title: string;
  description?: string;
  /** Auto-dismiss after `duration` ms; null keeps the toast until dismissed. */
  duration: number | null;
  action?: ToastAction;
  createdAt: number;
}

type Subscriber = (toasts: Toast[]) => void;

const subscribers = new Set<Subscriber>();
let toasts: Toast[] = [];

function emit() {
  for (const cb of subscribers) cb(toasts);
}

function genId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `t_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function subscribe(cb: Subscriber): () => void {
  subscribers.add(cb);
  return () => {
    subscribers.delete(cb);
  };
}

export function getToasts(): Toast[] {
  return toasts;
}

export function dismiss(id: string): void {
  const next = toasts.filter((t) => t.id !== id);
  if (next.length === toasts.length) return;
  toasts = next;
  emit();
}

export function dismissAll(): void {
  if (toasts.length === 0) return;
  toasts = [];
  emit();
}

interface PushOptions {
  description?: string;
  duration?: number | null;
  action?: ToastAction;
}

function push(variant: ToastVariant, title: string, opts?: PushOptions): string {
  const id = genId();
  const next: Toast = {
    id,
    variant,
    title,
    description: opts?.description,
    duration: opts?.duration === undefined ? 4500 : opts.duration,
    action: opts?.action,
    createdAt: Date.now(),
  };
  toasts = [...toasts, next];
  emit();
  return id;
}

export const toast = {
  success: (title: string, opts?: PushOptions) => push("success", title, opts),
  error: (title: string, opts?: PushOptions) => push("error", title, opts),
  warn: (title: string, opts?: PushOptions) => push("warn", title, opts),
  info: (title: string, opts?: PushOptions) => push("info", title, opts),
  dismiss,
  dismissAll,
};
