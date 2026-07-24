import { useState } from "react";
import type { SeccionTipo } from "@/api/contract";
import { useBusquedaParaApu } from "../hooks/useBusquedaParaApu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SearchIcon } from "lucide-react";
import { formatearMoneda } from "@/lib/decimal";

interface SelectorInsumoProps {
  abierto: boolean;
  onClose: () => void;
  proyectoId: number;
  tipo: SeccionTipo;
  onSeleccionar: (sel: { insumoId?: number; apuAuxiliarId?: number }) => void;
}

export function SelectorInsumo({
  abierto,
  onClose,
  proyectoId,
  tipo,
  onSeleccionar,
}: SelectorInsumoProps) {
  const [fuente, setFuente] = useState("LOCAL");
  const [q, setQ] = useState("");

  const { data: resultados, isPending } = useBusquedaParaApu({
    proyectoId,
    fuente,
    q: q || undefined,
    tipo,
  });

  return (
    <Dialog open={abierto} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Seleccionar insumo</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div className="flex gap-2">
            <Select value={fuente} onValueChange={setFuente}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="LOCAL">Local</SelectItem>
                <SelectItem value="CENTRAL">Central</SelectItem>
                <SelectItem value="COMBINADA">Combinada</SelectItem>
              </SelectContent>
            </Select>
            <div className="relative flex-1">
              <SearchIcon className="absolute left-2 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-8"
                placeholder="Buscar insumo…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>
          </div>

          <div className="max-h-60 space-y-1 overflow-y-auto">
            {isPending && <p className="text-sm text-muted-foreground">Buscando…</p>}
            {resultados?.length === 0 && (
              <p className="text-sm text-muted-foreground">Sin resultados</p>
            )}
            {resultados?.map((r) => (
              <button
                key={r.id}
                type="button"
                className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted"
                onClick={() => {
                  onSeleccionar({ insumoId: r.id });
                  onClose();
                }}
              >
                <div className="flex flex-col">
                  <span className="font-medium">
                    {r.codigo} — {r.descripcion}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {r.unidad} · {formatearMoneda(r.precio)}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  {r.fuente === "LOCAL" ? (
                    <Badge variant="secondary">Local</Badge>
                  ) : (
                    <Badge variant="outline" className="text-xs">
                      {r.baseNombre ?? "Central"}
                    </Badge>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>

        <DialogFooter showCloseButton />
      </DialogContent>
    </Dialog>
  );
}
