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
import { EncabezadoPagina } from "@/components/comunes/EncabezadoPagina";
import { TarjetaTabla } from "@/components/comunes/TarjetaTabla";
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

  const total = data.contenido.length;
  const enProceso = data.contenido.filter((p) => p.estado === "EN_PROCESO").length;

  return (
    <>
      <EncabezadoPagina
        titulo="Proyectos"
        descripcion={`${total} ${total === 1 ? "proyecto" : "proyectos"} · ${enProceso} en proceso`}
        acciones={
          <Button onClick={() => setAsistenteAbierto(true)}>
            <PlusIcon data-icon="inline-start" /> Nuevo proyecto
          </Button>
        }
      />

      <TarjetaTabla
        pie={
          <span>
            Mostrando {total} de {total} {total === 1 ? "proyecto" : "proyectos"}
          </span>
        }
      >
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-28">Código</TableHead>
              <TableHead>Nombre</TableHead>
              <TableHead className="w-36">Estado</TableHead>
              <TableHead className="w-40">Última modificación</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.contenido.map((p) => (
              <TableRow key={p.id} className="h-11">
                <TableCell className="font-mono text-xs text-muted-foreground">
                  {p.codigo}
                </TableCell>
                <TableCell>
                  <Link to={`/proyectos/${p.id}`} className="font-medium hover:underline">
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
                      <DropdownMenuItem
                        onClick={() => navigate(`/proyectos/${p.id}?duplicar=true`)}
                      >
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
      </TarjetaTabla>

      <AsistenteCrearProyecto
        abierto={asistenteAbierto}
        onClose={() => setAsistenteAbierto(false)}
      />
    </>
  );
}
