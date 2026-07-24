import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export function BadgeDesactualizado({ desactualizado }: { desactualizado: boolean }) {
  if (!desactualizado) return null;
  return (
    <Tooltip>
      <TooltipTrigger>
        <Badge variant="destructive" className="cursor-help">
          Desactualizado
        </Badge>
      </TooltipTrigger>
      <TooltipContent>
        <p>El presupuesto ha cambiado desde la última revisión del cronograma.</p>
      </TooltipContent>
    </Tooltip>
  );
}
