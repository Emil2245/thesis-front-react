import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { get } from "@/api/request";
import { qk } from "@/api/queryKeys";
import { useCrearApu } from "../hooks/useApus";
import type { PlantillaApuDetalleResponse, ParametrosProyectoResponse } from "@/api/contract";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Spinner } from "@/components/ui/spinner";
import { formatearMoneda } from "@/lib/decimal";
import { ApiError } from "@/api/problem";

interface DialogoNuevoApuProps {
  abierto: boolean;
  onClose: () => void;
  presupuestoId: number;
  proyectoId: number;
  onCreate: (apuId: number) => void;
}

export function DialogoNuevoApu({
  abierto,
  onClose,
  presupuestoId,
  proyectoId,
  onCreate,
}: DialogoNuevoApuProps) {
  const crear = useCrearApu(presupuestoId);
  const [codigo, setCodigo] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [unidad, setUnidad] = useState("");
  const [plantillaId, setPlantillaId] = useState<number | undefined>();
  const [codigoError, setCodigoError] = useState<string | null>(null);

  const { data: parametros } = useQuery({
    queryKey: qk.parametrosProyecto(proyectoId),
    queryFn: () => get<ParametrosProyectoResponse>(`/proyectos/${proyectoId}/parametros`),
  });

  const { data: plantillas } = useQuery({
    queryKey: qk.plantillas(),
    queryFn: () => get<PlantillaApuDetalleResponse[]>("/plantillas-apu"),
  });

  const modoAuto = parametros?.modoCodigoRubro === "AUTOGENERADO";

  const handleCrear = async () => {
    setCodigoError(null);
    try {
      const result = await crear.mutateAsync({
        codigo,
        descripcion,
        unidad,
        plantillaId,
      });
      onCreate(result.id);
    } catch (e) {
      if (e instanceof ApiError && e.is("codigo-duplicado")) {
        setCodigoError("El código ya existe");
      }
    }
  };

  return (
    <Dialog open={abierto} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Nuevo APU</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="cero">
          <TabsList>
            <TabsTrigger value="cero">Desde cero</TabsTrigger>
            <TabsTrigger value="plantilla">Desde plantilla</TabsTrigger>
          </TabsList>

          <TabsContent value="cero" className="space-y-3 pt-3">
            <div className="space-y-1">
              <Label htmlFor="codigo">Código</Label>
              <Input
                id="codigo"
                value={codigo}
                onChange={(e) => {
                  setCodigo(e.target.value);
                  setCodigoError(null);
                }}
                disabled={modoAuto}
                placeholder={modoAuto ? "Generado automáticamente" : "Ej: APU-005"}
              />
              {codigoError && <p className="text-xs text-destructive">{codigoError}</p>}
            </div>
            <div className="space-y-1">
              <Label htmlFor="descripcion">Descripción</Label>
              <Input
                id="descripcion"
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="unidad">Unidad</Label>
              <Input id="unidad" value={unidad} onChange={(e) => setUnidad(e.target.value)} />
            </div>
          </TabsContent>

          <TabsContent value="plantilla" className="space-y-3 pt-3">
            <div className="space-y-1">
              <Label>Descripción</Label>
              <Input
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                placeholder="Descripción"
              />
            </div>
            <div className="space-y-1">
              <Label>Unidad</Label>
              <Input
                value={unidad}
                onChange={(e) => setUnidad(e.target.value)}
                placeholder="Unidad"
              />
            </div>
            <div className="max-h-40 space-y-1 overflow-y-auto">
              {plantillas?.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  className={`flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted ${
                    plantillaId === p.id ? "bg-muted font-medium" : ""
                  }`}
                  onClick={() => {
                    setPlantillaId(p.id);
                    setDescripcion(p.snapshot.descripcion);
                    setUnidad(p.snapshot.unidad);
                  }}
                >
                  <span>{p.nombre}</span>
                  <span className="text-xs text-muted-foreground">
                    {formatearMoneda(p.snapshot.costoTotal)}
                  </span>
                </button>
              ))}
            </div>
            {plantillaId && (
              <p className="text-xs text-amber-600">
                Los valores son referenciales y deben revisarse
              </p>
            )}
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleCrear} disabled={crear.isPending}>
            {crear.isPending ? <Spinner /> : null}
            Crear APU
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
