import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ChipEstado } from "@/components/comunes/ChipEstado";
import { ConfirmarDestructivo } from "@/components/comunes/ConfirmarDestructivo";
import { EstadoVacio } from "@/components/comunes/EstadoVacio";
import { CargandoTabla } from "@/components/comunes/CargandoTabla";
import { EncabezadoPagina } from "@/components/comunes/EncabezadoPagina";
import { TarjetaTabla } from "@/components/comunes/TarjetaTabla";
import { useEliminarProyecto, useProyectos } from "../hooks/useProyectos";
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
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Pagination, PaginationContent, PaginationItem } from "@/components/ui/pagination";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { MOTIVO_SIN_BACKEND } from "@/lib/disponibilidad";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  MoreHorizontalIcon,
  PlusIcon,
  ExternalLinkIcon,
  CopyIcon,
  Trash2Icon,
  SearchIcon,
} from "lucide-react";

type EstadoFiltro = "" | "BORRADOR" | "EN_PROCESO" | "FINALIZADO";

function useDebounce<T>(valor: T, retardoMs: number): T {
  const [debounced, setDebounced] = useState(valor);
  useEffect(() => {
    const temporizador = setTimeout(() => setDebounced(valor), retardoMs);
    return () => clearTimeout(temporizador);
  }, [valor, retardoMs]);
  return debounced;
}

export function ListaProyectosPage() {
  const navigate = useNavigate();

  const [q, setQ] = useState("");
  const [estado, setEstado] = useState<EstadoFiltro>("");
  const [page, setPage] = useState(0);
  const qBuscado = useDebounce(q, 300);

  const filtros = useMemo(() => {
    const f: Record<string, unknown> = {};
    if (qBuscado) f.q = qBuscado;
    if (estado) f.estado = estado;
    f.page = page;
    return f;
  }, [qBuscado, estado, page]);

  const { data, isPending } = useProyectos(filtros);

  const eliminar = useEliminarProyecto();
  const [asistenteAbierto, setAsistenteAbierto] = useState(false);

  const manejarCambioBusqueda = (valor: string) => {
    setQ(valor);
    setPage(0);
  };

  const manejarCambioEstado = (valor: string) => {
    setEstado(valor as EstadoFiltro);
    setPage(0);
  };

  const limpiarFiltros = () => {
    setQ("");
    setEstado("");
    setPage(0);
  };

  if (isPending) return <CargandoTabla />;

  const hayFiltros = q !== "" || estado !== "";

  if (!data?.contenido.length) {
    return hayFiltros ? (
      <EstadoVacio
        titulo="Sin resultados"
        descripcion="Ningún proyecto coincide con la búsqueda."
        accion={
          <Button variant="outline" onClick={limpiarFiltros}>
            Limpiar filtros
          </Button>
        }
      />
    ) : (
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
          <>
            <InputGroup className="w-64">
              <InputGroupAddon>
                <SearchIcon />
              </InputGroupAddon>
              <InputGroupInput
                placeholder="Buscar proyecto…"
                aria-label="Buscar proyecto"
                value={q}
                onChange={(e) => manejarCambioBusqueda(e.target.value)}
              />
            </InputGroup>
            <Select value={estado} onValueChange={manejarCambioEstado}>
              <SelectTrigger aria-label="Filtrar por estado" className="w-36">
                {/* Radix trata "" como "sin selección": sin placeholder el trigger queda en blanco. */}
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="">Todos</SelectItem>
                  <SelectItem value="BORRADOR">Borrador</SelectItem>
                  <SelectItem value="EN_PROCESO">En proceso</SelectItem>
                  <SelectItem value="FINALIZADO">Finalizado</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
            <Button onClick={() => setAsistenteAbierto(true)}>
              <PlusIcon data-icon="inline-start" /> Nuevo proyecto
            </Button>
          </>
        }
      />

      <TarjetaTabla
        pie={
          <>
            <span>
              Mostrando {data.contenido.length} de {data.totalElementos}{" "}
              {data.totalElementos === 1 ? "proyecto" : "proyectos"}
            </span>
            {data.totalPaginas > 1 && (
              <Pagination className="mx-0 w-auto">
                <PaginationContent>
                  <PaginationItem>
                    <Button
                      variant="outline"
                      size="icon-sm"
                      aria-label="Página anterior"
                      disabled={data.page === 0}
                      onClick={() => setPage((p) => Math.max(0, p - 1))}
                    >
                      <ChevronLeftIcon />
                    </Button>
                  </PaginationItem>
                  <PaginationItem>
                    <Button
                      variant="outline"
                      size="icon-sm"
                      aria-label="Página siguiente"
                      disabled={data.page >= data.totalPaginas - 1}
                      onClick={() => setPage((p) => p + 1)}
                    >
                      <ChevronRightIcon />
                    </Button>
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            )}
          </>
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
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span>
                            <DropdownMenuItem
                              disabled
                              onClick={() => navigate(`/proyectos/${p.id}?duplicar=true`)}
                            >
                              <CopyIcon /> Duplicar
                            </DropdownMenuItem>
                          </span>
                        </TooltipTrigger>
                        <TooltipContent>{MOTIVO_SIN_BACKEND}</TooltipContent>
                      </Tooltip>
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
