import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  usePlantillasProyecto,
  useCrearDesdePlantilla,
  useEliminarPlantillaProyecto,
} from "@/features/plantillas-proyecto/hooks/usePlantillasProyecto";
import { VistaPreviaPlantillaProyecto } from "../components/VistaPreviaPlantillaProyecto";
import { CargandoTabla } from "@/components/comunes/CargandoTabla";
import { EstadoVacio } from "@/components/comunes/EstadoVacio";
import { ConfirmarDestructivo } from "@/components/comunes/ConfirmarDestructivo";
import { InsigniaOrigen } from "@/components/comunes/InsigniaOrigen";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EncabezadoPagina } from "@/components/comunes/EncabezadoPagina";
import { TarjetaTabla } from "@/components/comunes/TarjetaTabla";
import type { z } from "zod";
import type { plantillaProyectoSchema } from "@/api/schemas";
import { EyeIcon, FolderPlusIcon, Trash2Icon } from "lucide-react";

// El tipo validado, no la interfaz: Zod deja `snapshotEstructura: unknown` opcional.
type PlantillaProyecto = z.infer<typeof plantillaProyectoSchema>;

/**
 * `GET /plantillas-proyecto` devuelve las SISTEMA y las PERSONALES del usuario
 * en una sola lista (plan 044 del backend); aquí se separan por `tipo`. Las de
 * sistema se pueden ver y usar, no borrar: el backend responde 404.
 */
export function PlantillasProyectoPage() {
  const { data: plantillas, isPending } = usePlantillasProyecto();
  const eliminar = useEliminarPlantillaProyecto();
  const crearDesdePlantilla = useCrearDesdePlantilla();
  const navigate = useNavigate();

  const [usarId, setUsarId] = useState<string | null>(null);
  const [nombreNuevo, setNombreNuevo] = useState("");
  const [preview, setPreview] = useState<PlantillaProyecto | null>(null);

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

  const personales = plantillas?.filter((p) => p.tipo === "PERSONAL") ?? [];
  const sistema = plantillas?.filter((p) => p.tipo === "SISTEMA") ?? [];

  const tabla = (lista: PlantillaProyecto[]) => (
    <TarjetaTabla>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nombre</TableHead>
            <TableHead>Descripción</TableHead>
            <TableHead>Origen</TableHead>
            <TableHead>Fecha</TableHead>
            <TableHead className="w-28" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {lista.map((p) => (
            <TableRow key={p.id}>
              <TableCell className="font-medium">{p.nombre}</TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {p.descripcion ?? "—"}
              </TableCell>
              <TableCell>
                <InsigniaOrigen tipo={p.tipo} />
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {new Date(p.fechaCreacion).toLocaleDateString()}
              </TableCell>
              <TableCell>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Ver plantilla"
                    onClick={() => setPreview(p)}
                  >
                    <EyeIcon />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    title="Crear proyecto desde esta plantilla"
                    onClick={() => setUsarId(p.id)}
                  >
                    <FolderPlusIcon />
                  </Button>
                  {p.tipo === "PERSONAL" && (
                    <ConfirmarDestructivo
                      titulo="Eliminar plantilla"
                      descripcion={`¿Eliminar "${p.nombre}"? No afecta a los proyectos ya creados.`}
                      textoConfirmar="Eliminar"
                      onConfirmar={() => eliminar.mutate(p.id)}
                    >
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        className="text-destructive"
                        aria-label="Eliminar plantilla"
                      >
                        <Trash2Icon />
                      </Button>
                    </ConfirmarDestructivo>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TarjetaTabla>
  );

  return (
    <>
      <EncabezadoPagina titulo="Plantillas de proyecto" />

      <Tabs defaultValue="personales">
        <TabsList>
          <TabsTrigger value="personales">Personales</TabsTrigger>
          <TabsTrigger value="sistema">Sistema</TabsTrigger>
        </TabsList>
        <TabsContent value="personales">
          {personales.length ? (
            tabla(personales)
          ) : (
            <EstadoVacio
              titulo="No tienes plantillas de proyecto"
              descripcion="Guarda un proyecto como plantilla desde su página de resumen para verlo aquí."
            />
          )}
        </TabsContent>
        <TabsContent value="sistema">
          {sistema.length ? (
            tabla(sistema)
          ) : (
            <EstadoVacio
              titulo="No hay plantillas de proyecto del sistema"
              descripcion="El administrador todavía no ha publicado plantillas de proyecto."
            />
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={preview != null} onOpenChange={(o) => !o && setPreview(null)}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Vista previa</DialogTitle>
            <DialogDescription>
              Estructura que tendrá el proyecto nuevo. Cantidades y precios se completan después.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[60vh] min-h-0 overflow-y-auto">
            {preview && <VistaPreviaPlantillaProyecto plantilla={preview} />}
          </div>
          <DialogFooter showCloseButton>
            {preview && (
              <Button
                onClick={() => {
                  setUsarId(preview.id);
                  setPreview(null);
                }}
              >
                <FolderPlusIcon data-icon="inline-start" /> Crear proyecto
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
            <Button
              onClick={handleCrear}
              disabled={!nombreNuevo.trim() || crearDesdePlantilla.isPending}
            >
              {crearDesdePlantilla.isPending ? "Creando…" : "Crear proyecto"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
