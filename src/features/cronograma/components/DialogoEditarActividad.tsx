import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import type { ActividadProgramarRequest, ActividadCronogramaResponse } from "@/api/contract";
import {
  cuantizar,
  escalaDe,
  formatearMoneda,
  formatearPuntosPorcentaje,
  parsearEntradaDecimal,
  ESCALA_PORCENTAJE,
  type Decimal,
} from "@/lib/decimal";

interface DialogoEditarActividadProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (body: ActividadProgramarRequest) => void;
  actividad: ActividadCronogramaResponse;
  numeroPeriodos: number;
}

export function DialogoEditarActividad({
  open,
  onOpenChange,
  onConfirm,
  actividad,
  numeroPeriodos,
}: DialogoEditarActividadProps) {
  const periodos = Array.from({ length: numeroPeriodos }, (_, i) => i + 1);

  // El mapa del backend es disperso: un período sin avance no está, así que
  // aquí se edita como vacío y no como "0.0000".
  const [avances, setAvances] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      periodos.map((p) => [String(p), actividad.avancePorPeriodo[String(p)] ?? ""]),
    ),
  );
  const [seleccion, setSeleccion] = useState<number[]>([]);

  const bruto = (p: number) => (avances[String(p)] ?? "").trim();
  const decimalDe = (p: number) => parsearEntradaDecimal(bruto(p));

  // El parser rechaza escala > 4 y negativos; mejor no llegar a mandarlo.
  const invalido = periodos.some((p) => {
    const valor = decimalDe(p);
    if (bruto(p) === "") return false;
    return valor === null || escalaDe(valor) > ESCALA_PORCENTAJE || Number(valor) < 0;
  });

  const asignados = periodos
    .map((p) => [String(p), decimalDe(p)] as const)
    .filter((par): par is [string, Decimal] => par[1] !== null);

  // Porcentajes, no dinero: la suma es puntos escala 4 y `cuantizar` recorta la
  // cola que arrastra el float (ADR 9).
  const suma = cuantizar(
    asignados.reduce((acc, [, v]) => acc + Number(v), 0),
    ESCALA_PORCENTAJE,
  );
  const desviacion = cuantizar(Number(actividad.pesoPonderado) - suma, ESCALA_PORCENTAJE);

  const alternar = (p: number) =>
    setSeleccion((prev) => (prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {actividad.item} — {actividad.descripcion}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="flex justify-between text-sm border-b pb-2">
            <span className="text-muted-foreground">Total</span>
            <span className="font-mono tabular-nums">{formatearMoneda(actividad.precioTotal)}</span>
          </div>
          {/* F-08: la suma de los avances tiene que cuadrar con el peso. */}
          <dl className="grid grid-cols-3 gap-2 text-sm border-b pb-2">
            <div>
              <dt className="text-muted-foreground text-xs">Peso</dt>
              <dd className="font-mono tabular-nums">
                {formatearPuntosPorcentaje(actividad.pesoPonderado)}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground text-xs">Asignado</dt>
              <dd className="font-mono tabular-nums">{formatearPuntosPorcentaje(suma)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground text-xs">Desviación</dt>
              <dd
                className={`font-mono tabular-nums ${desviacion === 0 ? "" : "text-destructive"}`}
              >
                {formatearPuntosPorcentaje(desviacion)}
              </dd>
            </div>
          </dl>

          <div className="space-y-2 max-h-72 overflow-y-auto">
            {periodos.map((periodo) => (
              <div key={periodo} className="flex items-end gap-2">
                <Checkbox
                  aria-label={`Seleccionar período ${periodo}`}
                  className="mb-2.5"
                  checked={seleccion.includes(periodo)}
                  onCheckedChange={() => alternar(periodo)}
                />
                <div className="flex-1 space-y-1">
                  <Label htmlFor={`p${periodo}`}>Período {periodo}</Label>
                  <Input
                    id={`p${periodo}`}
                    type="text"
                    inputMode="decimal"
                    className="text-right font-mono"
                    value={avances[String(periodo)]}
                    onChange={(e) =>
                      setAvances((prev) => ({ ...prev, [String(periodo)]: e.target.value }))
                    }
                  />
                </div>
              </div>
            ))}
          </div>
          {invalido && (
            <p className="text-xs text-destructive">
              Los avances son porcentajes con hasta 4 decimales y no pueden ser negativos.
            </p>
          )}
        </div>
        <DialogFooter className="sm:justify-between">
          {/* El backend reparte el peso de la actividad entre los períodos que
              se le den; teclearlo a mano es hacer su trabajo peor. */}
          <Button
            variant="secondary"
            disabled={seleccion.length === 0}
            onClick={() =>
              onConfirm({ operacion: "DISTRIBUIR_UNIFORME", periodos: [...seleccion] })
            }
          >
            Distribuir uniforme
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button
              disabled={invalido}
              onClick={() =>
                onConfirm({
                  operacion: "REEMPLAZAR_AVANCES",
                  avancePorPeriodo: Object.fromEntries(asignados),
                })
              }
            >
              Guardar
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
