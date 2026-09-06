import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { formatearPuntosPorcentaje } from "@/lib/decimal";
import type { ActividadCronogramaResponse, PerdidaAvanceResponse } from "@/api/contract";

interface DialogoConfirmarReduccionProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  /** Lo que viaja en el 409 `configuracion-cronograma-requiere-confirmacion`. */
  perdidas: PerdidaAvanceResponse[];
  actividades: ActividadCronogramaResponse[];
}

export function DialogoConfirmarReduccion({
  open,
  onOpenChange,
  onConfirm,
  perdidas,
  actividades,
}: DialogoConfirmarReduccionProps) {
  const itemDe = (actividadId: string) =>
    actividades.find((a) => a.id === actividadId)?.item ?? actividadId;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Confirmar cambio de configuración</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          {perdidas.length > 0
            ? "Estos avances se borrarán al aplicar la nueva configuración:"
            : "Se perderán los avances que queden fuera de la nueva configuración."}
        </p>
        {/* El único sitio donde el usuario ve QUÉ va a perder. Antes se leía
            `periodosAfectados`, un campo que el backend no manda, y la lista
            salía siempre vacía. */}
        {perdidas.length > 0 && (
          <div className="max-h-64 overflow-y-auto border rounded-md">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left px-3 py-2 font-medium">Actividad</th>
                  <th className="text-right px-3 py-2 font-medium">Período</th>
                  <th className="text-right px-3 py-2 font-medium">Avance</th>
                </tr>
              </thead>
              <tbody>
                {perdidas.map((p) => (
                  <tr key={`${p.actividadId}-${p.periodo}`} className="border-b last:border-b-0">
                    <td className="px-3 py-1.5 font-mono text-xs">{itemDe(p.actividadId)}</td>
                    <td className="px-3 py-1.5 text-right tabular-nums">{p.periodo}</td>
                    <td className="px-3 py-1.5 text-right font-mono tabular-nums">
                      {formatearPuntosPorcentaje(p.valor)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button variant="destructive" onClick={onConfirm}>
            Confirmar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
