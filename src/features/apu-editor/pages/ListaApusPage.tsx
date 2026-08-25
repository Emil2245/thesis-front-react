import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useVersionActiva, useProyectoActivoId } from "@/shell/contexto";
import { useApus, useEliminarApu, useDuplicarApu } from "../hooks/useApus";
import { DialogoNuevoApu } from "../components/DialogoNuevoApu";
import { BadgeAuxiliar } from "../components/BadgeAuxiliar";
import { CargandoTabla } from "@/components/comunes/CargandoTabla";
import { EstadoVacio } from "@/components/comunes/EstadoVacio";
import { ConfirmarDestructivo } from "@/components/comunes/ConfirmarDestructivo";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { MOTIVO_SIN_BACKEND } from "@/lib/disponibilidad";
import {
  PlusIcon,
  MoreHorizontalIcon,
  ExternalLinkIcon,
  CopyIcon,
  Trash2Icon,
  SearchIcon,
  LinkIcon,
} from "lucide-react";
import { formatearMoneda } from "@/lib/decimal";
import { toast } from "sonner";
import { ApiError } from "@/api/problem";

export function ListaApusPage() {
  // La versión la manda el selector de la barra superior; el id de ruta es del
  // proyecto y solo se usa para las URLs de navegación.
  const proyectoId = useProyectoActivoId();
  const { presupuestoId: versionActiva } = useVersionActiva();
  const presupuestoId = versionActiva ?? 0;
  const navigate = useNavigate();

  const [q, setQ] = useState("");
  const [crearAbierto, setCrearAbierto] = useState(false);

  const filtros: Record<string, unknown> = {};
  if (q) filtros.q = q;

  const { data, isPending } = useApus(presupuestoId, filtros);
  const eliminar = useEliminarApu(presupuestoId);
  const duplicar = useDuplicarApu(presupuestoId);

  const manejarEliminar = async (apuId: number) => {
    try {
      await eliminar.mutateAsync(apuId);
    } catch (e) {
      if (e instanceof ApiError && e.is("apu-referenciado")) {
        toast.error(
          `No se puede eliminar: el APU está referenciado por otros elementos del presupuesto.`,
        );
      }
    }
  };

  if (!presupuestoId) {
    return (
      <EstadoVacio
        titulo="Sin versión seleccionada"
        descripcion="Elige una versión en la barra superior para ver sus APUs."
      />
    );
  }

  if (isPending) return <CargandoTabla />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">APUs</h1>
        <Button onClick={() => setCrearAbierto(true)}>
          <PlusIcon /> Nuevo APU
        </Button>
      </div>

      <div className="relative">
        <SearchIcon className="absolute left-2 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="pl-8"
          placeholder="Buscar por código o descripción…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      {!data?.contenido.length ? (
        <EstadoVacio
          titulo="No hay APUs"
          descripcion="Crea el primer APU para empezar."
          accion={
            <Button onClick={() => setCrearAbierto(true)}>
              <PlusIcon /> Crear APU
            </Button>
          }
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Código</TableHead>
              <TableHead>Descripción</TableHead>
              <TableHead>Unidad</TableHead>
              <TableHead className="num">CD</TableHead>
              <TableHead className="num">CT</TableHead>
              <TableHead />
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.contenido.map((apu) => (
              <TableRow key={apu.id}>
                <TableCell className="font-mono text-xs">{apu.codigo}</TableCell>
                <TableCell>
                  <Link
                    to={`/proyectos/${proyectoId}/apus/${apu.id}`}
                    className="text-primary underline"
                  >
                    {apu.descripcion}
                  </Link>
                </TableCell>
                <TableCell>{apu.unidad}</TableCell>
                <TableCell className="num">{formatearMoneda(apu.costoDirecto)}</TableCell>
                <TableCell className="num">{formatearMoneda(apu.costoTotal)}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <BadgeAuxiliar esAuxiliar={apu.esAuxiliar} />
                    {apu.vinculado && <LinkIcon className="size-3 text-muted-foreground" />}
                  </div>
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon-sm">
                        <MoreHorizontalIcon />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => navigate(`/proyectos/${proyectoId}/apus/${apu.id}`)}
                      >
                        <ExternalLinkIcon /> Abrir
                      </DropdownMenuItem>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span>
                            <DropdownMenuItem disabled onClick={() => duplicar.mutate(apu.id)}>
                              <CopyIcon /> Duplicar
                            </DropdownMenuItem>
                          </span>
                        </TooltipTrigger>
                        <TooltipContent>{MOTIVO_SIN_BACKEND}</TooltipContent>
                      </Tooltip>
                      {!apu.vinculado && (
                        <ConfirmarDestructivo
                          titulo="Eliminar APU"
                          descripcion={`¿Eliminar "${apu.descripcion}"? Esta acción no se puede deshacer.`}
                          textoConfirmar="Eliminar"
                          onConfirmar={() => manejarEliminar(apu.id)}
                        >
                          <DropdownMenuItem
                            className="text-destructive"
                            onSelect={(e) => e.preventDefault()}
                          >
                            <Trash2Icon /> Eliminar
                          </DropdownMenuItem>
                        </ConfirmarDestructivo>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <DialogoNuevoApu
        abierto={crearAbierto}
        onClose={() => setCrearAbierto(false)}
        presupuestoId={presupuestoId}
        proyectoId={proyectoId ?? 0}
        onCreate={(apuId) => {
          setCrearAbierto(false);
          navigate(`/proyectos/${proyectoId}/apus/${apuId}`);
        }}
      />
    </div>
  );
}
