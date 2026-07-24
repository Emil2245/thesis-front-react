import { Badge } from "@/components/ui/badge";

export function BadgeDesactualizado({ desactualizado }: { desactualizado: boolean }) {
  if (!desactualizado) return null;
  return (
    <Badge variant="outline" className="text-amber-600 border-amber-300">
      Desactualizado
    </Badge>
  );
}
