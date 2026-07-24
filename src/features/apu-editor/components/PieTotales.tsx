import { useState } from "react";
import type { ApuResponse } from "@/api/contract";
import { formatearMoneda, formatearPorcentaje, esCero } from "@/lib/decimal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Edit2Icon, PercentIcon, CalculatorIcon } from "lucide-react";
import { parsearEntradaDecimal } from "@/lib/decimal";

interface PieTotalesProps {
  apu: ApuResponse;
  onEditarPorcentajeCi: (valor: string | null) => Promise<void>;
  onAbrirDescuento: () => void;
  onAbrirDesglose: () => void;
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
    setCiValor(apu.porcentajeIndirecto ?? "");
    setEditandoCi(true);
  };

  const guardarCi = async () => {
    const trimmed = ciValor.trim();
    if (trimmed === "" || trimmed === "0") {
      await onEditarPorcentajeCi(null);
    } else {
      const parsed = parsearEntradaDecimal(trimmed);
      if (parsed === null) return;
      const num = Number(parsed);
      const pct = (num / 100).toFixed(6);
      await onEditarPorcentajeCi(pct);
    }
    setEditandoCi(false);
  };

  const cancelarEdicionCi = () => {
    setEditandoCi(false);
  };

  const tieneDescuento = !esCero(apu.porcentajeDescuento);

  return (
    <div className="rounded-lg border bg-card p-4">
      {apu.esAuxiliar && (
        <div className="mb-2 text-xs font-medium text-muted-foreground">
          Rubro auxiliar — el CI se aplica en el APU principal
        </div>
      )}

      <div className="space-y-1 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Costo Directo</span>
          <span className="num font-medium">{formatearMoneda(apu.costoDirecto)}</span>
        </div>

        {tieneDescuento && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">CD Ajustado</span>
            <span className="num font-medium">{formatearMoneda(apu.cdAjustado)}</span>
          </div>
        )}

        {!apu.esAuxiliar && (
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground flex items-center gap-1">
              % CI
              <button
                type="button"
                onClick={iniciarEdicionCi}
                className="text-primary hover:underline"
              >
                <Edit2Icon className="size-3" />
              </button>
            </span>
            {editandoCi ? (
              <div className="flex items-center gap-1">
                <Input
                  className="h-7 w-24 text-xs text-right"
                  type="number"
                  step="0.01"
                  value={ciValor}
                  onChange={(e) => setCiValor(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") guardarCi();
                    if (e.key === "Escape") cancelarEdicionCi();
                  }}
                  autoFocus
                />
                <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={guardarCi}>
                  OK
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 px-2 text-xs"
                  onClick={cancelarEdicionCi}
                >
                  X
                </Button>
              </div>
            ) : (
              <span className="num font-medium flex items-center gap-2">
                {formatearPorcentaje(apu.porcentajeIndirectoEfectivo)}
                {apu.porcentajeIndirecto !== null && (
                  <>
                    <Badge variant="secondary" className="text-[10px]">
                      Valor propio
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-[10px]"
                      onClick={() => onEditarPorcentajeCi(null)}
                    >
                      Usar valor del proyecto (
                      {formatearPorcentaje(apu.porcentajeIndirectoEfectivo)})
                    </Button>
                  </>
                )}
              </span>
            )}
          </div>
        )}

        {!apu.esAuxiliar && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Costo Indirecto</span>
            <span className="num font-medium">{formatearMoneda(apu.costoIndirecto)}</span>
          </div>
        )}

        <div className="flex justify-between border-t pt-1 text-base font-bold">
          <span>{apu.esAuxiliar ? "Costo total (CT = CD)" : "Costo Total"}</span>
          <span className="num">{formatearMoneda(apu.costoTotal)}</span>
        </div>
      </div>

      <div className="mt-3 flex gap-2">
        <Button variant="outline" size="sm" onClick={onAbrirDescuento}>
          <PercentIcon /> Descuento
        </Button>
        <Button variant="outline" size="sm" onClick={onAbrirDesglose}>
          <CalculatorIcon /> Desglose
        </Button>
      </div>
      <p className="mt-1 text-[10px] text-muted-foreground">
        El descuento se aplica al costo directo del rubro. No modifica los precios de tus insumos.
      </p>
    </div>
  );
}
