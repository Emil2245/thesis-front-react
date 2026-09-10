import { useQuery } from "@tanstack/react-query";
import { Link, useSearchParams } from "react-router-dom";
import { getApu } from "@/api/apus";
import { qk } from "@/api/queryKeys";
import { mensajeCarga } from "../error";
import { EstadoVacio } from "@/components/comunes/EstadoVacio";

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
    <div className="space-y-5 p-4 text-sm">
      <header className="space-y-1">
        <p className="font-medium">{apu.codigo}</p>
        <h2 className="text-lg font-semibold">{apu.descripcion}</h2>
        <p>Unidad: {apu.unidad}</p>
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
      <dl className="grid grid-cols-2 gap-2 border-t pt-3">
        <dt>Costo directo (CD)</dt>
        <dd>{apu.costoDirecto}</dd>
        <dt>Costo indirecto (CI)</dt>
        <dd>{apu.costoIndirecto ?? "—"}</dd>
        <dt>Costo total (CT)</dt>
        <dd>{apu.costoTotal}</dd>
        <dt>CI efectivo</dt>
        <dd>{apu.porcentajeIndirectoEfectivo}</dd>
      </dl>
      <Link className="underline" to={editorHref}>
        Editar APU completo
      </Link>
    </div>
  );
}
