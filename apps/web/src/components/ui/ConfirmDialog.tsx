import { createContext, useCallback, useContext, useRef, useState } from "react";
import { Modal } from "./Modal";
import { Button } from "./Button";

export interface ConfirmOptions {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
}

type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

/**
 * Hook para confirmação imperativa, consistente com o design (substitui
 * `window.confirm`). Uso: `const confirm = useConfirm(); if (await confirm({...})) ...`
 */
export function useConfirm(): ConfirmFn {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error("useConfirm precisa estar dentro de <ConfirmProvider>");
  return ctx;
}

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const resolver = useRef<((value: boolean) => void) | null>(null);

  const confirm = useCallback<ConfirmFn>((opts) => {
    setOptions(opts);
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  const close = useCallback((result: boolean) => {
    resolver.current?.(result);
    resolver.current = null;
    setOptions(null);
  }, []);

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <Modal open={options !== null} onClose={() => close(false)} title={options?.title ?? ""}>
        {options?.description && <p className="text-sm text-text-2 mb-6">{options.description}</p>}
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => close(false)}>
            {options?.cancelLabel ?? "Cancelar"}
          </Button>
          <Button variant={options?.danger ? "danger" : "primary"} onClick={() => close(true)}>
            {options?.confirmLabel ?? "Confirmar"}
          </Button>
        </div>
      </Modal>
    </ConfirmContext.Provider>
  );
}
