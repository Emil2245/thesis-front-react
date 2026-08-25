import { Dot, Trash2, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { formatearMoneda } from "@/lib/decimal";
import type { RubroResponse } from "@/api/contract";

interface FilaRubroProps {
  rubro: RubroResponse;
  nivel: number;
  onEliminar: (rubroId: number) => void;
  onCantidadChange: (rubroId: number, cantidad: string) => void;
}

export function FilaRubro({ rubro, nivel, onEliminar, onCantidadChange }: FilaRubroProps) {
  return (
    <div
      className={cn("flex items-center gap-2 border-b py-2 px-2 text-sm hover:bg-muted/30")}
      style={{ paddingLeft: `${nivel * 24 + 32}px` }}
    >
      <Dot className="size-4 shrink-0 text-muted-foreground" />
      <span className="min-w-[4rem] font-mono text-xs text-muted-foreground">{rubro.item}</span>
      <span className="w-20 text-xs font-mono text-muted-foreground truncate">{rubro.codigo}</span>
      <span className="flex-1 truncate">{rubro.descripcion}</span>
      <span className="w-16 text-xs text-right text-muted-foreground">{rubro.unidad}</span>
      <div className="w-24">
        <Input
          type="text"
          defaultValue={rubro.cantidad}
          className="h-7 text-xs text-right"
          onBlur={(e) => {
            const val = e.target.value;
            if (val !== rubro.cantidad) onCantidadChange(rubro.id, val);
          }}
        />
      </div>
      <span className="w-28 text-right font-mono tabular-nums text-xs text-muted-foreground">
        {formatearMoneda(rubro.precioUnitario)}
      </span>
      <span className="w-28 text-right font-mono tabular-nums text-xs font-semibold">
        {formatearMoneda(rubro.precioTotal)}
      </span>
      <div className="flex items-center gap-1 w-16 justify-end">
        {rubro.alertas.length > 0 && (
          <Tooltip>
            <TooltipTrigger>
              <AlertTriangle className="size-3.5 text-advertencia-texto" />
            </TooltipTrigger>
            <TooltipContent>
              <p>{rubro.alertas.join(", ")}</p>
            </TooltipContent>
          </Tooltip>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="size-6 text-destructive"
          title="Eliminar rubro"
          onClick={() => onEliminar(rubro.id)}
        >
          <Trash2 className="size-3" />
        </Button>
      </div>
    </div>
  );
}
