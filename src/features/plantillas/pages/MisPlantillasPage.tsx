import { useState } from "react";
import {
  usePlantillas,
  usePlantillaDetalle,
  useRenombrarPlantilla,
  useEliminarPlantilla,
} from "@/features/apu-editor/hooks/usePlantillas";
import { CargandoTabla } from "@/components/comunes/CargandoTabla";
import { EstadoVacio } from "@/components/comunes/EstadoVacio";
import { ConfirmarDestructivo } from "@/components/comunes/ConfirmarDestructivo";
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
import { EncabezadoPagina } from "@/components/comunes/EncabezadoPagina";
import { TarjetaTabla } from "@/components/comunes/TarjetaTabla";
import { EyeIcon, PencilIcon, Trash2Icon, SaveIcon, XIcon } from "lucide-react";

export function MisPlantillasPage() {
  const { data: plantillas, isPending } = usePlantillas("PERSONAL");
  const eliminar = useEliminarPlantilla();
  const renombrar = useRenombrarPlantilla();

  const [previewId, setPreviewId] = useState<string | null>(null);
  const [renombrarId, setRenombrarId] = useState<string | null>(null);
  const [nuevoNombre, setNuevoNombre] = useState("");

  const { data: previewData } = usePlantillaDetalle(previewId);

  const handleRenombrar = async () => {
    if (!nuevoNombre.trim() || !renombrarId) return;
    await renombrar.mutateAsync({
      id: renombrarId,
      body: { nombre: nuevoNombre.trim() },
    });
    setRenombrarId(null);
    setNuevoNombre("");
  };

  if (isPending) return <CargandoTabla />;

  return (
    <>
      <EncabezadoPagina titulo="Mis plantillas" />

      {!plantillas?.length ? (
        <EstadoVacio
          titulo="No tienes plantillas"
          descripcion="Guarda un APU como plantilla desde el editor para verlo aquí."
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
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(p.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label="Ver plantilla"
                        onClick={() => setPreviewId(p.id)}
                      >
                        <EyeIcon />
                      </Button>
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
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TarjetaTabla>
      )}

      <Dialog open={previewId != null} onOpenChange={(o) => !o && setPreviewId(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{previewData?.nombre ?? "Vista previa"}</DialogTitle>
            <DialogDescription>{previewData?.descripcionRubro}</DialogDescription>
          </DialogHeader>
          {previewData && (
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Descripción</span>
                <span>{previewData.descripcionRubro ?? "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Unidad</span>
                <span>{previewData.unidad ?? "—"}</span>
              </div>
            </div>
          )}
          <DialogFooter showCloseButton />
        </DialogContent>
      </Dialog>
    </>
  );
}
