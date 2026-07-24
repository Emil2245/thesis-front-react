import { AlertTriangle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface ChipAlertaProps {
  tipo: "PU_CERO" | "CANTIDAD_CERO" | "SIN_ACTIVIDAD";
}

const config: Record<string, { label: string; className: string }> = {
  PU_CERO: {
    label: "PU=0",
    className: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  },
  CANTIDAD_CERO: {
    label: "Cant.=0",
    className: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  },
  SIN_ACTIVIDAD: {
    label: "Sin act.",
    className: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  },
};

export function ChipAlerta({ tipo }: ChipAlertaProps) {
  const cfg = config[tipo] || { label: tipo, className: "bg-gray-100 text-gray-700" };
  return (
    <Tooltip>
      <TooltipTrigger>
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium",
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
