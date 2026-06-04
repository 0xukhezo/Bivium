/**
 * Toast notifications — singleton pub/sub store.
 *
 * The store lives outside React so any call site can fire a toast:
 *   - React components: `toast.success("Saved")`
 *   - Hook callbacks: `useEffect(() => { if (isSuccess) toast.success(...) })`
 *   - Plain TS modules: `import { toast } from "@/lib/toast"`
 *
 * <Toaster /> mounts once near the root and subscribes to the store. */

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
  /** Auto-dismiss after `duration` ms. Pass `null` to keep until the user
   *  dismisses it manually. Default 4500 ms. */
  duration: number | null;
  action?: ToastAction;
  /** Wall-clock creation timestamp — used by the renderer for stable sort
   *  even if React re-orders identical-id toasts during a transition. */
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
  /** Set to null to disable auto-dismiss. */
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
