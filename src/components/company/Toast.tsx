'use client';

import { createContext, useCallback, useContext, useRef, useState, ReactNode } from 'react';
import { CheckCircle2, AlertCircle, X } from 'lucide-react';

type ToastKind = 'success' | 'error' | 'info';
interface ToastItem {
  id: number;
  kind: ToastKind;
  message: string;
  action?: { label: string; onClick: () => void };
}
type ToastFn = (t: Omit<ToastItem, 'id'> & { duration?: number }) => void;

const ToastContext = createContext<ToastFn>(() => {});

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  }, []);

  const toast = useCallback<ToastFn>(
    ({ duration, ...item }) => {
      const id = nextId.current++;
      // Keep at most three on screen; newest at the bottom.
      setItems((prev) => [...prev.slice(-2), { ...item, id }]);
      setTimeout(() => dismiss(id), duration ?? (item.action ? 6000 : 3500));
    },
    [dismiss]
  );

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div
        aria-live="polite"
        className="fixed z-60 left-4 right-4 bottom-20 md:bottom-6 md:left-auto md:right-6 md:w-96 flex flex-col gap-2 pointer-events-none"
      >
        {items.map((item) => (
          <div
            key={item.id}
            role={item.kind === 'error' ? 'alert' : 'status'}
            className={`pointer-events-auto flex items-center gap-3 rounded-xl border px-4 py-3 text-sm shadow-xl shadow-black/40 bg-brand-surface ${
              item.kind === 'error'
                ? 'border-red-500/30'
                : item.kind === 'success'
                ? 'border-emerald-500/30'
                : 'border-white/10'
            }`}
          >
            {item.kind === 'error' ? (
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            )}
            <span className="flex-1 text-white">{item.message}</span>
            {item.action && (
              <button
                onClick={() => {
                  item.action!.onClick();
                  dismiss(item.id);
                }}
                className="font-semibold text-brand-red-light hover:underline shrink-0"
              >
                {item.action.label}
              </button>
            )}
            <button
              onClick={() => dismiss(item.id)}
              className="p-1 -mr-1 text-brand-text-secondary hover:text-white shrink-0"
              aria-label="Close"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
