import type { DragEvent, ReactElement } from "react";
import type { SeccionTipo } from "@/api/contract";
import type { FilaEditor } from "../hooks/useApuEditor";
import { CeldaEditable } from "./CeldaEditable";
import { BadgeHerencia } from "./BadgeHerencia";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowDownIcon,
  ArrowUpIcon,
  GripVerticalIcon,
  Trash2Icon,
  TriangleAlertIcon,
} from "lucide-react";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { formatearMoneda } from "@/lib/decimal";
import { cn } from "@/lib/utils";

interface FilaDetalleProps {
  fila: FilaEditor;
  muestraRendimiento: boolean;
  onEditarCelda: (
    detalleId: string,
    campo: "cantidad" | "rendimiento" | "precioOverride",
    valor: string,
  ) => Promise<void>;
  onRestaurarHerencia: (detalleId: string) => Promise<void>;
  onEliminarFila: (detalleId: string) => Promise<void>;
  onReordenarFila: (detalleId: string, nuevoOrden: number) => Promise<void>;
  seccionTipo: SeccionTipo;
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
  seccionTipo,
  indice,
  totalFilas,
}: FilaDetalleProps) {
  const { detalle, protegida, heredado, estado } = fila;
  const esPrimera = indice === 0;
  const esUltima = indice === totalFilas - 1;

  const iniciarArrastre = (event: DragEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData(
      "text/plain",
      JSON.stringify({ detalleId: detalle.id, seccionTipo, indice }),
    );
  };

  const arrastrarSobre = (event: DragEvent<HTMLTableRowElement>) => {
    if (event.dataTransfer.types.includes("text/plain")) {
      event.preventDefault();
      event.dataTransfer.dropEffect = "move";
    }
  };

  const soltar = (event: DragEvent<HTMLTableRowElement>) => {
    event.preventDefault();
    const raw = event.dataTransfer.getData("text/plain");
    if (!raw) return;

    try {
      const payload = JSON.parse(raw) as {
        detalleId?: string;
        seccionTipo?: SeccionTipo;
        indice?: number;
      };
      if (
        payload.detalleId === undefined ||
        payload.seccionTipo !== seccionTipo ||
        payload.indice === undefined ||
        payload.detalleId === detalle.id
      )
        return;

      const after =
        event.clientY >=
        event.currentTarget.getBoundingClientRect().top +
          event.currentTarget.getBoundingClientRect().height / 2;
      const indiceInsercion = indice + (after ? 1 : 0);
      const indiceFinal = payload.indice < indiceInsercion ? indiceInsercion - 1 : indiceInsercion;
      if (indiceFinal !== payload.indice) {
        void onReordenarFila(payload.detalleId, indiceFinal + 1);
      }
    } catch {
      // Ignore drops that did not originate from an APU detail handle.
    }
  };

  const envolverFila = (row: ReactElement) => (
    <ContextMenu key={detalle.id}>
      <ContextMenuTrigger asChild>{row}</ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem
          disabled={esPrimera}
          onSelect={() => onReordenarFila(detalle.id, detalle.orden - 1)}
        >
          Subir fila <span className="ml-auto text-xs text-muted-foreground">↑</span>
        </ContextMenuItem>
        <ContextMenuItem
          disabled={esUltima}
          onSelect={() => onReordenarFila(detalle.id, detalle.orden + 1)}
        >
          Bajar fila <span className="ml-auto text-xs text-muted-foreground">↓</span>
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );

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
        {envolverFila(
          <tr
            className="h-8 border-b bg-muted/30 text-muted-foreground italic last:border-0"
            onDragOver={arrastrarSobre}
            onDrop={soltar}
          >
            <td className="px-2.5">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  draggable
                  aria-label={`Arrastrar ${detalle.descripcion}`}
                  title="Arrastrar para mover"
                  onDragStart={iniciarArrastre}
                  className="inline-flex size-5 shrink-0 cursor-grab items-center justify-center rounded text-muted-foreground hover:bg-muted active:cursor-grabbing"
                >
                  <GripVerticalIcon aria-hidden className="size-3.5" />
                </button>
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
              </div>
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
          </tr>,
        )}
      </TooltipProvider>
    );
  }

  return envolverFila(
    <tr
      className={cn(
        "h-8 border-b last:border-0",
        estado === "error" && "bg-destructive/10",
        estado === "pendiente" && "opacity-70",
      )}
      onDragOver={arrastrarSobre}
      onDrop={soltar}
    >
      <td className="px-2.5">
        <div className="flex items-center gap-2">
          <button
            type="button"
            draggable
            aria-label={`Arrastrar ${detalle.descripcion}`}
            title="Arrastrar para mover"
            onDragStart={iniciarArrastre}
            className="inline-flex size-5 shrink-0 cursor-grab items-center justify-center rounded text-muted-foreground hover:bg-muted active:cursor-grabbing"
          >
            <GripVerticalIcon aria-hidden className="size-3.5" />
          </button>
          <span className="font-medium">{detalle.descripcion}</span>
          {detalle.insumoId == null && (
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
          mensajeError={fila.mensajesValidacion.cantidad}
        />
      </td>
      {muestraRendimiento && (
        <td className="px-2.5 num">
          <CeldaEditable
            value={detalle.rendimiento != null ? String(detalle.rendimiento) : null}
            onCommit={(v) => onEditarCelda(detalle.id, "rendimiento", v)}
            editable={!protegida}
            mensajeError={fila.mensajesValidacion.rendimiento}
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
              mensajeError={fila.mensajesValidacion.precioOverride}
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
          <Button
            variant="ghost"
            size="icon-xs"
            aria-label="Eliminar fila"
            onClick={() => onEliminarFila(detalle.id)}
          >
            <Trash2Icon className="size-3" />
          </Button>
        </div>
      </td>
    </tr>,
  );
}
