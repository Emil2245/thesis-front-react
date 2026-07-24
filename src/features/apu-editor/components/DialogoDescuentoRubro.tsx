import { useState } from "react";
import type { ApuResponse } from "@/api/contract";
import { formatearMoneda } from "@/lib/decimal";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface DialogoDescuentoRubroProps {
  abierto: boolean;
  onClose: () => void;
  apu: ApuResponse;
  onAplicarDescuento: (porcentaje: string) => Promise<void>;
}

export function DialogoDescuentoRubro({
  abierto,
  onClose,
  apu,
  onAplicarDescuento,
}: DialogoDescuentoRubroProps) {
  const [porcentaje, setPorcentaje] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [aplicando, setAplicando] = useState(false);

  const handleApply = async () => {
    const val = Number(porcentaje);
    if (porcentaje === "" || isNaN(val)) {
      setError("Ingresa un porcentaje válido");
      return;
    }
    if (val < 0 || val > 50) {
      setError("El descuento debe estar entre 0% y 50%");
      return;
    }
    setError(null);
    setAplicando(true);
    try {
      await onAplicarDescuento(porcentaje);
      onClose();
    } catch {
      setError("Error al aplicar descuento");
    } finally {
      setAplicando(false);
    }
  };

  const handleQuitar = async () => {
    setAplicando(true);
    try {
      await onAplicarDescuento("0");
      onClose();
    } catch {
      setError("Error al quitar descuento");
    } finally {
      setAplicando(false);
    }
  };

  const tieneDescuento = Number(apu.porcentajeDescuento) > 0;

  return (
    <Dialog open={abierto} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Descuento del rubro</DialogTitle>
          <DialogDescription>
            Aplica un descuento porcentual al costo directo de este rubro.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor="dcto-porcentaje">Porcentaje (0–50 %)</Label>
            <Input
              id="dcto-porcentaje"
              type="number"
              step="0.01"
              min={0}
              max={50}
              value={porcentaje}
              onChange={(e) => setPorcentaje(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleApply();
              }}
              autoFocus
            />
            {error && <p className="text-xs text-destructive">{error}</p>}
          </div>

          <div className="rounded bg-muted p-2 text-xs space-y-1">
            <div className="flex justify-between">
              <span>CD actual</span>
              <span className="num font-medium">{formatearMoneda(apu.costoDirecto)}</span>
            </div>
            <div className="flex justify-between">
              <span>CI actual</span>
              <span className="num font-medium">{formatearMoneda(apu.costoIndirecto)}</span>
            </div>
            <div className="flex justify-between">
              <span>CT actual</span>
              <span className="num font-medium">{formatearMoneda(apu.costoTotal)}</span>
            </div>
          </div>

          <p className="text-[10px] text-muted-foreground">
            El descuento se aplica al costo directo del rubro. No modifica los precios de tus
            insumos.
          </p>
        </div>

        <DialogFooter>
          {tieneDescuento && (
            <Button variant="outline" onClick={handleQuitar} disabled={aplicando}>
              Quitar descuento
            </Button>
          )}
          <Button onClick={handleApply} disabled={aplicando}>
            {aplicando ? "Aplicando…" : "Aplicar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
