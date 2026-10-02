import type { ActividadProgramarRequest, SegmentoResponse } from "@/api/contract";
import { aUnidadesPorcentaje, deUnidadesPorcentaje, type Decimal } from "@/lib/decimal";

/**
 * Álgebra de la programación de una actividad en el Gantt. Cada gesto —crear,
 * mover, estirar, reducir, cortar, unir, eliminar— se reduce a «qué períodos
 * quedan activos», y ese conjunto se guarda con `DISTRIBUIR_UNIFORME`: el
 * backend reparte el peso ponderado completo entre esos períodos (residual al
 * último), así que el reparto siempre es automático y nunca queda a medias.
 *
 * Los períodos son ordinales 1-based; ningún valor de aquí es dinero.
 */

export function periodosDeSegmentos(segmentos: SegmentoResponse[]): number[] {
  const activos = new Set<number>();
  for (const { inicio, fin } of segmentos) {
    for (let periodo = inicio; periodo <= fin; periodo++) activos.add(periodo);
  }
  return [...activos].sort((a, b) => a - b);
}

/** Corridas máximas de períodos consecutivos, igual que las deriva el backend. */
export function segmentosDePeriodos(periodos: number[]): SegmentoResponse[] {
  const ordenados = [...new Set(periodos)].sort((a, b) => a - b);
  const segmentos: SegmentoResponse[] = [];
  for (const periodo of ordenados) {
    const ultimo = segmentos[segmentos.length - 1];
    if (ultimo && periodo === ultimo.fin + 1) ultimo.fin = periodo;
    else segmentos.push({ inicio: periodo, fin: periodo });
  }
  return segmentos;
}

function rango(desde: number, hasta: number): number[] {
  const [a, b] = desde <= hasta ? [desde, hasta] : [hasta, desde];
  return Array.from({ length: b - a + 1 }, (_, index) => a + index);
}

function limitar(valor: number, minimo: number, maximo: number) {
  return Math.min(Math.max(valor, minimo), maximo);
}

function normalizar(periodos: Iterable<number>): number[] {
  return [...new Set(periodos)].sort((a, b) => a - b);
}

function sin(periodos: number[], quitar: number[]): number[] {
  const fuera = new Set(quitar);
  return periodos.filter((periodo) => !fuera.has(periodo));
}

export function agregarRango(periodos: number[], desde: number, hasta: number): number[] {
  return normalizar([...periodos, ...rango(desde, hasta)]);
}

/** Desplaza el segmento `delta` períodos sin salirse de 1..n; si cae sobre otro, se fusionan. */
export function deltaPermitido(
  segmento: SegmentoResponse,
  delta: number,
  numeroPeriodos: number,
): number {
  return limitar(delta, 1 - segmento.inicio, numeroPeriodos - segmento.fin);
}

export function moverSegmento(
  periodos: number[],
  segmento: SegmentoResponse,
  delta: number,
  numeroPeriodos: number,
): number[] {
  const permitido = deltaPermitido(segmento, delta, numeroPeriodos);
  const resto = sin(periodos, rango(segmento.inicio, segmento.fin));
  return normalizar([...resto, ...rango(segmento.inicio + permitido, segmento.fin + permitido)]);
}

/** Estira o reduce un extremo; la barra nunca baja de un período. */
export function redimensionarSegmento(
  periodos: number[],
  segmento: SegmentoResponse,
  extremo: "inicio" | "fin",
  delta: number,
  numeroPeriodos: number,
): number[] {
  const inicio =
    extremo === "inicio" ? limitar(segmento.inicio + delta, 1, segmento.fin) : segmento.inicio;
  const fin =
    extremo === "fin"
      ? limitar(segmento.fin + delta, segmento.inicio, numeroPeriodos)
      : segmento.fin;
  const resto = sin(periodos, rango(segmento.inicio, segmento.fin));
  return normalizar([...resto, ...rango(inicio, fin)]);
}

/** Cortar en un período: ese período deja de estar activo y la barra se parte en dos. */
export function quitarPeriodo(periodos: number[], periodo: number): number[] {
  return sin(periodos, [periodo]);
}

export function eliminarSegmento(periodos: number[], segmento: SegmentoResponse): number[] {
  return sin(periodos, rango(segmento.inicio, segmento.fin));
}

/** Rellena el hueco entre dos barras: M1 y M3 → M1–M3. */
export function unirSegmentos(
  periodos: number[],
  anterior: SegmentoResponse,
  siguiente: SegmentoResponse,
): number[] {
  return agregarRango(periodos, anterior.fin, siguiente.inicio);
}

export function mismosPeriodos(a: number[], b: number[]) {
  return a.length === b.length && a.every((periodo, index) => periodo === b[index]);
}

/**
 * Meses con un valor fijado por el usuario, en unidades de 0,0001 del
 * proyecto. El resto de meses con barra se reparte en partes iguales lo que
 * queda del peso, así que agregar, mover o cortar no pisa lo que el usuario
 * decidió a mano.
 */
export type Fijos = Record<number, number>;

export function mismosFijos(a: Fijos, b: Fijos) {
  const claves = Object.keys(a);
  return (
    claves.length === Object.keys(b).length && claves.every((k) => a[Number(k)] === b[Number(k)])
  );
}

export function fijosEn(fijos: Fijos, periodos: number[]): Fijos {
  const activos = new Set(periodos);
  return Object.fromEntries(
    Object.entries(fijos).filter(([periodo]) => activos.has(Number(periodo))),
  );
}

/** Los fijos de un segmento que se mueve viajan con él. */
export function desplazarFijos(fijos: Fijos, segmento: SegmentoResponse, delta: number): Fijos {
  return Object.fromEntries(
    Object.entries(fijos).map(([clave, valor]) => {
      const periodo = Number(clave);
      const dentro = periodo >= segmento.inicio && periodo <= segmento.fin;
      return [dentro ? periodo + delta : periodo, valor];
    }),
  );
}

/**
 * El backend no guarda qué mes fijó el usuario, sólo los valores. Se deduce:
 * el grupo más numeroso de valores iguales es el reparto uniforme y los que
 * se salen de él son fijos. «Iguales» tolera tantas diezmilésimas como meses
 * haya, que es lo más que el residual del reparto uniforme mueve el último
 * mes. Si hay empate —dos meses, dos valores—, el grupo libre es el del
 * último mes, que es donde el backend deja el residual.
 */
export function detectarFijos(avancePorPeriodo: Record<string, Decimal>): Fijos {
  const entradas = Object.entries(avancePorPeriodo)
    .map(([clave, valor]) => ({ periodo: Number(clave), unidades: aUnidadesPorcentaje(valor) }))
    .sort((a, b) => a.periodo - b.periodo);
  if (entradas.length < 2) return {};

  const tolerancia = entradas.length;
  const grupos: { minimo: number; periodos: number[] }[] = [];
  for (const { periodo, unidades } of [...entradas].sort((a, b) => a.unidades - b.unidades)) {
    const grupo = grupos.find((g) => Math.abs(unidades - g.minimo) <= tolerancia);
    if (grupo) grupo.periodos.push(periodo);
    else grupos.push({ minimo: unidades, periodos: [periodo] });
  }
  const ultimo = entradas[entradas.length - 1].periodo;
  const libre = grupos.reduce((mejor, grupo) => {
    if (grupo.periodos.length !== mejor.periodos.length) {
      return grupo.periodos.length > mejor.periodos.length ? grupo : mejor;
    }
    return grupo.periodos.includes(ultimo) ? grupo : mejor;
  });
  const libres = new Set(libre.periodos);
  return Object.fromEntries(
    entradas.filter((e) => !libres.has(e.periodo)).map((e) => [e.periodo, e.unidades]),
  );
}

/**
 * Reparto completo: los fijos conservan su valor y los libres se llevan lo que
 * queda en partes iguales, con el residual en el último libre (la misma regla
 * que el backend). Si no queda ningún libre, el último mes deja de ser fijo y
 * absorbe la diferencia; si los fijos ya no caben en el peso —el presupuesto
 * cambió—, se descartan y el reparto vuelve a ser uniforme.
 */
export function repartir(periodos: number[], pesoUnidades: number, fijos: Fijos): Fijos {
  const activos = normalizar(periodos);
  if (activos.length === 0) return {};
  let efectivos = fijosEn(fijos, activos);
  let libres = activos.filter((p) => efectivos[p] === undefined);
  if (libres.length === 0) {
    const ultimo = activos[activos.length - 1];
    efectivos = Object.fromEntries(
      Object.entries(efectivos).filter(([periodo]) => Number(periodo) !== ultimo),
    );
    libres = [ultimo];
  }
  const sumaFijos = Object.values(efectivos).reduce((total, valor) => total + valor, 0);
  if (sumaFijos > pesoUnidades) return repartir(activos, pesoUnidades, {});

  const restante = pesoUnidades - sumaFijos;
  const base = Math.floor(restante / libres.length);
  const reparto: Fijos = { ...efectivos };
  libres.forEach((periodo, index) => {
    reparto[periodo] = index === libres.length - 1 ? restante - base * (libres.length - 1) : base;
  });
  return reparto;
}

/**
 * Sin fijos, el reparto lo hace el backend (`DISTRIBUIR_UNIFORME`); con fijos
 * se manda el mapa completo, que ya suma exactamente el peso.
 * `DISTRIBUIR_UNIFORME` rechaza la lista vacía; quitar la última barra es
 * reemplazar el mapa por uno vacío, que el backend guarda como borrador.
 */
export function cuerpoProgramacion(
  periodos: number[],
  pesoUnidades = 0,
  fijos: Fijos = {},
): ActividadProgramarRequest {
  if (periodos.length === 0) return { operacion: "REEMPLAZAR_AVANCES", avancePorPeriodo: {} };
  if (Object.keys(fijosEn(fijos, periodos)).length === 0) {
    return { operacion: "DISTRIBUIR_UNIFORME", periodos: normalizar(periodos) };
  }
  const reparto = repartir(periodos, pesoUnidades, fijos);
  return {
    operacion: "REEMPLAZAR_AVANCES",
    avancePorPeriodo: Object.fromEntries(
      Object.entries(reparto).map(([periodo, unidades]) => [
        periodo,
        deUnidadesPorcentaje(unidades),
      ]),
    ),
  };
}
