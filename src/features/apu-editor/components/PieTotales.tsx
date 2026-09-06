import { useState } from "react";
import type { ApuResponse } from "@/api/contract";
import { formatearMoneda, formatearPorcentaje } from "@/lib/decimal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { TarjetaTabla } from "@/components/comunes/TarjetaTabla";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Edit2Icon, PercentIcon, CalculatorIcon } from "lucide-react";
import {
  ESCALA_PORCENTAJE,
  parsearEntradaNumerica,
  porcentajeAFraccionDecimal,
} from "@/lib/decimal";
import { MOTIVO_SIN_BACKEND } from "@/lib/disponibilidad";

interface PieTotalesProps {
  apu: ApuResponse;
  onEditarPorcentajeCi: (valor: string | null) => Promise<void>;
  onAbrirDescuento: () => void;
  onAbrirDesglose: () => void;
}

function Linea({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-muted-foreground">{etiqueta}</span>
      <span className="num font-medium">{valor}</span>
    </div>
  );
}

export function PieTotales({
  apu,
  onEditarPorcentajeCi,
  onAbrirDescuento,
  onAbrirDesglose,
}: PieTotalesProps) {
  const [editandoCi, setEditandoCi] = useState(false);
  const [ciValor, setCiValor] = useState("");

  const iniciarEdicionCi = () => {
    setCiValor(apu.porcentajeIndirecto != null ? String(apu.porcentajeIndirecto) : "");
    setEditandoCi(true);
  };

  const guardarCi = async () => {
    const trimmed = ciValor.trim();
    if (trimmed === "" || trimmed === "0") {
      await onEditarPorcentajeCi(null);
    } else {
      const pct = parsearEntradaNumerica(trimmed, ESCALA_PORCENTAJE);
      if (pct === null) return;
      await onEditarPorcentajeCi(porcentajeAFraccionDecimal(pct));
    }
    setEditandoCi(false);
  };

  const cancelarEdicionCi = () => {
    setEditandoCi(false);
  };

  return (
    <div className="flex flex-col gap-3">
      <TarjetaTabla titulo="Costo unitario">
        <div className="flex flex-col gap-2.5 p-4 text-sm">
          <Linea etiqueta="Costo Directo" valor={formatearMoneda(apu.costoDirecto)} />

          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-1 text-muted-foreground">
                % CI
                <button
                  type="button"
                  aria-label="Editar porcentaje de indirectos"
                  onClick={iniciarEdicionCi}
                  className="text-primary hover:underline"
                >
                  <Edit2Icon className="size-3" />
                </button>
              </span>
              {editandoCi ? (
                <div className="flex items-center gap-1">
                  <Input
                    className="h-7 w-20 text-right text-xs"
                    type="number"
                    step="0.01"
                    value={ciValor}
                    onChange={(e) => setCiValor(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") guardarCi();
                      if (e.key === "Escape") cancelarEdicionCi();
                    }}
                    // oxlint-disable-next-line jsx-a11y/no-autofocus -- inline edit triggered by user click
                    autoFocus
                  />
                  <Button size="xs" variant="ghost" onClick={guardarCi}>
                    OK
                  </Button>
                  <Button size="xs" variant="ghost" onClick={cancelarEdicionCi}>
                    X
                  </Button>
                </div>
              ) : (
                <span className="flex items-center gap-2">
                  <span className="num font-medium">
                    {formatearPorcentaje(apu.porcentajeIndirectoEfectivo)}
                  </span>
                  {apu.porcentajeIndirecto !== null && (
                    <Badge variant="secondary">Valor propio</Badge>
                  )}
                </span>
              )}
            </div>
            {!editandoCi && apu.porcentajeIndirecto !== null && (
              <Button
                variant="ghost"
                size="xs"
                className="self-end text-muted-foreground"
                onClick={() => onEditarPorcentajeCi(null)}
              >
                Usar valor del proyecto ({formatearPorcentaje(apu.porcentajeIndirectoEfectivo)})
              </Button>
            )}
          </div>

          <Linea etiqueta="Costo Indirecto" valor={formatearMoneda(apu.costoIndirecto)} />
        </div>

        <div className="flex items-baseline justify-between gap-3 border-t bg-muted/60 px-4 py-3.5">
          <span className="flex flex-col gap-0.5">
            <span className="text-sm font-semibold">Costo Total</span>
            <span className="text-xs font-normal text-muted-foreground">por {apu.unidad}</span>
          </span>
          <span className="num text-2xl font-semibold tracking-tight">
            {formatearMoneda(apu.costoTotal)}
          </span>
        </div>
      </TarjetaTabla>

      <div className="grid grid-cols-2 gap-2">
        <Tooltip>
          <TooltipTrigger asChild>
            <span>
              <Button variant="outline" className="w-full" onClick={onAbrirDescuento} disabled>
                <PercentIcon data-icon="inline-start" /> Descuento
              </Button>
            </span>
          </TooltipTrigger>
          <TooltipContent>{MOTIVO_SIN_BACKEND}</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <span>
              <Button variant="outline" className="w-full" onClick={onAbrirDesglose} disabled>
                <CalculatorIcon data-icon="inline-start" /> Desglose
              </Button>
            </span>
          </TooltipTrigger>
          <TooltipContent>{MOTIVO_SIN_BACKEND}</TooltipContent>
        </Tooltip>
      </div>

      <p className="text-xs leading-relaxed text-pretty text-muted-foreground">
        El descuento se aplica al costo directo del rubro. No modifica los precios de tus insumos.
      </p>
    </div>
  );
}
