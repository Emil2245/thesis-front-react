import { z } from "zod";
import { formatearPorcentaje } from "@/lib/decimal";
import type { PlantillaProyectoResponse } from "@/api/contract";
import { InsigniaOrigen } from "@/components/comunes/InsigniaOrigen";

/**
 * Lectura tolerante del `snapshotEstructura`. El contrato lo declara `unknown`
 * porque el backend lo expone como `JsonNode` opaco; su forma real es la de
 * los records de `SnapshotProyectoMapper` (cabecera, parámetros, capítulos
 * recursivos con rubros y APU estructural). Se estrecha aquí, en el único
 * consumidor, con todo opcional: los seeds V004 no traen cabecera ni
 * parámetros, y un snapshot que no case no debe romper la pantalla.
 */
const numeroSnapshot = z.union([z.number(), z.string()]).nullish();

const rubroSchema = z.object({
  item: z.string().nullish(),
  codigo: z.string().nullish(),
  descripcion: z.string().nullish(),
  unidad: z.string().nullish(),
  apu: z.object({ filas: z.array(z.unknown()).nullish() }).nullish(),
});

type CapituloSnapshot = {
  item?: string | null;
  descripcion?: string | null;
  hijos?: CapituloSnapshot[] | null;
  rubros?: z.infer<typeof rubroSchema>[] | null;
};

const capituloSchema: z.ZodType<CapituloSnapshot> = z.lazy(() =>
  z.object({
    item: z.string().nullish(),
    descripcion: z.string().nullish(),
    hijos: z.array(capituloSchema).nullish(),
    rubros: z.array(rubroSchema).nullish(),
  }),
);

const snapshotSchema = z.object({
  cabecera: z
    .object({
      codigo: z.string().nullish(),
      descripcion: z.string().nullish(),
      plazoEjecucion: numeroSnapshot,
      plazoUnidad: z.string().nullish(),
      direccionInstitucional: z.string().nullish(),
    })
    .nullish(),
  parametros: z
    .object({
      porcentajeHerramientaMenor: numeroSnapshot,
      porcentajeIndirecto: numeroSnapshot,
      iva: numeroSnapshot,
      moneda: z.string().nullish(),
    })
    .nullish(),
  capitulos: z.array(capituloSchema).nullish(),
});

const PLAZO: Record<string, string> = { DIA: "días", SEMANA: "semanas", MES: "meses" };

function contarRubros(caps: CapituloSnapshot[]): number {
  return caps.reduce(
    (total, c) => total + (c.rubros?.length ?? 0) + contarRubros(c.hijos ?? []),
    0,
  );
}

function Dato({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-muted-foreground">{etiqueta}</dt>
      <dd className="text-right">{valor}</dd>
    </div>
  );
}

function Capitulo({ capitulo, nivel }: { capitulo: CapituloSnapshot; nivel: number }) {
  return (
    <li>
      <p
        className={
          nivel === 0 ? "text-sm font-semibold" : "text-sm font-medium text-muted-foreground"
        }
      >
        <span className="mr-2 font-mono text-xs">{capitulo.item}</span>
        {capitulo.descripcion}
      </p>
      {(!!capitulo.rubros?.length || !!capitulo.hijos?.length) && (
        <ul className="mt-1 space-y-1 border-l pl-3">
          {capitulo.rubros?.map((r, i) => (
            <li
              key={`${r.item ?? r.codigo ?? "rubro"}-${i}`}
              className="flex items-baseline gap-2 text-sm"
            >
              <span className="font-mono text-xs text-muted-foreground">{r.item}</span>
              <span className="min-w-0 flex-1">{r.descripcion}</span>
              <span className="shrink-0 text-xs text-muted-foreground">
                {r.unidad}
                {r.apu?.filas ? ` · ${r.apu.filas.length} filas APU` : ""}
              </span>
            </li>
          ))}
          {capitulo.hijos?.map((h, i) => (
            <Capitulo key={`${h.item ?? "cap"}-${i}`} capitulo={h} nivel={nivel + 1} />
          ))}
        </ul>
      )}
    </li>
  );
}

/**
 * Vista de solo lectura de una plantilla de proyecto: cabecera, parámetros
 * de cálculo y el árbol de capítulos y rubros. El snapshot no lleva precios ni
 * cantidades de obra (Plan 06 del backend): se muestra estructura.
 */
export function VistaPreviaPlantillaProyecto({
  plantilla,
}: {
  plantilla: Pick<PlantillaProyectoResponse, "nombre" | "tipo" | "descripcion"> & {
    snapshotEstructura?: unknown;
  };
}) {
  const leido = snapshotSchema.safeParse(plantilla.snapshotEstructura);
  if (!leido.success)
    return (
      <p role="alert" className="text-sm text-destructive">
        No se pudo interpretar la estructura de esta plantilla.
      </p>
    );

  const { cabecera, parametros, capitulos = [] } = leido.data;
  const caps = capitulos ?? [];

  return (
    <div className="space-y-4">
      <header className="space-y-1">
        <div className="flex items-center gap-2">
          <h3 className="text-base font-semibold">{plantilla.nombre}</h3>
          <InsigniaOrigen tipo={plantilla.tipo} />
        </div>
        {plantilla.descripcion ? (
          <p className="text-sm text-muted-foreground">{plantilla.descripcion}</p>
        ) : null}
      </header>

      {(cabecera || parametros) && (
        <dl className="grid gap-x-8 gap-y-1 text-sm sm:grid-cols-2">
          {cabecera?.codigo ? <Dato etiqueta="Código" valor={cabecera.codigo} /> : null}
          {cabecera?.plazoEjecucion != null ? (
            <Dato
              etiqueta="Plazo"
              valor={`${String(cabecera.plazoEjecucion)} ${
                PLAZO[cabecera.plazoUnidad ?? ""] ?? cabecera.plazoUnidad ?? ""
              }`}
            />
          ) : null}
          {cabecera?.direccionInstitucional ? (
            <Dato etiqueta="Dirección" valor={cabecera.direccionInstitucional} />
          ) : null}
          {parametros?.porcentajeIndirecto != null ? (
            <Dato
              etiqueta="Costos indirectos"
              valor={formatearPorcentaje(Number(parametros.porcentajeIndirecto), 2)}
            />
          ) : null}
          {parametros?.porcentajeHerramientaMenor != null ? (
            <Dato
              etiqueta="Herramienta menor"
              valor={formatearPorcentaje(Number(parametros.porcentajeHerramientaMenor), 2)}
            />
          ) : null}
          {parametros?.iva != null ? (
            <Dato etiqueta="IVA" valor={formatearPorcentaje(Number(parametros.iva), 2)} />
          ) : null}
          {parametros?.moneda ? <Dato etiqueta="Moneda" valor={parametros.moneda} /> : null}
        </dl>
      )}

      <section aria-label="Estructura del presupuesto" className="space-y-2">
        <h4 className="text-sm font-semibold">
          Presupuesto · {caps.length} capítulos · {contarRubros(caps)} rubros
        </h4>
        {caps.length === 0 ? (
          <p className="text-sm text-muted-foreground">La plantilla no trae capítulos.</p>
        ) : (
          <ul className="space-y-3">
            {caps.map((c, i) => (
              <Capitulo key={`${c.item ?? "cap"}-${i}`} capitulo={c} nivel={0} />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
