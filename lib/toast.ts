type ToastVariant = "default" | "success" | "destructive";

export type ToastOptions = {
  title: string;
  description?: string;
  variant?: ToastVariant;
  duration?: number;
};

export type ToastRecord = ToastOptions & {
  id: string;
  open: boolean;
};

type Listener = (toasts: ToastRecord[]) => void;

const listeners = new Set<Listener>();
let toasts: ToastRecord[] = [];

function emit() {
  for (const listener of listeners) {
    listener(toasts);
  }
}

function removeToast(id: string) {
  toasts = toasts.filter((toast) => toast.id !== id);
  emit();
}

export function toast(options: ToastOptions) {
  const id =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

  const record: ToastRecord = {
    id,
    open: true,
    duration: 3000,
    variant: "default",
    ...options,
  };

  toasts = [...toasts, record];
  emit();

  window.setTimeout(() => {
    toasts = toasts.map((toast) =>
      toast.id === id ? { ...toast, open: false } : toast
    );
    emit();

    window.setTimeout(() => {
      removeToast(id);
    }, 320);
  }, record.duration);

  return id;
}

export function dismissToast(id: string) {
  removeToast(id);
}

export function subscribeToToasts(listener: Listener) {
  listeners.add(listener);
  listener(toasts);

  return () => {
    listeners.delete(listener);
  };
}
