import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface BadgeHerenciaProps {
  heredero: boolean;
  onRestaurar?: () => void;
}

export function BadgeHerencia({ heredero, onRestaurar }: BadgeHerenciaProps) {
  if (heredero) {
    return (
      <Badge variant="secondary" className="bg-exito/15 text-exito-texto hover:bg-exito/15">
        Heredado
      </Badge>
    );
  }

  return (
    <div className="flex items-center gap-1">
      <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
        Manual
      </Badge>
      {onRestaurar && (
        <Button variant="ghost" size="xs" onClick={onRestaurar}>
          Restaurar
        </Button>
      )}
    </div>
  );
}
