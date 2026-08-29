import type { FilaEditor } from "../hooks/useApuEditor";
import { CeldaEditable } from "./CeldaEditable";
import { BadgeHerencia } from "./BadgeHerencia";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowDownIcon, ArrowUpIcon, Trash2Icon, TriangleAlertIcon } from "lucide-react";
import { formatearMoneda } from "@/lib/decimal";
import { cn } from "@/lib/utils";

interface FilaDetalleProps {
  fila: FilaEditor;
  muestraRendimiento: boolean;
  onEditarCelda: (
    detalleId: number,
    campo: "cantidad" | "rendimiento" | "precioOverride",
    valor: string,
  ) => Promise<void>;
  onRestaurarHerencia: (detalleId: number) => Promise<void>;
  onEliminarFila: (detalleId: number) => Promise<void>;
  onReordenarFila: (detalleId: number, nuevoOrden: number) => Promise<void>;
  indice: number;
  totalFilas: number;
}

export function FilaDetalle({
  fila,
  muestraRendimiento,
  onEditarCelda,
  onRestaurarHerencia,
  onEliminarFila,
  onReordenarFila,
  indice,
  totalFilas,
}: FilaDetalleProps) {
  const { detalle, protegida, heredado, estado } = fila;
  const esPrimera = indice === 0;
  const esUltima = indice === totalFilas - 1;

  const botonesOrden = (
    <>
      <Button
        variant="ghost"
        size="icon-xs"
        disabled={esPrimera}
        onClick={() => onReordenarFila(detalle.id, detalle.orden - 1)}
        aria-label="Subir fila"
      >
        <ArrowUpIcon className="size-3" />
      </Button>
      <Button
        variant="ghost"
        size="icon-xs"
        disabled={esUltima}
        onClick={() => onReordenarFila(detalle.id, detalle.orden + 1)}
        aria-label="Bajar fila"
      >
        <ArrowDownIcon className="size-3" />
      </Button>
    </>
  );

  if (protegida) {
    return (
      <TooltipProvider>
        <tr className="h-8 border-b bg-muted/30 text-muted-foreground italic last:border-0">
          <td className="px-2.5">
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="inline-flex items-center gap-1">
                  <TriangleAlertIcon className="size-3" />
                  {detalle.descripcion}
                </span>
              </TooltipTrigger>
              <TooltipContent>
                Se calcula automáticamente como %HM × Subtotal Mano de obra
              </TooltipContent>
            </Tooltip>
          </td>
          <td className="px-2.5">{detalle.unidad ?? "—"}</td>
          <td className="px-2.5 num">—</td>
          {muestraRendimiento && <td className="px-2.5 num">—</td>}
          {muestraRendimiento && <td className="px-2.5 num">—</td>}
          {!muestraRendimiento && <td className="px-2.5 num">—</td>}
          <td className="px-2.5 num">{formatearMoneda(detalle.costo)}</td>
          <td className="px-2.5">
            <div className="flex items-center">{botonesOrden}</div>
          </td>
        </tr>
      </TooltipProvider>
    );
  }

  return (
    <tr
      className={cn(
        "h-8 border-b last:border-0",
        estado === "error" && "bg-destructive/10",
        estado === "pendiente" && "opacity-70",
      )}
    >
      <td className="px-2.5">
        <div className="flex items-center gap-2">
          <span className="font-medium">{detalle.descripcion}</span>
          {detalle.insumoId === null && (
            <Badge variant="outline" className="text-amber-600 border-amber-300">
              Pendiente
            </Badge>
          )}
        </div>
      </td>
      <td className="px-2.5">{detalle.unidad ?? "—"}</td>
      <td className="px-2.5 num">
        <CeldaEditable
          value={detalle.cantidad != null ? String(detalle.cantidad) : null}
          onCommit={(v) => onEditarCelda(detalle.id, "cantidad", v)}
          editable={!protegida}
        />
      </td>
      {muestraRendimiento && (
        <td className="px-2.5 num">
          <CeldaEditable
            value={detalle.rendimiento != null ? String(detalle.rendimiento) : null}
            onCommit={(v) => onEditarCelda(detalle.id, "rendimiento", v)}
            editable={!protegida}
          />
        </td>
      )}
      {muestraRendimiento && (
        <td className="px-2.5 num">
          {detalle.costoHora != null ? formatearMoneda(detalle.costoHora) : "—"}
        </td>
      )}
      {!muestraRendimiento && (
        <td className="px-2.5 num">
          <div className="flex items-center gap-1">
            <CeldaEditable
              value={String(detalle.precioEfectivo)}
              onCommit={(v) => onEditarCelda(detalle.id, "precioOverride", v)}
              editable={!protegida}
            />
            <BadgeHerencia
              heredero={heredado}
              onRestaurar={heredado ? undefined : () => onRestaurarHerencia(detalle.id)}
            />
          </div>
        </td>
      )}
      <td className="px-2.5 num">{formatearMoneda(detalle.costo)}</td>
      <td className="px-2.5">
        <div className="flex items-center">
          {botonesOrden}
          <Button variant="ghost" size="icon-xs" onClick={() => onEliminarFila(detalle.id)}>
            <Trash2Icon className="size-3" />
          </Button>
        </div>
      </td>
    </tr>
  );
}
