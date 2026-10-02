import { useQuery } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { DialogoEditarApu } from "@/features/apu-editor/components/DialogoEditarApu";
import { getApu } from "@/api/apus";
import { qk } from "@/api/queryKeys";
import { mensajeCarga } from "../error";
import { EstadoVacio } from "@/components/comunes/EstadoVacio";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

const etiquetas = {
  EQUIPO: "Equipo",
  MANO_OBRA: "Mano de obra",
  MATERIAL: "Material",
  TRANSPORTE: "Transporte",
} as const;

export function PestanaApu({
  apuId,
  proyectoId,
  presupuestoId,
}: {
  apuId: string | null;
  proyectoId: string;
  presupuestoId?: string;
}) {
  const editarRef = useRef<HTMLButtonElement>(null);
  const [editorIdentidad, setEditorIdentidad] = useState<string | null>(null);
  const identidad = `${apuId}-${presupuestoId}`;
  const query = useQuery({
    queryKey: presupuestoId ? qk.apuWorkspace(presupuestoId, apuId ?? "") : qk.apu(apuId ?? ""),
    queryFn: () => getApu(apuId!),
    enabled: Boolean(apuId),
  });

  if (!apuId) {
    return (
      <EstadoVacio
        titulo="Selecciona un rubro"
        descripcion="Selecciona un rubro del presupuesto para consultar su APU."
      />
    );
  }
  if (query.isPending) return <output>Cargando APU…</output>;
  if (query.isError && !query.data) {
    return (
      <div className="space-y-2 p-3">
        <p role="alert">{mensajeCarga(query.error, "el APU")}</p>
        <button type="button" onClick={() => query.refetch()} className="underline">
          Reintentar
        </button>
      </div>
    );
  }
  if (!query.data) {
    return (
      <EstadoVacio
        titulo="APU no disponible"
        descripcion="No se encontró información para este rubro."
      />
    );
  }

  const apu = query.data;
  const secciones = apu.secciones.filter((s) => s.detalles.length > 0);
  return (
    <div className="flex h-full min-h-0 flex-col text-sm" aria-busy={query.isFetching}>
      <div className="scrollbar-discreet min-h-0 flex-1 space-y-3 overflow-auto p-3">
        <header className="flex items-start justify-between gap-2">
          <div className="min-w-0 space-y-0.5">
            <p className="flex flex-wrap items-baseline gap-x-2 text-xs text-muted-foreground">
              <span className="font-medium text-foreground">{apu.codigo}</span>
              <span>Unidad: {apu.unidad}</span>
            </p>
            <h2 className="text-sm leading-tight font-semibold wrap-anywhere">{apu.descripcion}</h2>
          </div>
          <Button
            size="sm"
            variant="outline"
            ref={editarRef}
            aria-label="Editar APU completo"
            onClick={() => setEditorIdentidad(identidad)}
          >
            Editar APU
          </Button>
        </header>
        {query.isError && <p role="alert">{mensajeCarga(query.error, "el APU")}</p>}
        {!secciones.length && (
          <EstadoVacio
            titulo="APU sin secciones"
            descripcion="Este APU no tiene composición para mostrar."
          />
        )}
        <div className="space-y-3">
          {secciones.map((seccion) => (
            <section
              key={`${seccion.tipo}-${seccion.orden}`}
              aria-labelledby={`seccion-${seccion.tipo}`}
            >
              <div className="flex flex-wrap justify-between gap-x-2 border-b pb-1 text-xs font-medium">
                <h3 id={`seccion-${seccion.tipo}`}>{etiquetas[seccion.tipo]}</h3>
                <span>Subtotal: {seccion.subtotal}</span>
              </div>
              <div className="scrollbar-discreet max-h-80 overflow-auto border border-border">
                <table className="w-full table-auto border-collapse text-left text-xs [&_th]:border [&_th]:border-border [&_td]:border [&_td]:border-border [&_td]:px-1 [&_td]:py-1 [&_td]:align-top">
                  <caption className="sr-only">Composición de {etiquetas[seccion.tipo]}</caption>
                  <thead className="sticky top-0 z-10 bg-muted">
                    <tr>
                      <th scope="col" className="px-1 py-1 font-medium">
                        Descripción
                      </th>
                      <th scope="col" className="px-1 py-1 font-medium">
                        Unidad
                      </th>
                      <th scope="col" className="px-1 py-1 text-right font-medium">
                        Cantidad
                      </th>
                      <th scope="col" className="px-1 py-1 text-right font-medium">
                        Rendimiento
                      </th>
                      <th scope="col" className="px-1 py-1 text-right font-medium">
                        Precio
                      </th>
                      <th scope="col" className="px-1 py-1 text-right font-medium">
                        Costo
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {seccion.detalles.map((detalle) => (
                      <tr key={detalle.id}>
                        <th scope="row" className="px-1 py-1 align-top font-normal wrap-anywhere">
                          {detalle.descripcion}
                        </th>
                        <td className="w-px text-center whitespace-nowrap">
                          {detalle.unidad ?? "—"}
                        </td>
                        <td className="num w-px text-right whitespace-nowrap">
                          {detalle.cantidad ?? "—"}
                        </td>
                        <td className="num w-px text-right whitespace-nowrap">
                          {detalle.rendimiento ?? "—"}
                        </td>
                        <td className="num w-px text-right whitespace-nowrap">
                          {detalle.precioEfectivo}
                        </td>
                        <td className="num w-px text-right whitespace-nowrap">{detalle.costo}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ))}
        </div>
      </div>
      <dl className="flex shrink-0 flex-wrap items-center justify-between gap-x-3 gap-y-1 border-t bg-card px-3 py-1.5 text-xs shadow-[0_-4px_10px_-8px_var(--foreground)]">
        <div className="flex items-baseline gap-1">
          <dt>
            <Tooltip>
              <TooltipTrigger asChild>
                <button type="button" className="cursor-help font-medium text-muted-foreground">
                  CD
                </button>
              </TooltipTrigger>
              <TooltipContent>Costo directo</TooltipContent>
            </Tooltip>
          </dt>
          <dd className="num font-medium">{apu.costoDirecto}</dd>
        </div>
        <div className="flex items-baseline gap-1">
          <dt>
            <Tooltip>
              <TooltipTrigger asChild>
                <button type="button" className="cursor-help font-medium text-muted-foreground">
                  CI
                </button>
              </TooltipTrigger>
              <TooltipContent>Costo indirecto</TooltipContent>
            </Tooltip>
          </dt>
          <dd className="num font-medium">{apu.costoIndirecto ?? "—"}</dd>
        </div>
        <div className="flex items-baseline gap-1">
          <dt>
            <Tooltip>
              <TooltipTrigger asChild>
                <button type="button" className="cursor-help font-medium text-muted-foreground">
                  CT
                </button>
              </TooltipTrigger>
              <TooltipContent>Costo total</TooltipContent>
            </Tooltip>
          </dt>
          <dd className="num font-semibold">{apu.costoTotal}</dd>
        </div>
        <div className="flex items-baseline gap-1">
          <dt>
            <Tooltip>
              <TooltipTrigger asChild>
                <button type="button" className="cursor-help font-medium text-muted-foreground">
                  CI ef.
                </button>
              </TooltipTrigger>
              <TooltipContent>Porcentaje de costo indirecto efectivo</TooltipContent>
            </Tooltip>
          </dt>
          <dd className="num font-medium">{apu.porcentajeIndirectoEfectivo}</dd>
        </div>
      </dl>
      {editorIdentidad === identidad && apuId && (
        <DialogoEditarApu
          key={identidad}
          apuId={apuId}
          proyectoId={proyectoId}
          presupuestoId={presupuestoId}
          onClose={() => setEditorIdentidad(null)}
          onRestaurarFoco={() => editarRef.current?.focus()}
        />
      )}
    </div>
  );
}
