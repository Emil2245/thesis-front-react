import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { get } from "@/api/request";
import type { ApuResumenResponse } from "@/api/contract";
import { Search, Loader2 } from "lucide-react";

interface DialogoAgregarItemProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (apuId: number, cantidad: string) => void;
  presupuestoId: number;
}

export function DialogoAgregarItem({
  open,
  onOpenChange,
  onConfirm,
  presupuestoId,
}: DialogoAgregarItemProps) {
  const [busqueda, setBusqueda] = useState("");
  const [apuSeleccionado, setApuSeleccionado] = useState<ApuResumenResponse | null>(null);
  const [cantidad, setCantidad] = useState("1.000000");

  const { data: apus, isLoading } = useQuery({
    queryKey: ["presupuesto", presupuestoId, "apus", "busqueda", busqueda],
    queryFn: () =>
      get<ApuResumenResponse[]>(`/presupuestos/${presupuestoId}/apus`, { q: busqueda }),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Agregar rubro al presupuesto</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
            <Input
              className="pl-8"
              placeholder="Buscar APU por código o descripción..."
              value={busqueda}
              onChange={(e) => {
                setBusqueda(e.target.value);
                setApuSeleccionado(null);
              }}
            />
          </div>
          {isLoading && (
            <div className="flex justify-center py-4">
              <Loader2 className="size-5 animate-spin text-muted-foreground" />
            </div>
          )}
          {apus && apus.length > 0 && (
            <div className="max-h-48 overflow-y-auto border rounded-md divide-y">
              {apus.map((apu) => (
                <button
                  key={apu.id}
                  type="button"
                  className={`w-full text-left px-3 py-2 text-sm hover:bg-muted ${apuSeleccionado?.id === apu.id ? "bg-muted font-medium" : ""}`}
                  onClick={() => setApuSeleccionado(apu)}
                >
                  <span className="font-mono text-xs text-muted-foreground">{apu.codigo}</span>{" "}
                  {apu.descripcion}
                </button>
              ))}
            </div>
          )}
          {apuSeleccionado && (
            <div className="space-y-2">
              <Label htmlFor="cantidad">Cantidad ({apuSeleccionado.unidad})</Label>
              <Input
                id="cantidad"
                value={cantidad}
                onChange={(e) => setCantidad(e.target.value)}
                className="text-right font-mono"
              />
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={() => {
              if (apuSeleccionado) {
                onConfirm(apuSeleccionado.id, cantidad);
                setApuSeleccionado(null);
                setBusqueda("");
                setCantidad("1.000000");
              }
            }}
            disabled={!apuSeleccionado}
          >
            Agregar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
