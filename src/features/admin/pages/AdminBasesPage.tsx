import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
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
import { cn } from "@/lib/utils";
import type { BaseInsumosResponse } from "@/api/contract";
import {
  useAdminBases,
  useCrearBase,
  useEliminarBase,
  useArchivarBase,
  useRenombrarBase,
} from "../hooks/useAdminBases";
import { EncabezadoPagina } from "@/components/comunes/EncabezadoPagina";
import { TarjetaTabla } from "@/components/comunes/TarjetaTabla";
import { ArchiveIcon, ArchiveRestoreIcon, PencilIcon, PlusIcon, Trash2Icon } from "lucide-react";

/** Alta y renombrado piden lo mismo —un `nombre`— así que comparten diálogo. */
function DialogoNombreBase({
  abierto,
  titulo,
  inicial,
  onGuardar,
  onClose,
}: {
  abierto: boolean;
  titulo: string;
  inicial: string;
  onGuardar: (nombre: string) => void;
  onClose: () => void;
}) {
  const [nombre, setNombre] = useState(inicial);

  return (
    <Dialog open={abierto} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{titulo}</DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="nombre-base">Nombre</Label>
          {/* @Size(max=200) en el backend: se corta aquí para no gastar un 400. */}
          <Input
            id="nombre-base"
            maxLength={200}
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
          />
        </div>
        <DialogFooter>
          <Button
            disabled={nombre.trim() === ""}
            onClick={() => {
              onGuardar(nombre.trim());
              onClose();
            }}
          >
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function AdminBasesPage() {
  // El backend ya filtra por defecto (`incluirArchivadas=false`); el conmutador
  // viaja como query param, no filtra en cliente.
  const [incluirArchivadas, setIncluirArchivadas] = useState(false);
  const [creando, setCreando] = useState(false);
  const [renombrando, setRenombrando] = useState<BaseInsumosResponse | null>(null);

  const { data: bases, isPending } = useAdminBases({ incluirArchivadas });
  const crear = useCrearBase();
  const renombrar = useRenombrarBase();
  const eliminar = useEliminarBase();
  const archivar = useArchivarBase();

  if (isPending)
    return (
      <>
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64" />
      </>
    );

  return (
    <>
      <EncabezadoPagina
        titulo="Bases de insumos"
        acciones={
          <Button onClick={() => setCreando(true)}>
            <PlusIcon data-icon="inline-start" /> Nueva base
          </Button>
        }
      />
      <div className="flex items-center gap-2 mb-4">
        <Switch
          id="incluir-archivadas"
          checked={incluirArchivadas}
          onCheckedChange={setIncluirArchivadas}
        />
        <Label htmlFor="incluir-archivadas">Incluir archivadas</Label>
      </div>
      <TarjetaTabla>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Insumos</TableHead>
              <TableHead className="w-36 text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {bases?.map((b) => (
              <TableRow key={b.id} className={cn(b.archivada && "opacity-50")}>
                <TableCell className="font-medium">
                  <Link to={`/admin/bases/${b.id}`} className="hover:underline">
                    {b.nombre}
                  </Link>
                  {b.archivada && (
                    <Badge variant="outline" className="ml-2">
                      Archivada
                    </Badge>
                  )}
                </TableCell>
                <TableCell>{b.archivada ? "Archivada" : "Activa"}</TableCell>
                <TableCell className="font-mono text-sm">{b.totalInsumos}</TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="icon"
                    title="Renombrar"
                    onClick={() => setRenombrando(b)}
                  >
                    <PencilIcon />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    title={b.archivada ? "Restaurar" : "Archivar"}
                    onClick={() => archivar.mutate(b.id)}
                  >
                    {b.archivada ? <ArchiveRestoreIcon /> : <ArchiveIcon />}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    title="Eliminar"
                    className="text-destructive"
                    onClick={() => eliminar.mutate(b.id)}
                  >
                    <Trash2Icon />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TarjetaTabla>

      {creando && (
        <DialogoNombreBase
          abierto
          titulo="Nueva base central"
          inicial=""
          onGuardar={(nombre) => crear.mutate({ nombre })}
          onClose={() => setCreando(false)}
        />
      )}
      {renombrando && (
        <DialogoNombreBase
          abierto
          titulo="Renombrar base"
          inicial={renombrando.nombre}
          onGuardar={(nombre) => renombrar.mutate({ id: renombrando.id, nombre })}
          onClose={() => setRenombrando(null)}
        />
      )}
    </>
  );
}
