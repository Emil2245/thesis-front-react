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
import type { ActividadAvanceRequest, ActividadResponse } from "@/api/contract";
import { formatearMoneda } from "@/lib/decimal";

interface DialogoEditarActividadProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (body: ActividadAvanceRequest) => void;
  actividad: ActividadResponse;
  numeroPeriodos: number;
}

export function DialogoEditarActividad({
  open,
  onOpenChange,
  onConfirm,
  actividad,
  numeroPeriodos,
}: DialogoEditarActividadProps) {
  const [avances, setAvances] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    for (let i = 1; i <= numeroPeriodos; i++) {
      init[String(i)] = actividad.avancePorPeriodo[String(i)] || "0.000000";
    }
    return init;
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {actividad.item} — {actividad.descripcion}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="flex justify-between text-sm border-b pb-2">
            <span className="text-muted-foreground">Total</span>
            <span className="font-mono tabular-nums">{formatearMoneda(actividad.precioTotal)}</span>
          </div>
          {Array.from({ length: numeroPeriodos }, (_, i) => {
            const periodo = i + 1;
            return (
              <div key={periodo} className="space-y-1">
                <Label htmlFor={`p${periodo}`}>Período {periodo}</Label>
                <Input
                  id={`p${periodo}`}
                  type="text"
                  className="text-right font-mono"
                  value={avances[String(periodo)]}
                  onChange={(e) =>
                    setAvances((prev) => ({ ...prev, [String(periodo)]: e.target.value }))
                  }
                />
              </div>
            );
          })}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={() =>
              onConfirm({
                avancePorPeriodo: avances as Record<string, import("@/lib/decimal").Decimal>,
              })
            }
          >
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
