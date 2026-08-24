import { useBasesCentrales } from "../hooks/useBasesCentrales";
import { CargandoTabla } from "@/components/comunes/CargandoTabla";
import { Badge } from "@/components/ui/badge";

export function VistaBasesCentrales() {
  const { data: bases, isPending } = useBasesCentrales();

  if (isPending) return <CargandoTabla />;
  if (!bases?.length)
    return <p className="py-4 text-sm text-muted-foreground">No hay bases centrales disponibles</p>;

  return (
    <div className="space-y-2">
      {bases.map((base) => (
        <div
          key={base.id}
          className="flex items-center justify-between rounded-lg border px-4 py-3"
        >
          <div className="flex items-center gap-2">
            <span className="font-medium">{base.nombre}</span>
            {base.archivada && (
              <Badge variant="outline" className="text-muted-foreground">
                Archivada
              </Badge>
            )}
          </div>
          <span className="text-sm text-muted-foreground">{base.totalInsumos} insumos</span>
        </div>
      ))}
    </div>
  );
}
