import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { UnidadTiempo } from "@/api/contract";

/** Límite canónico del backend, replicado también en el CHECK de `V009`. */
const MAX_PERIODOS: Record<UnidadTiempo, number> = { SEMANA: 520, MES: 120 };

interface DialogoConfigurarCronogramaProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (unidadTiempo: UnidadTiempo, numeroPeriodos: number) => void;
  unidadActual?: UnidadTiempo;
  periodosActual?: number;
  modo: "crear" | "reconfigurar";
}

export function DialogoConfigurarCronograma({
  open,
  onOpenChange,
  onConfirm,
  unidadActual = "MES",
  periodosActual = 4,
  modo,
}: DialogoConfigurarCronogramaProps) {
  const [unidad, setUnidad] = useState<UnidadTiempo>(unidadActual);
  const [periodos, setPeriodos] = useState(String(periodosActual));

  const max = MAX_PERIODOS[unidad];
  const n = Number(periodos);
  // Validar aquí y no esperar al 400: el backend responde
  // «numeroPeriodos fuera del límite canónico para MES: 1..120».
  const fueraDeRango = periodos !== "" && (!Number.isInteger(n) || n < 1 || n > max);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {modo === "crear" ? "Crear cronograma" : "Reconfigurar cronograma"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Unidad de tiempo</Label>
            <Select value={unidad} onValueChange={(v: UnidadTiempo) => setUnidad(v)}>
              <SelectTrigger aria-label="Unidad de tiempo">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="SEMANA">Semana</SelectItem>
                <SelectItem value="MES">Mes</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="periodos">Número de períodos</Label>
            <Input
              id="periodos"
              type="number"
              min={1}
              max={max}
              value={periodos}
              aria-invalid={fueraDeRango}
              onChange={(e) => setPeriodos(e.target.value)}
            />
            {fueraDeRango && (
              <p className="text-xs text-destructive">
                El número de períodos debe estar entre 1 y {max} para {unidad.toLowerCase()}.
              </p>
            )}
          </div>
          {modo === "reconfigurar" && (
            <p className="text-xs text-muted-foreground">
              Reducir los períodos o cambiar la unidad borra los avances que queden fuera; el
              cronograma pedirá confirmación y mostrará cuáles.
            </p>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          {/* El PUT es un reemplazo completo: siempre van los dos campos. */}
          <Button onClick={() => onConfirm(unidad, n)} disabled={periodos === "" || fueraDeRango}>
            {modo === "crear" ? "Crear" : "Reconfigurar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
