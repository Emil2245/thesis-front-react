import { AlertTriangle, XCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { ValidacionPresupuestoResponse } from "@/api/contract";

interface BannerIntegridadProps {
  data?: ValidacionPresupuestoResponse;
  isLoading: boolean;
}

export function BannerIntegridad({ data, isLoading }: BannerIntegridadProps) {
  if (isLoading || !data) return null;
  if (data.exportable) return null;

  const total =
    data.itemsPuCero.length + data.itemsCantidadCero.length + data.itemsSinActividad.length;

  return (
    <Alert variant="destructive">
      <AlertTriangle className="size-4" />
      <AlertTitle>
        El presupuesto no es exportable ({total} incidencia{total !== 1 ? "s" : ""})
      </AlertTitle>
      <AlertDescription>
        <ul className="mt-2 space-y-1 text-sm">
          {data.itemsPuCero.length > 0 && (
            <li className="flex items-center gap-2">
              <Tooltip>
                <TooltipTrigger>
                  <XCircle className="size-3.5 text-destructive" />
                </TooltipTrigger>
                <TooltipContent>Precio unitario cero</TooltipContent>
              </Tooltip>
              <span>
                {data.itemsPuCero.length} rubro{data.itemsPuCero.length > 1 ? "s" : ""} con precio
                unitario cero: {data.itemsPuCero.map((i) => i.item).join(", ")}
              </span>
            </li>
          )}
          {data.itemsCantidadCero.length > 0 && (
            <li className="flex items-center gap-2">
              <Tooltip>
                <TooltipTrigger>
                  <XCircle className="size-3.5 text-destructive" />
                </TooltipTrigger>
                <TooltipContent>Cantidad cero</TooltipContent>
              </Tooltip>
              <span>
                {data.itemsCantidadCero.length} rubro{data.itemsCantidadCero.length > 1 ? "s" : ""}{" "}
                con cantidad cero: {data.itemsCantidadCero.map((i) => i.item).join(", ")}
              </span>
            </li>
          )}
          {data.itemsSinActividad.length > 0 && (
            <li className="flex items-center gap-2">
              <Tooltip>
                <TooltipTrigger>
                  <XCircle className="size-3.5 text-destructive" />
                </TooltipTrigger>
                <TooltipContent>Sin actividad en cronograma</TooltipContent>
              </Tooltip>
              <span>
                {data.itemsSinActividad.length} rubro{data.itemsSinActividad.length > 1 ? "s" : ""}{" "}
                sin actividad: {data.itemsSinActividad.map((i) => i.item).join(", ")}
              </span>
            </li>
          )}
        </ul>
      </AlertDescription>
    </Alert>
  );
}
