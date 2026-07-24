import type { FilaEditor } from "../hooks/useApuEditor";
import { CeldaEditable } from "./CeldaEditable";
import { BadgeHerencia } from "./BadgeHerencia";
import { BadgeAuxiliar } from "./BadgeAuxiliar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Trash2Icon, TriangleAlertIcon } from "lucide-react";
import { formatearMoneda } from "@/lib/decimal";

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
}

export function FilaDetalle({
  fila,
  muestraRendimiento,
  onEditarCelda,
  onRestaurarHerencia,
  onEliminarFila,
}: FilaDetalleProps) {
  const { detalle, protegida, heredado, esAuxiliar, estado } = fila;
  const esAuxiliarRow = esAuxiliar;

  if (protegida) {
    return (
      <TooltipProvider>
        <tr className="bg-muted/30 italic text-muted-foreground">
          <td className="p-2">
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
          <td className="p-2">{detalle.unidad ?? "—"}</td>
          <td className="p-2 num">—</td>
          {muestraRendimiento && <td className="p-2 num">—</td>}
          {muestraRendimiento && <td className="p-2 num">—</td>}
          {!muestraRendimiento && <td className="p-2 num">—</td>}
          <td className="p-2 num">{formatearMoneda(detalle.costo)}</td>
          <td className="p-2" />
        </tr>
      </TooltipProvider>
    );
  }

  return (
    <tr className={estado === "error" ? "bg-red-50" : estado === "pendiente" ? "opacity-70" : ""}>
      <td className="p-2">
        <div className="flex items-center gap-2">
          <span className="font-medium">{detalle.descripcion}</span>
          <BadgeAuxiliar esAuxiliar={esAuxiliarRow} />
        </div>
      </td>
      <td className="p-2">{detalle.unidad ?? "—"}</td>
      <td className="p-2 num">
        <CeldaEditable
          value={detalle.cantidad as unknown as string | null}
          onCommit={(v) => onEditarCelda(detalle.id, "cantidad", v)}
          editable={!protegida}
        />
      </td>
      {muestraRendimiento && (
        <td className="p-2 num">
          <CeldaEditable
            value={detalle.rendimiento as unknown as string | null}
            onCommit={(v) => onEditarCelda(detalle.id, "rendimiento", v)}
            editable={!protegida}
          />
        </td>
      )}
      {muestraRendimiento && (
        <td className="p-2 num">
          {detalle.costoHora != null ? formatearMoneda(detalle.costoHora) : "—"}
        </td>
      )}
      {!muestraRendimiento && (
        <td className="p-2 num">
          <div className="flex items-center gap-1">
            <CeldaEditable
              value={detalle.precioEfectivo}
              onCommit={(v) => onEditarCelda(detalle.id, "precioOverride", v)}
              editable={!esAuxiliarRow && !protegida}
            />
            {!esAuxiliarRow && (
              <BadgeHerencia
                heredero={heredado}
                onRestaurar={heredado ? undefined : () => onRestaurarHerencia(detalle.id)}
              />
            )}
          </div>
        </td>
      )}
      <td className="p-2 num">{formatearMoneda(detalle.costo)}</td>
      <td className="p-2">
        {!protegida && (
          <Button variant="ghost" size="icon-xs" onClick={() => onEliminarFila(detalle.id)}>
            <Trash2Icon className="size-3" />
          </Button>
        )}
      </td>
    </tr>
  );
}
