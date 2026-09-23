import { useState } from "react";
import { Link } from "react-router-dom";
import { useBasesCentrales } from "../hooks/useBasesCentrales";
import {
  useBasesPersonales,
  useCrearBasePersonal,
  useEliminarBasePersonal,
} from "../hooks/useBasesPersonales";
import { CargandoTabla } from "@/components/comunes/CargandoTabla";
import { ConfirmarDestructivo } from "@/components/comunes/ConfirmarDestructivo";
import { EncabezadoPagina } from "@/components/comunes/EncabezadoPagina";
import { EstadoVacio } from "@/components/comunes/EstadoVacio";
import { InsigniaOrigen } from "@/components/comunes/InsigniaOrigen";
import { TarjetaTabla } from "@/components/comunes/TarjetaTabla";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EyeIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { notificarError } from "@/lib/manejoErrores";

/**
 * Sección global de bases de insumos (bugs-pendientes §5). Las de sistema
 * (`CENTRAL` en el contrato) son de solo lectura para el usuario; las
 * personales son suyas: las crea, las llena y las borra. Para usar cualquiera
 * de las dos en un proyecto está «Copiar base» en los insumos del proyecto.
 */
export function BasesInsumosPage() {
  const [creando, setCreando] = useState(false);

  return (
    <>
      <EncabezadoPagina
        titulo="Insumos"
        descripcion="Bases de insumos del sistema y tus bases personales. Para usarlas en un proyecto, cópialas desde sus insumos."
        acciones={
          <Button onClick={() => setCreando(true)}>
            <PlusIcon data-icon="inline-start" /> Nueva base personal
          </Button>
        }
      />
      <Tabs defaultValue="sistema">
        <TabsList>
          <TabsTrigger value="sistema">Sistema</TabsTrigger>
          <TabsTrigger value="personales">Personales</TabsTrigger>
        </TabsList>
        <TabsContent value="sistema">
          <ListaBasesSistema />
        </TabsContent>
        <TabsContent value="personales">
          <ListaBasesPersonales onCrear={() => setCreando(true)} />
        </TabsContent>
      </Tabs>
      {creando && <DialogoCrearBase onClose={() => setCreando(false)} />}
    </>
  );
}

function ListaBasesSistema() {
  const { data: bases, isPending } = useBasesCentrales();

  if (isPending) return <CargandoTabla />;
  if (!bases?.length)
    return (
      <EstadoVacio
        titulo="No hay bases del sistema"
        descripcion="El administrador todavía no ha publicado bases de insumos."
      />
    );

  return (
    <TarjetaTabla>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nombre</TableHead>
            <TableHead>Origen</TableHead>
            <TableHead className="text-right">Insumos</TableHead>
            <TableHead className="w-16" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {bases.map((b) => (
            <TableRow key={b.id}>
              <TableCell className="font-medium">
                {b.nombre}
                {b.archivada && (
                  <Badge variant="outline" className="ml-2 text-muted-foreground">
                    Archivada
                  </Badge>
                )}
              </TableCell>
              <TableCell>
                <InsigniaOrigen tipo={b.tipo} />
              </TableCell>
              <TableCell className="text-right tabular-nums">{b.totalInsumos}</TableCell>
              <TableCell>
                <Button variant="ghost" size="icon-sm" asChild>
                  <Link to={`/insumos/sistema/${b.id}`} aria-label={`Ver ${b.nombre}`}>
                    <EyeIcon />
                  </Link>
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TarjetaTabla>
  );
}

function ListaBasesPersonales({ onCrear }: { onCrear: () => void }) {
  const { data: bases, isPending } = useBasesPersonales();
  const eliminar = useEliminarBasePersonal();

  if (isPending) return <CargandoTabla />;
  if (!bases?.length)
    return (
      <EstadoVacio
        titulo="No tienes bases personales"
        descripcion="Crea una base para guardar tus propios precios de insumos y reutilizarlos entre proyectos."
        accion={
          <Button onClick={onCrear}>
            <PlusIcon /> Nueva base personal
          </Button>
        }
      />
    );

  return (
    <TarjetaTabla>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nombre</TableHead>
            <TableHead>Origen</TableHead>
            <TableHead className="text-right">Insumos</TableHead>
            <TableHead className="w-24" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {bases.map((b) => (
            <TableRow key={b.id}>
              <TableCell className="font-medium">{b.nombre}</TableCell>
              <TableCell>
                <InsigniaOrigen tipo="PERSONAL" />
              </TableCell>
              <TableCell className="text-right tabular-nums">{b.totalInsumos}</TableCell>
              <TableCell>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon-sm" asChild>
                    <Link to={`/insumos/personales/${b.id}`} aria-label={`Abrir ${b.nombre}`}>
                      <EyeIcon />
                    </Link>
                  </Button>
                  <ConfirmarDestructivo
                    titulo="Eliminar base personal"
                    descripcion={`¿Eliminar "${b.nombre}" y sus ${b.totalInsumos} insumos? Los proyectos a los que ya la copiaste no cambian.`}
                    textoConfirmar="Eliminar"
                    onConfirmar={async () => {
                      try {
                        await eliminar.mutateAsync(b.id);
                      } catch (err) {
                        notificarError(err, "No se pudo eliminar la base");
                      }
                    }}
                  >
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="text-destructive"
                      aria-label={`Eliminar ${b.nombre}`}
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
  );
}

function DialogoCrearBase({ onClose }: { onClose: () => void }) {
  const [nombre, setNombre] = useState("");
  const crear = useCrearBasePersonal();

  const enviar = async () => {
    if (!nombre.trim()) return;
    try {
      await crear.mutateAsync({ nombre: nombre.trim() });
      onClose();
    } catch (err) {
      notificarError(err, "No se pudo crear la base");
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Nueva base personal</DialogTitle>
          <DialogDescription>Sólo tú puedes verla y editarla.</DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="nombre-base-personal">Nombre *</Label>
          <Input
            id="nombre-base-personal"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") enviar();
            }}
            // oxlint-disable-next-line jsx-a11y/no-autofocus -- dialog primary input
            autoFocus
          />
        </div>
        <DialogFooter>
          <Button onClick={enviar} disabled={!nombre.trim() || crear.isPending}>
            {crear.isPending ? "Creando…" : "Crear base"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
