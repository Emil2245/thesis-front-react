import type { ActividadCronogramaResponse, BloqueoExportResponse } from "@/api/contract";

/**
 * El preflight manda un `cronograma-desviacion` por actividad con su id, pero
 * con un `detalle` genérico: repetido N veces no dice cuál falta. Aquí se
 * cruza el id con la actividad para nombrarla. La regla la sigue decidiendo
 * el servidor; el cliente sólo pone el nombre.
 *
 * `cronograma-borrador` es la consecuencia de las desviaciones, no una causa
 * aparte: con la lista de actividades delante sobra.
 */
function actividadesPendientes(
  bloqueos: BloqueoExportResponse[],
  actividades: ActividadCronogramaResponse[],
): ActividadCronogramaResponse[] {
  const ids = new Set(
    bloqueos.filter((b) => b.codigo === "cronograma-desviacion").map((b) => b.actividadId),
  );
  return actividades.filter((actividad) => ids.has(actividad.id));
}

export function BloqueosCronograma({
  bloqueos,
  actividades,
  onSeleccionarActividad,
}: {
  bloqueos: BloqueoExportResponse[];
  actividades: ActividadCronogramaResponse[];
  onSeleccionarActividad?: (actividad: ActividadCronogramaResponse) => void;
}) {
  const pendientes = actividadesPendientes(bloqueos, actividades);
  const generales = bloqueos.filter(
    (b) =>
      b.codigo !== "cronograma-desviacion" &&
      !(b.codigo === "cronograma-borrador" && pendientes.length > 0),
  );

  return (
    <div className="space-y-2 text-sm">
      {pendientes.length > 0 && (
        <div className="space-y-1">
          <p>
            {pendientes.length === 1
              ? "Falta asignar en el cronograma 1 actividad:"
              : `Faltan asignar en el cronograma ${pendientes.length} actividades:`}
          </p>
          <ul className="max-h-48 space-y-0.5 overflow-y-auto">
            {pendientes.map((actividad) => (
              <li key={actividad.id} className="flex gap-2">
                <span className="shrink-0 font-mono text-xs leading-5 opacity-80">
                  {actividad.item}
                </span>
                {onSeleccionarActividad ? (
                  <button
                    type="button"
                    className="text-left underline-offset-2 hover:underline focus-visible:underline focus-visible:outline-none"
                    onClick={() => onSeleccionarActividad(actividad)}
                  >
                    {actividad.descripcion}
                  </button>
                ) : (
                  <span>{actividad.descripcion}</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
      {generales.length > 0 && (
        <ul className="list-inside list-disc">
          {generales.map((b) => (
            <li key={`${b.codigo}-${b.actividadId ?? ""}`}>{b.detalle}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
