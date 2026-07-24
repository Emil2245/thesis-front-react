import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { get } from "@/api/request";
import { useBasesCentrales } from "../hooks/useBasesCentrales";
import { CargandoTabla } from "@/components/comunes/CargandoTabla";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ChevronRightIcon, ChevronDownIcon } from "lucide-react";
import type { Page, InsumoResponse } from "@/api/contract";
import { formatearMoneda } from "@/lib/decimal";

function BaseInsumosList({ baseId }: { baseId: number }) {
  const { data, isPending } = useQuery({
    queryKey: ["bases-centrales", baseId, "insumos"],
    queryFn: () => get<Page<InsumoResponse>>(`/bases-centrales/${baseId}/insumos`),
  });

  if (isPending) return <CargandoTabla filas={3} />;
  if (!data?.contenido.length)
    return <p className="py-2 text-sm text-muted-foreground">Sin insumos</p>;

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Código</TableHead>
          <TableHead>Descripción</TableHead>
          <TableHead>Tipo</TableHead>
          <TableHead>Unidad</TableHead>
          <TableHead className="text-right">Precio</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.contenido.map((i) => (
          <TableRow key={i.id}>
            <TableCell className="font-mono text-xs">{i.codigo}</TableCell>
            <TableCell>{i.descripcion}</TableCell>
            <TableCell>
              <Badge variant="outline">{i.tipo}</Badge>
            </TableCell>
            <TableCell>{i.unidad}</TableCell>
            <TableCell className="text-right tabular-nums">{formatearMoneda(i.precio)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export function VistaBasesCentrales() {
  const { data: bases, isPending } = useBasesCentrales();
  const [expandida, setExpandida] = useState<number | null>(null);

  if (isPending) return <CargandoTabla />;
  if (!bases?.length)
    return <p className="py-4 text-sm text-muted-foreground">No hay bases centrales disponibles</p>;

  return (
    <div className="space-y-2">
      {bases.map((base) => (
        <div key={base.id} className="rounded-lg border">
          <button
            type="button"
            onClick={() => setExpandida(expandida === base.id ? null : base.id)}
            className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-muted/50"
          >
            <div className="flex items-center gap-2">
              {expandida === base.id ? (
                <ChevronDownIcon className="size-4 text-muted-foreground" />
              ) : (
                <ChevronRightIcon className="size-4 text-muted-foreground" />
              )}
              <span className="font-medium">{base.nombre}</span>
              {base.archivada && (
                <Badge variant="outline" className="text-muted-foreground">
                  Archivada
                </Badge>
              )}
            </div>
            <span className="text-sm text-muted-foreground">{base.insumoCount} insumos</span>
          </button>
          {expandida === base.id && (
            <div className="border-t px-4 py-2">
              <BaseInsumosList baseId={base.id} />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
