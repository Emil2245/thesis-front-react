import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { get } from "@/api/request";
import { qk } from "@/api/queryKeys";
import type { ProyectoResponse } from "@/api/contract";
import { ChipEstado } from "@/components/comunes/ChipEstado";
import { ConfirmarDestructivo } from "@/components/comunes/ConfirmarDestructivo";
import { EstadoVacio } from "@/components/comunes/EstadoVacio";
import { CargandoTabla } from "@/components/comunes/CargandoTabla";
import { useEliminarProyecto } from "../hooks/useProyectos";
import { AsistenteCrearProyecto } from "../components/AsistenteCrearProyecto";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { MoreHorizontalIcon, PlusIcon, ExternalLinkIcon, CopyIcon, Trash2Icon } from "lucide-react";

export function ListaProyectosPage() {
  const navigate = useNavigate();
  const { data, isPending } = useQuery({
    queryKey: qk.proyectos(),
    queryFn: () => get<{ contenido: ProyectoResponse[] }>("/proyectos"),
  });

  const eliminar = useEliminarProyecto();
  const [asistenteAbierto, setAsistenteAbierto] = useState(false);

  if (isPending) return <CargandoTabla />;

  if (!data?.contenido.length) {
    return (
      <EstadoVacio
        titulo="No hay proyectos"
        descripcion="Crea tu primer proyecto para empezar."
        accion={
          <Button onClick={() => setAsistenteAbierto(true)}>
            <PlusIcon /> Crear proyecto
          </Button>
        }
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Proyectos</h1>
        <Button onClick={() => setAsistenteAbierto(true)}>
          <PlusIcon /> Nuevo proyecto
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Código</TableHead>
            <TableHead>Nombre</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead>Última modificación</TableHead>
            <TableHead className="w-12" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.contenido.map((p) => (
            <TableRow key={p.id}>
              <TableCell className="font-mono text-xs">{p.codigo}</TableCell>
              <TableCell>
                <Link to={`/proyectos/${p.id}`} className="text-primary underline">
                  {p.nombreProyecto}
                </Link>
              </TableCell>
              <TableCell>
                <ChipEstado estado={p.estado} />
              </TableCell>
              <TableCell className="text-muted-foreground">
                {p.updatedAt ? new Date(p.updatedAt).toLocaleDateString("es-EC") : "—"}
              </TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon-sm">
                      <MoreHorizontalIcon />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => navigate(`/proyectos/${p.id}`)}>
                      <ExternalLinkIcon /> Abrir
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate(`/proyectos/${p.id}?duplicar=true`)}>
                      <CopyIcon /> Duplicar
                    </DropdownMenuItem>
                    <ConfirmarDestructivo
                      titulo="Eliminar proyecto"
                      descripcion={`¿Eliminar "${p.nombreProyecto}"? Esta acción no se puede deshacer.`}
                      textoConfirmar="Eliminar"
                      onConfirmar={() => eliminar.mutate(p.id)}
                    >
                      <DropdownMenuItem
                        className="text-destructive"
                        onSelect={(e) => e.preventDefault()}
                      >
                        <Trash2Icon /> Eliminar
                      </DropdownMenuItem>
                    </ConfirmarDestructivo>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <AsistenteCrearProyecto
        abierto={asistenteAbierto}
        onClose={() => setAsistenteAbierto(false)}
      />
    </div>
  );
}
