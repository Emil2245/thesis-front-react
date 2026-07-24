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
  const [unidad, setUnidad] = useState(unidadActual);
  const [periodos, setPeriodos] = useState(String(periodosActual));

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
              max={120}
              value={periodos}
              onChange={(e) => setPeriodos(e.target.value)}
            />
          </div>
          {modo === "reconfigurar" && (
            <p className="text-xs text-muted-foreground">
              Reconfigurar puede perder los avances existentes si cambia el número de períodos.
            </p>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={() => {
              onConfirm(unidad, Number(periodos));
            }}
            disabled={!periodos || Number(periodos) < 1}
          >
            {modo === "crear" ? "Crear" : "Reconfigurar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
