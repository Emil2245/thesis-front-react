import { useId, useState } from "react";

import type { ActividadCronogramaResponse, UnidadTiempo } from "@/api/contract";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  aUnidadesPorcentaje,
  deUnidadesPorcentaje,
  formatearPuntosPorcentaje,
  parsearEntradaNumerica,
} from "@/lib/decimal";
import { cn } from "@/lib/utils";
import { etiquetaPeriodo } from "./etiquetaPeriodo";
import { fijosEn, repartir, type Fijos } from "./programacionGantt";

type DialogoRepartoMesProps = {
  onOpenChange: (open: boolean) => void;
  onGuardar: (fijos: Fijos) => void;
  actividad: ActividadCronogramaResponse;
  periodo: number;
  /** Períodos con barra de la actividad. */
  periodos: number[];
  fijos: Fijos;
  unidadTiempo: UnidadTiempo;
};

// La parte del mes se edita en centésimas de punto sobre el peso de la
// actividad (0..10000 = 0..100 %): es lo que el usuario entiende —«60 % de
// esta actividad en marzo»—; el valor que viaja son puntos del proyecto.
const CIEN_POR_CIENTO = 10_000;

const aTexto = (centesimas: number) =>
  `${Math.floor(centesimas / 100)}.${String(centesimas % 100).padStart(2, "0")}`;

/**
 * Fija el peso de un mes de la actividad. Los demás meses con barra se
 * reparten lo que queda en partes iguales, y esa decisión sobrevive a los
 * gestos del Gantt (agregar, mover, cortar), que sólo redistribuyen los libres.
 */
export function DialogoRepartoMes({
  onOpenChange,
  onGuardar,
  actividad,
  periodo,
  periodos,
  fijos,
  unidadTiempo,
}: DialogoRepartoMesProps) {
  const id = useId();
  const peso = aUnidadesPorcentaje(actividad.pesoPonderado);
  const actuales = fijosEn(fijos, periodos);
  const repartoActual = repartir(periodos, peso, actuales);
  const otrosFijos = Object.entries(actuales)
    .filter(([clave]) => Number(clave) !== periodo)
    .reduce((total, [, valor]) => total + valor, 0);
  const maximo = Math.max(peso - otrosFijos, 0);
  const aCentesimas = (unidades: number) =>
    peso === 0 ? 0 : Math.round((unidades * CIEN_POR_CIENTO) / peso);
  const maximoCentesimas = aCentesimas(maximo);

  const [centesimas, setCentesimas] = useState(() =>
    Math.min(aCentesimas(repartoActual[periodo] ?? 0), maximoCentesimas),
  );
  const [texto, setTexto] = useState(() => aTexto(centesimas));

  const unidadesMes = Math.min(Math.round((peso * centesimas) / CIEN_POR_CIENTO), maximo);
  const nuevosFijos: Fijos = { ...actuales, [periodo]: unidadesMes };
  const vistaPrevia = repartir(periodos, peso, nuevosFijos);
  const esFijo = actuales[periodo] !== undefined;
  // Guardar sin mover nada no debe convertir en fijo un mes del reparto
  // uniforme: lo ataría a ese valor en los siguientes gestos.
  const sinCambios = !esFijo && unidadesMes === (repartoActual[periodo] ?? 0);
  const unicoMes = periodos.length === 1;
  const mes = etiquetaPeriodo(unidadTiempo, periodo);

  const cambiar = (valor: number) => {
    const limitado = Math.min(Math.max(Math.round(valor), 0), maximoCentesimas);
    setCentesimas(limitado);
    setTexto(aTexto(limitado));
  };

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            Peso de {mes} en «{actividad.descripcion}»
          </DialogTitle>
          <DialogDescription>
            La actividad pesa {formatearPuntosPorcentaje(actividad.pesoPonderado, 2)} del proyecto.
            Fija cuánto de ese peso se ejecuta en {mes}; los demás meses con barra se reparten el
            resto en partes iguales.
          </DialogDescription>
        </DialogHeader>

        {unicoMes ? (
          <p className="text-sm text-muted-foreground">
            Es el único mes con barra: lleva todo el peso de la actividad. Agrega otro mes para
            repartirlo.
          </p>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <input
                id={`${id}-rango`}
                type="range"
                aria-label={`Porcentaje de la actividad en ${mes}`}
                min={0}
                max={maximoCentesimas}
                step={1}
                value={centesimas}
                onChange={(event) => cambiar(Number(event.target.value))}
                className="h-2 flex-1 cursor-pointer accent-primary"
              />
              <label className="flex items-center gap-1 text-sm">
                <input
                  aria-label={`Porcentaje de la actividad en ${mes}, en número`}
                  inputMode="decimal"
                  className="h-8 w-20 rounded-md border bg-background px-2 text-right font-mono tabular-nums"
                  value={texto}
                  onChange={(event) => {
                    setTexto(event.target.value);
                    const numero = parsearEntradaNumerica(event.target.value, 2);
                    if (numero !== null) {
                      setCentesimas(
                        Math.min(Math.max(Math.round(numero * 100), 0), maximoCentesimas),
                      );
                    }
                  }}
                  onBlur={() => setTexto(aTexto(centesimas))}
                />
                %
              </label>
            </div>
            <p className="text-xs text-muted-foreground">
              = {formatearPuntosPorcentaje(deUnidadesPorcentaje(unidadesMes))} del proyecto
              {otrosFijos > 0 && " · el máximo descuenta los otros meses fijados"}
            </p>

            <table className="w-full text-sm">
              <caption className="sr-only">Reparto resultante por período</caption>
              <thead>
                <tr className="border-b text-xs text-muted-foreground">
                  <th scope="col" className="py-1 text-left font-medium">
                    Período
                  </th>
                  <th scope="col" className="py-1 text-right font-medium">
                    Peso en el proyecto
                  </th>
                </tr>
              </thead>
              <tbody>
                {periodos.map((p) => (
                  <tr
                    key={p}
                    className={cn("border-b last:border-b-0", p === periodo && "font-semibold")}
                  >
                    <th scope="row" className="py-1 text-left font-normal">
                      {etiquetaPeriodo(unidadTiempo, p)}
                      {(p === periodo ? !sinCambios : actuales[p] !== undefined) && (
                        <span className="ml-2 text-xs text-muted-foreground">fijo</span>
                      )}
                    </th>
                    <td className="py-1 text-right font-mono tabular-nums">
                      {formatearPuntosPorcentaje(deUnidadesPorcentaje(vistaPrevia[p] ?? 0))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <DialogFooter>
          {esFijo && (
            <Button
              variant="outline"
              className="sm:mr-auto"
              onClick={() => {
                const { [periodo]: _quitado, ...resto } = actuales;
                onGuardar(resto);
              }}
            >
              Repartir en partes iguales
            </Button>
          )}
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            disabled={unicoMes}
            onClick={() => (sinCambios ? onOpenChange(false) : onGuardar(nuevosFijos))}
          >
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
