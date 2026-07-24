import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
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
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  const { id } = useParams<{ id: string }>();
  const presupuestoId = Number(id);
  const navigate = useNavigate();

  const [q, setQ] = useState("");
  const [soloAuxiliares, setSoloAuxiliares] = useState(false);
  const [crearAbierto, setCrearAbierto] = useState(false);

  const filtros: Record<string, unknown> = {};
  if (q) filtros.q = q;
  if (soloAuxiliares) filtros.soloAuxiliares = true;

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

  if (isPending) return <CargandoTabla />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">APUs</h1>
        <Button onClick={() => setCrearAbierto(true)}>
          <PlusIcon /> Nuevo APU
        </Button>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <SearchIcon className="absolute left-2 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-8"
            placeholder="Buscar por código o descripción…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          <Switch
            id="solo-auxiliares"
            checked={soloAuxiliares}
            onCheckedChange={setSoloAuxiliares}
          />
          <Label htmlFor="solo-auxiliares">Solo auxiliares</Label>
        </div>
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
                    to={`/proyectos/${presupuestoId}/apus/${apu.id}`}
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
                        onClick={() => navigate(`/proyectos/${presupuestoId}/apus/${apu.id}`)}
                      >
                        <ExternalLinkIcon /> Abrir
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => duplicar.mutate(apu.id)}>
                        <CopyIcon /> Duplicar
                      </DropdownMenuItem>
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
        proyectoId={presupuestoId}
        onCreate={(apuId) => {
          setCrearAbierto(false);
          navigate(`/proyectos/${presupuestoId}/apus/${apuId}`);
        }}
      />
    </div>
  );
}
