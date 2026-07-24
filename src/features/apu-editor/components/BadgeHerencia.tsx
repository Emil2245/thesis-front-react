import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface BadgeHerenciaProps {
  heredero: boolean;
  onRestaurar?: () => void;
}

export function BadgeHerencia({ heredero, onRestaurar }: BadgeHerenciaProps) {
  if (heredero) {
    return (
      <Badge variant="secondary" className="bg-green-100 text-green-800 hover:bg-green-100">
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
