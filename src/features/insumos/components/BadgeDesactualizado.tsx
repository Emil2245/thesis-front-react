import { Badge } from "@/components/ui/badge";

export function BadgeDesactualizado({ desactualizado }: { desactualizado: boolean }) {
  if (!desactualizado) return null;
  return (
    <Badge variant="outline" className="text-advertencia-texto border-advertencia/30">
      Desactualizado
    </Badge>
  );
}
