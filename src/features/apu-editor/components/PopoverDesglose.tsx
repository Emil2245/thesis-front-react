import { useApuCalculo } from "../hooks/useApuCalculo";
import { formatearMoneda, formatearPorcentaje } from "@/lib/decimal";
import type { SeccionTipo } from "@/api/contract";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

interface PopoverDesgloseProps {
  abierto: boolean;
  onClose: () => void;
  apuId: string;
}

const BLOQUE: Record<SeccionTipo, string> = {
  EQUIPO: "M",
  MANO_OBRA: "N",
  MATERIAL: "O",
  TRANSPORTE: "P",
};

const ETIQUETA: Record<SeccionTipo, string> = {
  EQUIPO: "Equipo",
  MANO_OBRA: "Mano de obra",
  MATERIAL: "Materiales",
  TRANSPORTE: "Transporte",
};

export function PopoverDesglose({ abierto, onClose, apuId }: PopoverDesgloseProps) {
  const { data, isPending } = useApuCalculo(apuId, abierto);

  return (
    <Dialog open={abierto} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Desglose de cálculo</DialogTitle>
          <DialogDescription>
            Detalle del cálculo del costo directo, indirecto y total.
          </DialogDescription>
        </DialogHeader>

        {isPending && <p className="text-sm text-muted-foreground">Cargando…</p>}

        {data && (
          <div className="max-h-[60vh] space-y-4 overflow-y-auto text-sm">
            <div className="flex justify-between gap-4 rounded bg-muted p-2 text-xs">
              <span className="text-muted-foreground">
                %HM {formatearPorcentaje(data.parametros.hm)}
              </span>
              <span className="text-muted-foreground">
                %CI aplicado {formatearPorcentaje(data.parametros.ciAplicado)}
              </span>
            </div>

            {data.secciones.map((seccion) => (
              <div key={seccion.tipo} className="space-y-1">
                <p className="text-xs font-semibold text-muted-foreground">
                  {BLOQUE[seccion.tipo]} · {ETIQUETA[seccion.tipo]}
                </p>
                {seccion.lineas.map((linea) => (
                  <div
                    key={linea.detalleId}
                    className="flex items-baseline justify-between gap-3 border-b pb-1 text-xs last:border-0"
                  >
                    <span className="min-w-0 flex-1 truncate">{linea.descripcion}</span>
                    {/* `operacion` es la fórmula que ya compone el backend: aquí
                        sólo se muestra, no se vuelve a armar. */}
                    <span className="font-mono text-[11px] text-muted-foreground">
                      {linea.operacion}
                    </span>
                    <span className="num font-medium">{formatearMoneda(linea.resultado)}</span>
                  </div>
                ))}
                <div className="flex justify-between text-xs">
                  <span className="font-mono text-[11px] text-muted-foreground">
                    {seccion.operacion}
                  </span>
                  <span className="num font-medium">
                    Subtotal {formatearMoneda(seccion.subtotal)}
                  </span>
                </div>
              </div>
            ))}

            <div className="space-y-1 border-t pt-2">
              <div className="flex justify-between text-xs">
                <span>CD</span>
                <span className="num font-medium">{formatearMoneda(data.resumen.cd)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span>CI</span>
                <span className="num font-medium">{formatearMoneda(data.resumen.ci)}</span>
              </div>
              <div className="flex justify-between text-xs font-bold">
                <span>CT</span>
                <span className="num">{formatearMoneda(data.resumen.ct)}</span>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
