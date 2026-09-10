import { useQuery } from "@tanstack/react-query";
import { getValidado } from "@/api/request";
import { apuSchema } from "@/api/schemas";
import { qk } from "@/api/queryKeys";
import type { ApuResponse } from "@/api/contract";
import { EstadoVacio } from "@/components/comunes/EstadoVacio";

const ORDEN_SECCIONES: readonly ApuResponse["secciones"][number]["tipo"][] = [
  "EQUIPO",
  "MANO_OBRA",
  "MATERIAL",
  "TRANSPORTE",
];

const etiquetas: Record<(typeof ORDEN_SECCIONES)[number], string> = {
  EQUIPO: "Equipo",
  MANO_OBRA: "Mano de obra",
  MATERIAL: "Material",
  TRANSPORTE: "Transporte",
};

export function PestanaInsumos({ apuId }: { apuId: string | null }) {
  const query = useQuery({
    queryKey: qk.apu(apuId ?? ""),
    queryFn: () => getValidado(`/apus/${apuId}`, apuSchema),
    enabled: Boolean(apuId),
  });

  if (!apuId) {
    return (
      <EstadoVacio
        titulo="Selecciona un APU"
        descripcion="Selecciona un rubro del presupuesto para consultar sus insumos."
      />
    );
  }
  if (query.isPending) {
    return (
      <output aria-busy="true" className="block p-4">
        Cargando insumos…
      </output>
    );
  }
  if (query.isError) {
    return (
      <div className="space-y-2 p-4">
        <p role="alert">No se pudieron cargar los insumos.</p>
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

  const secciones = query.data.secciones.toSorted((a, b) => {
    const ordenA = ORDEN_SECCIONES.indexOf(a.tipo);
    const ordenB = ORDEN_SECCIONES.indexOf(b.tipo);
    return ordenA - ordenB || a.orden - b.orden;
  });
  const filas = secciones.flatMap((seccion) =>
    seccion.detalles
      .toSorted((a, b) => a.orden - b.orden)
      .map((detalle) => ({
        detalle,
        seccion: etiquetas[seccion.tipo],
      })),
  );

  if (!filas.length) {
    return (
      <EstadoVacio
        titulo="Este APU no tiene insumos asociados"
        descripcion="No hay detalles de insumos para mostrar."
      />
    );
  }

  return (
    <div className="min-w-0 overflow-x-auto p-4 text-sm">
      <table className="w-full min-w-[520px] text-left text-xs">
        <caption className="sr-only">Insumos asociados al APU {query.data.codigo}</caption>
        <thead>
          <tr className="border-b">
            <th scope="col" className="px-1 py-1 font-medium">
              Sección
            </th>
            <th scope="col" className="px-1 py-1 font-medium">
              Descripción
            </th>
            <th scope="col" className="px-1 py-1 font-medium">
              Unidad
            </th>
            <th scope="col" className="px-1 py-1 font-medium">
              Cantidad
            </th>
          </tr>
        </thead>
        <tbody>
          {filas.map(({ detalle, seccion }) => (
            <tr key={detalle.id} className="border-b last:border-b-0">
              <td className="px-1 py-1">{seccion}</td>
              <td className="px-1 py-1">{detalle.descripcion}</td>
              <td className="px-1 py-1">{detalle.unidad ?? "—"}</td>
              <td className="px-1 py-1">{detalle.cantidad ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
