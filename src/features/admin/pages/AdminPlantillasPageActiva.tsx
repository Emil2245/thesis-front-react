import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Field } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Pagination, PaginationContent, PaginationItem } from "@/components/ui/pagination";
import { EncabezadoPagina } from "@/components/comunes/EncabezadoPagina";
import { EstadoVacio } from "@/components/comunes/EstadoVacio";
import { TarjetaTabla } from "@/components/comunes/TarjetaTabla";
import { ApiError } from "@/api/problem";
import type { PlantillaApuAdminEditarRequest, PlantillaApuAdminResponse } from "@/api/contract";
import { ChevronLeftIcon, ChevronRightIcon, PencilIcon, PlusIcon, Trash2Icon } from "lucide-react";
import {
  usePlantillasAdmin,
  useCrearPlantillaAdmin,
  useEditarPlantillaAdmin,
  useEliminarPlantillaAdmin,
} from "../hooks/usePlantillasAdmin";
import { useProyectos } from "@/features/proyectos/hooks/useProyectos";
import { useVersiones } from "@/features/presupuesto/hooks/usePresupuesto";
import { useApus } from "@/features/apu-editor/hooks/useApus";

const MENSAJE_SIN_APUS = "No hay APUs disponibles para crear una plantilla";

/**
 * Alta: cascada de tres selectores encadenados (§9bis del plan 078). No existe
 * `GET /admin/apus` ni ningún listado global de APUs — `desdeApuId` sólo puede
 * salir de un APU real, y el único camino para llegar a uno es
 * proyecto → versión de presupuesto → APU, reutilizando los hooks que ya
 * existen. Si cualquier nivel viene vacío, la pantalla lo dice con un estado
 * vacío honesto en vez de fingir que la cascada funciona.
 */
function DialogoCrear({
  abierto,
  onClose,
  onCrear,
}: {
  abierto: boolean;
  onClose: () => void;
  onCrear: (datos: {
    desdeApuId: string;
    nombre: string;
    descripcionRubro?: string;
  }) => Promise<unknown>;
}) {
  const [proyectoId, setProyectoId] = useState("");
  const [presupuestoId, setPresupuestoId] = useState("");
  const [apuId, setApuId] = useState("");
  const [nombre, setNombre] = useState("");
  const [descripcionRubro, setDescripcionRubro] = useState("");
  const [errorGeneral, setErrorGeneral] = useState("");

  const proyectos = useProyectos();
  const versiones = useVersiones(proyectoId);
  const apus = useApus(presupuestoId);

  const listaProyectos = proyectos.data?.contenido ?? [];
  const listaVersiones = versiones.data ?? [];
  const listaApus = apus.data?.contenido ?? [];

  const sinProyectos = proyectos.isSuccess && listaProyectos.length === 0;
  const sinVersiones = !!proyectoId && versiones.isSuccess && listaVersiones.length === 0;
  const sinApus = !!presupuestoId && apus.isSuccess && listaApus.length === 0;
  const cascadaVacia = sinProyectos || sinVersiones || sinApus;

  async function enviar() {
    setErrorGeneral("");
    try {
      await onCrear({
        desdeApuId: apuId,
        nombre: nombre.trim(),
        descripcionRubro: descripcionRubro.trim() || undefined,
      });
      onClose();
    } catch (e) {
      setErrorGeneral(e instanceof ApiError ? e.problem.mensaje : "Error al crear plantilla");
    }
  }

  return (
    <Dialog open={abierto} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nueva plantilla desde APU</DialogTitle>
        </DialogHeader>
        {errorGeneral ? <p className="text-sm text-destructive">{errorGeneral}</p> : null}

        {cascadaVacia ? (
          <EstadoVacio
            titulo={MENSAJE_SIN_APUS}
            descripcion="Ningún proyecto visible tiene todavía un presupuesto con APUs."
          />
        ) : (
          <div className="space-y-4">
            <Field>
              <Label htmlFor="crear-plantilla-proyecto">Proyecto</Label>
              <Select
                value={proyectoId}
                onValueChange={(v) => {
                  setProyectoId(v);
                  setPresupuestoId("");
                  setApuId("");
                }}
              >
                <SelectTrigger id="crear-plantilla-proyecto" className="w-full">
                  <SelectValue placeholder="Selecciona un proyecto" />
                </SelectTrigger>
                <SelectContent>
                  {listaProyectos.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.nombreProyecto}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <Label htmlFor="crear-plantilla-version">Versión de presupuesto</Label>
              <Select
                value={presupuestoId}
                disabled={!proyectoId}
                onValueChange={(v) => {
                  setPresupuestoId(v);
                  setApuId("");
                }}
              >
                <SelectTrigger id="crear-plantilla-version" className="w-full">
                  <SelectValue placeholder="Selecciona una versión" />
                </SelectTrigger>
                <SelectContent>
                  {listaVersiones.map((v) => (
                    <SelectItem key={v.presupuestoId} value={v.presupuestoId}>
                      Versión {v.version}
                      {v.esVigente ? " (vigente)" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <Label htmlFor="crear-plantilla-apu">APU de origen</Label>
              <Select value={apuId} disabled={!presupuestoId} onValueChange={setApuId}>
                <SelectTrigger id="crear-plantilla-apu" className="w-full">
                  <SelectValue placeholder="Selecciona un APU" />
                </SelectTrigger>
                <SelectContent>
                  {listaApus.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.codigo} — {a.descripcion}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <Label htmlFor="crear-plantilla-nombre">Nombre</Label>
              <Input
                id="crear-plantilla-nombre"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
              />
            </Field>
            <Field>
              <Label htmlFor="crear-plantilla-descripcion">Descripción del rubro</Label>
              <Textarea
                id="crear-plantilla-descripcion"
                value={descripcionRubro}
                onChange={(e) => setDescripcionRubro(e.target.value)}
              />
            </Field>
          </div>
        )}

        <DialogFooter>
          <Button disabled={cascadaVacia || !apuId || nombre.trim() === ""} onClick={enviar}>
            Crear
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Edición: sólo metadatos (`nombre`, `descripcionRubro`). El PUT es semántica
 * de presencia de verdad (§9 del plan 078): sólo se manda la clave del campo
 * que de verdad cambió, nunca las tres a la vez ni el objeto entero.
 */
function DialogoEditar({
  plantilla,
  onClose,
  onGuardar,
}: {
  plantilla: PlantillaApuAdminResponse;
  onClose: () => void;
  onGuardar: (cambios: PlantillaApuAdminEditarRequest) => Promise<unknown>;
}) {
  const [nombre, setNombre] = useState(plantilla.nombre);
  const [descripcion, setDescripcion] = useState(plantilla.descripcionRubro ?? "");
  const [errorGeneral, setErrorGeneral] = useState("");

  async function enviar() {
    setErrorGeneral("");
    const cambios: PlantillaApuAdminEditarRequest = {};
    if (nombre.trim() !== plantilla.nombre) cambios.nombre = nombre.trim();
    if (descripcion !== (plantilla.descripcionRubro ?? "")) cambios.descripcionRubro = descripcion;
    if (Object.keys(cambios).length === 0) {
      onClose();
      return;
    }
    try {
      await onGuardar(cambios);
      onClose();
    } catch (e) {
      setErrorGeneral(e instanceof ApiError ? e.problem.mensaje : "Error al actualizar plantilla");
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Editar plantilla</DialogTitle>
        </DialogHeader>
        {errorGeneral ? <p className="text-sm text-destructive">{errorGeneral}</p> : null}
        <div className="space-y-4">
          <Field>
            <Label htmlFor="editar-plantilla-nombre">Nombre</Label>
            <Input
              id="editar-plantilla-nombre"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
            />
          </Field>
          <Field>
            <Label htmlFor="editar-plantilla-descripcion">Descripción del rubro</Label>
            <Textarea
              id="editar-plantilla-descripcion"
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
            />
          </Field>
        </div>
        <DialogFooter>
          <Button disabled={nombre.trim() === ""} onClick={enviar}>
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function AdminPlantillasPageActiva() {
  const [q, setQ] = useState("");
  const [page, setPage] = useState(0);
  const [creando, setCreando] = useState(false);
  const [editando, setEditando] = useState<PlantillaApuAdminResponse | null>(null);
  const [errorEliminar, setErrorEliminar] = useState("");

  const { data: plantillas, isPending, isError, error } = usePlantillasAdmin({ q, page, size: 25 });
  const crear = useCrearPlantillaAdmin();
  const editar = useEditarPlantillaAdmin();
  const eliminar = useEliminarPlantillaAdmin();

  if (isPending)
    return (
      <>
        <EncabezadoPagina titulo="Plantillas del sistema" />
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64" />
      </>
    );

  if (isError)
    return (
      <>
        <EncabezadoPagina titulo="Plantillas del sistema" />
        <EstadoVacio
          titulo="No se pudo cargar la lista de plantillas"
          descripcion={error instanceof ApiError ? error.problem.mensaje : "Intenta de nuevo."}
        />
      </>
    );

  // El borrado se muestra también aquí, no sólo en el toast: `mutate` +
  // `onError` basta para el toast, pero un test —y un usuario que no lo vio—
  // necesita algo que siga en pantalla.
  async function manejarEliminar(id: string) {
    setErrorEliminar("");
    try {
      await eliminar.mutateAsync(id);
      setPage(0);
    } catch (e) {
      setErrorEliminar(e instanceof ApiError ? e.problem.mensaje : "Error al eliminar plantilla");
    }
  }

  return (
    <>
      <EncabezadoPagina
        titulo="Plantillas del sistema"
        acciones={
          <Button onClick={() => setCreando(true)}>
            <PlusIcon data-icon="inline-start" /> Nueva plantilla
          </Button>
        }
      />

      {errorEliminar ? <p className="text-sm text-destructive">{errorEliminar}</p> : null}

      <div className="max-w-sm">
        <Label htmlFor="buscar-plantillas" className="sr-only">
          Buscar plantillas
        </Label>
        <Input
          id="buscar-plantillas"
          placeholder="Buscar por nombre…"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setPage(0);
          }}
        />
      </div>

      <TarjetaTabla
        pie={
          plantillas.totalPaginas > 1 || page > 0 ? (
            <Pagination className="mx-0 w-auto">
              <PaginationContent>
                <PaginationItem>
                  <Button
                    aria-label="Página anterior"
                    variant="outline"
                    size="icon-sm"
                    disabled={page === 0}
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                  >
                    <ChevronLeftIcon />
                  </Button>
                </PaginationItem>
                <PaginationItem>
                  <Button
                    aria-label="Página siguiente"
                    variant="outline"
                    size="icon-sm"
                    disabled={page >= plantillas.totalPaginas - 1}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    <ChevronRightIcon />
                  </Button>
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          ) : undefined
        }
      >
        {plantillas.contenido.length === 0 ? (
          <EstadoVacio
            titulo="Sin plantillas"
            descripcion="Ninguna plantilla de sistema coincide con la búsqueda."
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Descripción</TableHead>
                <TableHead>Creada</TableHead>
                <TableHead className="w-24 text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {plantillas.contenido.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.nombre}</TableCell>
                  <TableCell>{p.descripcionRubro ?? "—"}</TableCell>
                  <TableCell>{new Date(p.fechaCreacion).toLocaleDateString("es-EC")}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      title="Editar"
                      onClick={() => setEditando(p)}
                    >
                      <PencilIcon />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      title="Eliminar"
                      className="text-destructive"
                      onClick={() => manejarEliminar(p.id)}
                    >
                      <Trash2Icon />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </TarjetaTabla>

      {creando && (
        <DialogoCrear
          abierto
          onClose={() => setCreando(false)}
          onCrear={(datos) => crear.mutateAsync(datos)}
        />
      )}
      {editando && (
        <DialogoEditar
          plantilla={editando}
          onClose={() => setEditando(null)}
          onGuardar={(cambios) => editar.mutateAsync({ id: editando.id, ...cambios })}
        />
      )}
    </>
  );
}
