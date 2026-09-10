import type { ReactElement } from "react";
import type {
  CapituloCronogramaResponse,
  CronogramaResponse,
  GanttBloqueResponse,
  RubroCronogramaResponse,
} from "@/api/contract";

type JerarquiaCronogramaProps = {
  /** Preferred prop for the complete Gantt projection. */
  gantt?: GanttBloqueResponse;
  /** Kept for small consumers that only need the tree structure. */
  capitulos?: CapituloCronogramaResponse[];
  cronograma?: CronogramaResponse;
};

function etiquetaPeriodo(unidadTiempo: CronogramaResponse["unidadTiempo"], periodo: number) {
  return `${unidadTiempo === "SEMANA" ? "S" : "M"}${periodo}`;
}

function periodosDe(cronograma: CronogramaResponse | undefined) {
  if (!cronograma) return [];
  return Array.from({ length: cronograma.numeroPeriodos }, (_, index) => index + 1);
}

function filaDeRubro(
  rubro: RubroCronogramaResponse,
  nivel: number,
  periodos: number[],
): ReactElement[] {
  const actividad = rubro.actividad;
  const filaRubro = (
    <tr key={`rubro-${rubro.id}`} data-level={nivel}>
      <th scope="row" className="whitespace-nowrap px-3 py-2 text-left font-medium">
        <span className="font-mono text-xs text-muted-foreground">{rubro.item}</span>{" "}
        <span>{rubro.descripcion}</span>
        <span className="ml-2 text-xs text-muted-foreground">{rubro.codigo}</span>
      </th>
      <td className="px-3 py-2 text-sm text-muted-foreground">
        {actividad ? "Actividad" : "Sin actividad"}
      </td>
      <td colSpan={periodos.length || 1} className="px-3 py-2 text-sm text-muted-foreground">
        {rubro.montoTotal ?? "—"}
      </td>
    </tr>
  );

  if (!actividad) return [filaRubro];

  const filaActividad = (
    <tr key={`actividad-${actividad.id}`} data-level={nivel + 1}>
      <th scope="row" className="whitespace-nowrap px-3 py-2 text-left font-normal">
        <span className="font-mono text-xs text-muted-foreground">{actividad.item}</span>{" "}
        <span>{actividad.descripcion}</span>
      </th>
      <td className="px-3 py-2 text-sm">
        <div className="flex flex-wrap gap-x-1 text-xs" aria-label="Segmentos de actividad">
          {actividad.segmentos.length === 0 ? (
            <span className="text-muted-foreground">—</span>
          ) : (
            actividad.segmentos.map((segmento, index) => (
              <span key={`${segmento.inicio}-${segmento.fin}`}>
                <span data-segmento={`${segmento.inicio}-${segmento.fin}`}>
                  {segmento.inicio}–{segmento.fin}
                </span>
                {index < actividad.segmentos.length - 1 ? ", " : null}
              </span>
            ))
          )}
        </div>
      </td>
      {periodos.map((periodo) => {
        const segmento = actividad.segmentos.find(
          (candidato) => periodo >= candidato.inicio && periodo <= candidato.fin,
        );
        const valor = actividad.avancePorPeriodo[String(periodo)];
        return (
          <td
            key={periodo}
            className="min-w-20 border-l px-2 py-2 text-right font-mono text-xs tabular-nums"
            data-segmento={segmento ? `${segmento.inicio}-${segmento.fin}` : undefined}
          >
            {segmento ? (valor ?? "—") : "—"}
          </td>
        );
      })}
    </tr>
  );

  return [filaRubro, filaActividad];
}

function filasDeCapitulo(
  capitulo: CapituloCronogramaResponse,
  nivel: number,
  periodos: number[],
): ReactElement[] {
  const fila = (
    <tr key={`capitulo-${capitulo.id}`} data-level={nivel}>
      <th scope="row" className="whitespace-nowrap px-3 py-2 text-left font-semibold">
        <span className="font-mono text-xs text-muted-foreground">{capitulo.item}</span>{" "}
        {capitulo.descripcion}
      </th>
      <td className="px-3 py-2 text-xs text-muted-foreground">Capítulo</td>
      <td colSpan={periodos.length || 1} className="px-3 py-2 text-xs text-muted-foreground">
        —
      </td>
    </tr>
  );

  return [
    fila,
    ...capitulo.subcapitulos.flatMap((hijo) => filasDeCapitulo(hijo, nivel + 1, periodos)),
    ...capitulo.rubros.flatMap((rubro) => filaDeRubro(rubro, nivel + 1, periodos)),
  ];
}

export function JerarquiaCronograma({
  gantt,
  capitulos: capitulosProp,
  cronograma: cronogramaProp,
}: JerarquiaCronogramaProps) {
  const capitulos = gantt?.capitulos ?? capitulosProp ?? [];
  const cronograma = gantt?.cronograma ?? cronogramaProp;
  const periodos = periodosDe(cronograma);

  return (
    <section aria-labelledby="gantt-jerarquico-titulo" className="space-y-3">
      <h2 id="gantt-jerarquico-titulo" className="text-base font-semibold">
        Gantt jerárquico
      </h2>
      {capitulos.length === 0 ? (
        <p className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
          No hay capítulos para mostrar en el Gantt.
        </p>
      ) : (
        <details open className="rounded-lg border">
          <summary className="cursor-pointer px-3 py-2 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            Capítulos, rubros y actividades
          </summary>
          <div className="overflow-x-auto border-t">
            <table className="min-w-full text-sm">
              <caption className="sr-only">
                Gantt jerárquico por capítulo, rubro, actividad y período
              </caption>
              <thead className="bg-muted/50">
                <tr>
                  <th scope="col" className="px-3 py-2 text-left font-medium">
                    Elemento
                  </th>
                  <th scope="col" className="px-3 py-2 text-left font-medium">
                    Segmentos
                  </th>
                  {periodos.map((periodo) => (
                    <th
                      key={periodo}
                      scope="col"
                      className="min-w-20 px-2 py-2 text-right font-medium"
                    >
                      {cronograma
                        ? etiquetaPeriodo(cronograma.unidadTiempo, periodo)
                        : `P${periodo}`}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {capitulos.flatMap((capitulo) => filasDeCapitulo(capitulo, 1, periodos))}
              </tbody>
            </table>
          </div>
        </details>
      )}
    </section>
  );
}
