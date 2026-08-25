import { AlertTriangle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface ChipAlertaProps {
  tipo: "PU_CERO" | "CANTIDAD_CERO" | "SIN_ACTIVIDAD";
}

const config: Record<string, { label: string; className: string }> = {
  PU_CERO: {
    label: "PU=0",
    className: "bg-peligro/15 text-peligro-texto border-peligro/30",
  },
  CANTIDAD_CERO: {
    label: "Cant.=0",
    className: "bg-advertencia/15 text-advertencia-texto border-advertencia/30",
  },
  SIN_ACTIVIDAD: {
    label: "Sin act.",
    className: "bg-advertencia/15 text-advertencia-texto border-advertencia/30",
  },
};

export function ChipAlerta({ tipo }: ChipAlertaProps) {
  const cfg = config[tipo] || {
    label: tipo,
    className: "bg-muted text-muted-foreground border-border",
  };
  return (
    <Tooltip>
      <TooltipTrigger>
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium",
            cfg.className,
          )}
        >
          <AlertTriangle className="size-2.5" />
          {cfg.label}
        </span>
      </TooltipTrigger>
      <TooltipContent>
        <p>
          {tipo === "PU_CERO"
            ? "Precio unitario igual a cero"
            : tipo === "CANTIDAD_CERO"
              ? "Cantidad igual a cero"
              : "Sin actividad asignada en cronograma"}
        </p>
      </TooltipContent>
    </Tooltip>
  );
}
