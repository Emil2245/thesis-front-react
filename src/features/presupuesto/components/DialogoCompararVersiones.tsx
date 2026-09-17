import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ApiError } from "@/api/problem";
import type { PresupuestoVersionResponse } from "@/api/contract";
import { useComparacion } from "../hooks/usePresupuesto";
import { ComparadorVersiones } from "./ComparadorVersiones";

interface DialogoCompararVersionesProps {
  abierto: boolean;
  onOpenChange: (abierto: boolean) => void;
  versiones: PresupuestoVersionResponse[];
  /** Versión sobre cuya fila se pulsó "Comparar"; es el lado A por defecto. */
  versionInicialId: string | null;
}

/** La contraparte por defecto: la vigente si sirve, si no la primera distinta. */
function otraVersion(versiones: PresupuestoVersionResponse[], ladoA: string) {
  const vigente = versiones.find((v) => v.esVigente);
  if (vigente && vigente.presupuestoId !== ladoA) return vigente.presupuestoId;
  return versiones.find((v) => v.presupuestoId !== ladoA)?.presupuestoId ?? "";
}

export function DialogoCompararVersiones({
  abierto,
  onOpenChange,
  versiones,
  versionInicialId,
}: DialogoCompararVersionesProps) {
  // El estado arranca en la fila que se pulsó y no se reinicia solo: el padre
  // remonta este diálogo con un `key` cada vez que se abre o cambia la fila,
  // así un refetch del listado no borra lo que el usuario acaba de elegir.
  const [ladoA, setLadoA] = useState(() => versionInicialId ?? "");
  const [ladoB, setLadoB] = useState(() => otraVersion(versiones, versionInicialId ?? ""));

  // Comparar una versión consigo misma es un 400 `validacion` del backend, así
  // que es un estado inválido del formulario y la query se queda en reposo.
  // `abierto` entra en la condición porque al cerrar, el `key` del padre remonta
  // este diálogo con los dos lados ya rellenos: sin él saldría una petición cuyo
  // resultado no va a mirar nadie.
  const distintas = abierto && !!ladoA && !!ladoB && ladoA !== ladoB;
  const { data, isLoading, isError, error } = useComparacion(
    distintas ? ladoA : "",
    distintas ? ladoB : undefined,
  );

  const etiqueta = (v: PresupuestoVersionResponse) =>
    `v${v.version} ${v.esVigente ? "(vigente)" : ""} — ${new Date(v.fechaCreacion).toLocaleDateString()}`;

  return (
    <Dialog open={abierto} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Comparar versiones</DialogTitle>
          <DialogDescription>
            Elige las dos versiones cuyos totales quieres contrastar.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Versión A</Label>
              <Select value={ladoA} onValueChange={setLadoA}>
                <SelectTrigger aria-label="Versión A">
                  <SelectValue placeholder="Seleccionar versión A" />
                </SelectTrigger>
                <SelectContent>
                  {versiones.map((v) => (
                    <SelectItem key={v.presupuestoId} value={v.presupuestoId}>
                      {etiqueta(v)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Versión B</Label>
              <Select value={ladoB} onValueChange={setLadoB}>
                <SelectTrigger aria-label="Versión B">
                  <SelectValue placeholder="Seleccionar versión B" />
                </SelectTrigger>
                <SelectContent>
                  {versiones.map((v) => (
                    <SelectItem key={v.presupuestoId} value={v.presupuestoId}>
                      {etiqueta(v)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {!distintas && (
            <p className="text-sm text-muted-foreground">
              Elige dos versiones distintas para compararlas.
            </p>
          )}

          {isError && (
            <Alert variant="destructive">
              <AlertDescription>
                {error instanceof ApiError
                  ? error.problem.mensaje
                  : "No se pudo comparar las versiones"}
              </AlertDescription>
            </Alert>
          )}

          {distintas && !isError && <ComparadorVersiones data={data} isLoading={isLoading} />}
        </div>
      </DialogContent>
    </Dialog>
  );
}
