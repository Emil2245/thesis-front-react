import { Badge } from "@/components/ui/badge";

/**
 * Origen de una base o plantilla. En UI las bases `CENTRAL` se etiquetan
 * «Sistema»: mismo modelo que las plantillas `SISTEMA` (sin dueño, las
 * gestiona SUPER_ADMIN, el usuario sólo las lee o las copia). No se renombra
 * `CENTRAL` en el contrato.
 */
export function InsigniaOrigen({ tipo }: { tipo: "SISTEMA" | "CENTRAL" | "PERSONAL" }) {
  return tipo === "PERSONAL" ? (
    <Badge variant="outline">Personal</Badge>
  ) : (
    <Badge variant="secondary">Sistema</Badge>
  );
}
