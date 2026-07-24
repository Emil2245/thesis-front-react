import { Badge } from "@/components/ui/badge";

export function BadgeAuxiliar({ esAuxiliar }: { esAuxiliar: boolean }) {
  if (!esAuxiliar) return null;
  return <Badge variant="secondary">Auxiliar</Badge>;
}
