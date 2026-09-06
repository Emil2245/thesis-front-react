import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  usePlantillasProyecto,
  useCrearDesdePlantilla,
  useEliminarPlantillaProyecto,
} from "@/features/plantillas-proyecto/hooks/usePlantillasProyecto";
import { CargandoTabla } from "@/components/comunes/CargandoTabla";
import { EstadoVacio } from "@/components/comunes/EstadoVacio";
import { ConfirmarDestructivo } from "@/components/comunes/ConfirmarDestructivo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { EncabezadoPagina } from "@/components/comunes/EncabezadoPagina";
import { TarjetaTabla } from "@/components/comunes/TarjetaTabla";
import { FolderPlusIcon, Trash2Icon } from "lucide-react";

export function PlantillasProyectoPage() {
  const { data: plantillas, isPending } = usePlantillasProyecto();
  const eliminar = useEliminarPlantillaProyecto();
  const crearDesdePlantilla = useCrearDesdePlantilla();
  const navigate = useNavigate();

  const [usarId, setUsarId] = useState<string | null>(null);
  const [nombreNuevo, setNombreNuevo] = useState("");

  const handleCrear = async () => {
    if (!nombreNuevo.trim() || !usarId) return;
    // El backend envuelve el proyecto en `{proyecto, advertencias?}`.
    const { proyecto } = await crearDesdePlantilla.mutateAsync({
      plantillaId: usarId,
      body: { nombre: nombreNuevo.trim() },
    });
    setUsarId(null);
    setNombreNuevo("");
    navigate(`/proyectos/${proyecto.id}`);
  };

  if (isPending) return <CargandoTabla />;

  return (
    <>
      <EncabezadoPagina titulo="Plantillas de proyecto" />

      {!plantillas?.length ? (
        <EstadoVacio
          titulo="No tienes plantillas de proyecto"
          descripcion="Guarda un proyecto como plantilla desde su página de resumen para verlo aquí."
        />
      ) : (
        <TarjetaTabla>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Descripción</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead className="w-24" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {plantillas.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.nombre}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {p.descripcion ?? "—"}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(p.fechaCreacion).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        title="Crear proyecto desde esta plantilla"
                        onClick={() => setUsarId(p.id)}
                      >
                        <FolderPlusIcon />
                      </Button>
                      <ConfirmarDestructivo
                        titulo="Eliminar plantilla"
                        descripcion={`¿Eliminar "${p.nombre}"? No afecta a los proyectos ya creados.`}
                        textoConfirmar="Eliminar"
                        onConfirmar={() => eliminar.mutate(p.id)}
                      >
                        <Button variant="ghost" size="icon-sm" className="text-destructive">
                          <Trash2Icon />
                        </Button>
                      </ConfirmarDestructivo>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TarjetaTabla>
      )}

      <Dialog open={usarId != null} onOpenChange={(o) => !o && setUsarId(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Crear proyecto desde plantilla</DialogTitle>
            <DialogDescription>Elige un nombre para el nuevo proyecto.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="nombre-nuevo-proyecto">Nombre *</Label>
            <Input
              id="nombre-nuevo-proyecto"
              value={nombreNuevo}
              onChange={(e) => setNombreNuevo(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCrear();
              }}
              // oxlint-disable-next-line jsx-a11y/no-autofocus -- dialog primary input
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button onClick={handleCrear} disabled={crearDesdePlantilla.isPending}>
              {crearDesdePlantilla.isPending ? "Creando…" : "Crear proyecto"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
