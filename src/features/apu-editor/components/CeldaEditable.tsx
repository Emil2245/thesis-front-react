import { useState, useRef, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { AlertCircleIcon } from "lucide-react";

interface CeldaEditableProps {
  value: string | null;
  onCommit: (v: string) => Promise<void>;
  editable: boolean;
  className?: string;
}

export function CeldaEditable({ value, onCommit, editable, className }: CeldaEditableProps) {
  const [editando, setEditando] = useState(false);
  const [editVal, setEditVal] = useState("");
  const [pendiente, setPendiente] = useState(false);
  const [error, setError] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const displayValue = value ?? "—";

  const iniciarEdicion = useCallback(() => {
    if (!editable || pendiente) return;
    setEditVal(value ?? "");
    setEditando(true);
    setError(false);
    requestAnimationFrame(() => inputRef.current?.focus());
  }, [editable, pendiente, value]);

  const confirmar = useCallback(async () => {
    if (!editando || pendiente) return;
    setEditando(false);
    setPendiente(true);
    setError(false);
    try {
      await onCommit(editVal);
    } catch {
      setError(true);
    } finally {
      setPendiente(false);
    }
  }, [editando, pendiente, editVal, onCommit]);

  const cancelar = useCallback(() => {
    setEditando(false);
    setError(false);
  }, []);

  if (!editable) {
    return (
      <span className={cn("block", className)} title="Celda protegida">
        {displayValue}
      </span>
    );
  }

  if (pendiente) {
    return (
      <span
        className={cn("inline-flex items-center gap-1 italic text-muted-foreground", className)}
      >
        {displayValue}
        <Spinner className="size-3" />
      </span>
    );
  }

  if (editando) {
    return (
      <Input
        ref={inputRef}
        value={editVal}
        onChange={(e) => setEditVal(e.target.value)}
        onBlur={confirmar}
        onKeyDown={(e) => {
          if (e.key === "Enter") confirmar();
          if (e.key === "Escape") cancelar();
        }}
        className={cn("h-7 text-xs", className)}
      />
    );
  }

  return (
    <button
      type="button"
      onClick={iniciarEdicion}
      className={cn(
        "block w-full cursor-pointer rounded px-1 text-left hover:bg-muted",
        error && "text-destructive",
        className,
      )}
      aria-label={`Editar valor ${displayValue}`}
    >
      {error && <AlertCircleIcon className="mr-1 inline size-3 text-destructive" />}
      {displayValue}
    </button>
  );
}
