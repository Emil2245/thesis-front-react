import { useQuery } from "@tanstack/react-query";
import { Link, useSearchParams } from "react-router-dom";
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
  const [params] = useSearchParams();
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
  if (query.isFetching) return <output aria-busy="true">Cargando APU…</output>;
  if (query.isError) {
    return (
      <div className="space-y-2 p-4">
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
  if (!secciones.length) {
    return (
      <EstadoVacio
        titulo="APU sin secciones"
        descripcion="Este APU no tiene composición para mostrar."
      />
    );
  }
  const version = params.get("v");
  const editorHref = `/proyectos/${proyectoId}/apus/${apuId}${
    version === null ? "" : `?v=${encodeURIComponent(version)}`
  }`;
  return (
    <div className="flex h-full min-h-0 flex-col text-sm">
      <div className="scrollbar-discreet min-h-0 flex-1 space-y-5 overflow-auto p-4">
        <header className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <p className="font-medium">{apu.codigo}</p>
            <h2 className="text-lg font-semibold">{apu.descripcion}</h2>
            <p>Unidad: {apu.unidad}</p>
          </div>
          <Button asChild size="sm" variant="outline">
            <Link aria-label="Editar APU completo" to={editorHref}>
              Editar APU
            </Link>
          </Button>
        </header>
        <div className="space-y-4">
          {secciones.map((seccion) => (
            <section
              key={`${seccion.tipo}-${seccion.orden}`}
              aria-labelledby={`seccion-${seccion.tipo}`}
            >
              <div className="flex justify-between border-b pb-1 font-medium">
                <h3 id={`seccion-${seccion.tipo}`}>{etiquetas[seccion.tipo]}</h3>
                <span>Subtotal: {seccion.subtotal}</span>
              </div>
              <table className="w-full text-left text-xs">
                <caption className="sr-only">Composición de {etiquetas[seccion.tipo]}</caption>
                <thead>
                  <tr>
                    <th scope="col" className="px-1 py-1 font-medium">
                      Descripción
                    </th>
                    <th scope="col" className="px-1 py-1 font-medium">
                      Unidad
                    </th>
                    <th scope="col" className="px-1 py-1 font-medium">
                      Cantidad
                    </th>
                    <th scope="col" className="px-1 py-1 font-medium">
                      Rendimiento
                    </th>
                    <th scope="col" className="px-1 py-1 font-medium">
                      Precio
                    </th>
                    <th scope="col" className="px-1 py-1 font-medium">
                      Costo
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {seccion.detalles.map((detalle) => (
                    <tr key={detalle.id}>
                      <td>{detalle.descripcion}</td>
                      <td>{detalle.unidad ?? "—"}</td>
                      <td>{detalle.cantidad ?? "—"}</td>
                      <td>{detalle.rendimiento ?? "—"}</td>
                      <td>{detalle.precioEfectivo}</td>
                      <td>{detalle.costo}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          ))}
        </div>
      </div>
      <dl className="flex shrink-0 flex-wrap items-center justify-between gap-x-4 gap-y-1 border-t bg-card px-4 py-2 text-sm shadow-[0_-4px_10px_-8px_var(--foreground)]">
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
    </div>
  );
}
