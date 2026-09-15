import { useState, useRef, useCallback, useId } from "react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { AlertCircleIcon } from "lucide-react";

interface CeldaEditableProps {
  value: string | null;
  onCommit: (v: string) => Promise<void>;
  editable: boolean;
  className?: string;
  /** Plan 074 §2 (corregido en verificación independiente §1): mensaje de
   *  validación del esquema o del servidor para ESTA celda. No se comparte con
   *  las celdas vecinas: editar cantidad no debe filtrar su mensaje a
   *  rendimiento/precioOverride. La celda lo anuncia como descripción accesible
   *  (`aria-describedby` / `aria-errormessage`) y lo pinta con el icono
   *  `AlertCircle` y `text-destructive`. */
  mensajeError?: string;
}

export function CeldaEditable({
  value,
  onCommit,
  editable,
  className,
  mensajeError,
}: CeldaEditableProps) {
  const [editando, setEditando] = useState(false);
  const [editVal, setEditVal] = useState("");
  const [pendiente, setPendiente] = useState(false);
  const [error, setError] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  // ID estable por celda: la descripción accesible vive en un nodo que debe
  // estar montado SIEMPRE que `tieneErrorExterno` lo apunte (WAI-ARIA).
  // Renderizarlo sólo fuera de edición dejaba un id huérfano al abrir el input.
  const descripcionId = useId();

  const displayValue = value ?? "—";
  const tieneErrorExterno = Boolean(mensajeError);

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

  // Nodo de descripción accesible. Se monta mientras haya mensaje para que el
  // `aria-describedby`/`aria-errormessage` del botón y del input apunten a un
  // elemento real, tanto en reposo como durante la edición.
  const nodoMensaje = mensajeError ? (
    <output id={descripcionId} className="sr-only">
      {mensajeError}
    </output>
  ) : null;

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
        {nodoMensaje}
      </span>
    );
  }

  if (editando) {
    return (
      <span className={cn("block w-full", className)}>
        <Input
          ref={inputRef}
          value={editVal}
          onChange={(e) => setEditVal(e.target.value)}
          onBlur={confirmar}
          onKeyDown={(e) => {
            if (e.key === "Enter") confirmar();
            if (e.key === "Escape") cancelar();
          }}
          // El mensaje del servidor/esquema se sigue anunciando mientras se edita:
          // la invalidez del valor previo no se "cura" sólo por entrar a corregir.
          aria-invalid={tieneErrorExterno || undefined}
          aria-describedby={tieneErrorExterno ? descripcionId : undefined}
          aria-errormessage={tieneErrorExterno ? descripcionId : undefined}
          className="h-7 text-xs"
        />
        {nodoMensaje}
      </span>
    );
  }

  // `aria-invalid` no se admite sobre `<button>` (WAI-ARIA 1.2); la invalidez
  // se anuncia vía el nodo de descripción accesible (sr-only) al que apunta
  // `aria-describedby`. El icono AlertCircle + el color `destructive` siguen
  // dando la pista visual a usuarios sin lector de pantalla.
  return (
    <span className={cn("block w-full", className)}>
      <button
        type="button"
        onClick={iniciarEdicion}
        className={cn(
          "block w-full cursor-pointer rounded px-1 text-left hover:bg-muted",
          (error || tieneErrorExterno) && "text-destructive",
        )}
        aria-label={`Editar valor ${displayValue}`}
        aria-describedby={tieneErrorExterno ? descripcionId : undefined}
      >
        {(error || tieneErrorExterno) && (
          <AlertCircleIcon className="mr-1 inline size-3 text-destructive" />
        )}
        {displayValue}
      </button>
      {nodoMensaje}
    </span>
  );
}
