import { useState } from "react";
import {
  usePlantillas,
  usePlantillaDetalle,
  useRenombrarPlantilla,
  useEliminarPlantilla,
} from "@/features/apu-editor/hooks/usePlantillas";
import { DetallePlantilla } from "@/features/workspace/components/agregar-apu/DetallePlantilla";
import { CargandoTabla } from "@/components/comunes/CargandoTabla";
import { EstadoVacio } from "@/components/comunes/EstadoVacio";
import { ConfirmarDestructivo } from "@/components/comunes/ConfirmarDestructivo";
import { InsigniaOrigen } from "@/components/comunes/InsigniaOrigen";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import type { PlantillaApuResumenResponse } from "@/api/contract";
import { EyeIcon, PencilIcon, Trash2Icon, SaveIcon, XIcon } from "lucide-react";

/**
 * Plantillas APU del usuario (PERSONAL) y del sistema (SISTEMA, solo
 * lectura). El backend ya rechaza editar o borrar una SISTEMA desde
 * `/plantillas-apu` (404), así que la pestaña de sistema ni siquiera ofrece
 * esas acciones.
 */
export function MisPlantillasPage() {
  const personales = usePlantillas("PERSONAL");
  const sistema = usePlantillas("SISTEMA");
  const [previewId, setPreviewId] = useState<string | null>(null);

  return (
    <>
      <EncabezadoPagina titulo="Plantillas APU" />

      <Tabs defaultValue="personales">
        <TabsList>
          <TabsTrigger value="personales">Personales</TabsTrigger>
          <TabsTrigger value="sistema">Sistema</TabsTrigger>
        </TabsList>
        <TabsContent value="personales">
          {personales.isPending ? (
            <CargandoTabla />
          ) : !personales.data?.length ? (
            <EstadoVacio
              titulo="No tienes plantillas"
              descripcion="Guarda un APU como plantilla desde el editor para verlo aquí."
            />
          ) : (
            <TablaPlantillas plantillas={personales.data} onVer={setPreviewId} editable />
          )}
        </TabsContent>
        <TabsContent value="sistema">
          {sistema.isPending ? (
            <CargandoTabla />
          ) : !sistema.data?.length ? (
            <EstadoVacio
              titulo="No hay plantillas del sistema"
              descripcion="El administrador todavía no ha publicado plantillas."
            />
          ) : (
            <TablaPlantillas plantillas={sistema.data} onVer={setPreviewId} />
          )}
        </TabsContent>
      </Tabs>

      <DialogoVistaPrevia id={previewId} onClose={() => setPreviewId(null)} />
    </>
  );
}

function TablaPlantillas({
  plantillas,
  onVer,
  editable = false,
}: {
  plantillas: PlantillaApuResumenResponse[];
  onVer: (id: string) => void;
  editable?: boolean;
}) {
  const eliminar = useEliminarPlantilla();
  const renombrar = useRenombrarPlantilla();
  const [renombrarId, setRenombrarId] = useState<string | null>(null);
  const [nuevoNombre, setNuevoNombre] = useState("");

  const handleRenombrar = async () => {
    if (!nuevoNombre.trim() || !renombrarId) return;
    await renombrar.mutateAsync({
      id: renombrarId,
      body: { nombre: nuevoNombre.trim() },
    });
    setRenombrarId(null);
    setNuevoNombre("");
  };

  return (
    <TarjetaTabla>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nombre</TableHead>
            <TableHead>Descripción</TableHead>
            <TableHead>Origen</TableHead>
            <TableHead>Fecha</TableHead>
            <TableHead className="w-24" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {plantillas.map((p) => (
            <TableRow key={p.id}>
              <TableCell className="font-medium">
                {renombrarId === p.id ? (
                  <div className="flex items-center gap-1">
                    <Input
                      className="h-7 text-xs"
                      value={nuevoNombre}
                      onChange={(e) => setNuevoNombre(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleRenombrar();
                        if (e.key === "Escape") {
                          setRenombrarId(null);
                          setNuevoNombre("");
                        }
                      }}
                      // oxlint-disable-next-line jsx-a11y/no-autofocus -- inline rename triggered by user click
                      autoFocus
                    />
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label="Guardar nombre"
                      onClick={handleRenombrar}
                    >
                      <SaveIcon />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label="Cancelar renombrado"
                      onClick={() => {
                        setRenombrarId(null);
                        setNuevoNombre("");
                      }}
                    >
                      <XIcon />
                    </Button>
                  </div>
                ) : (
                  p.nombre
                )}
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {p.descripcionRubro ?? "—"}
              </TableCell>
              <TableCell>
                <InsigniaOrigen tipo={p.tipo} />
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {new Date(p.createdAt).toLocaleDateString()}
              </TableCell>
              <TableCell>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Ver plantilla"
                    onClick={() => onVer(p.id)}
                  >
                    <EyeIcon />
                  </Button>
                  {editable && (
                    <>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label="Renombrar plantilla"
                        onClick={() => {
                          setRenombrarId(p.id);
                          setNuevoNombre(p.nombre);
                        }}
                      >
                        <PencilIcon />
                      </Button>
                      <ConfirmarDestructivo
                        titulo="Eliminar plantilla"
                        descripcion={`¿Eliminar "${p.nombre}"? No afecta a los APUs ya creados.`}
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
                    </>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TarjetaTabla>
  );
}

/**
 * Vista completa de solo lectura: secciones M/N/O/P con sus líneas, el mismo
 * render que el workspace usa al elegir una plantilla. El snapshot es
 * price-free por diseño (Plan 04 del backend), así que se muestra estructura
 * —códigos, cantidades y rendimientos—, no precios.
 */
function DialogoVistaPrevia({ id, onClose }: { id: string | null; onClose: () => void }) {
  const { data, isPending, isError } = usePlantillaDetalle(id);

  return (
    <Dialog open={id != null} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Vista previa</DialogTitle>
          <DialogDescription>
            Estructura de la plantilla. Los precios salen de la base de insumos del proyecto al
            usarla.
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-[60vh] min-h-0 overflow-y-auto">
          <DetallePlantilla detalle={data} cargando={isPending} error={isError} hayActiva />
        </div>
        <DialogFooter showCloseButton />
      </DialogContent>
    </Dialog>
  );
}
