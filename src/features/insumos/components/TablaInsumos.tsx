import { useState, useMemo } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  createColumnHelper,
  flexRender,
  type SortingState,
  type RowData,
} from "@tanstack/react-table";
import { useInsumos } from "../hooks/useInsumos";
import { useEliminarInsumo } from "../hooks/useInsumoMutaciones";
import { BadgeDesactualizado } from "./BadgeDesactualizado";
import { DialogoInsumo } from "./DialogoInsumo";
import { DialogoUsoInsumo } from "./DialogoUsoInsumo";
import { AsistenteImportCsv } from "./AsistenteImportCsv";
import { DialogoCopiarBase } from "./DialogoCopiarBase";
import { CargandoTabla } from "@/components/comunes/CargandoTabla";
import { EstadoVacio } from "@/components/comunes/EstadoVacio";
import { ConfirmarDestructivo } from "@/components/comunes/ConfirmarDestructivo";
import { Moneda } from "@/components/comunes/Moneda";
import { TarjetaTabla } from "@/components/comunes/TarjetaTabla";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { MOTIVO_SIN_BACKEND } from "@/lib/disponibilidad";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  MoreHorizontalIcon,
  PlusIcon,
  FileUpIcon,
  CopyIcon,
  EditIcon,
  EyeIcon,
  Trash2Icon,
  SearchIcon,
} from "lucide-react";
import type { InsumoResponse, InsumoUsoResponse } from "@/api/contract";
import { ApiError, type InsumoEnUsoProblem } from "@/api/problem";

declare module "@tanstack/react-table" {
  interface ColumnMeta<TData extends RowData, TValue> {
    align?: "left" | "right";
    _phantom?: [TData, TValue];
  }
}

const TIPO_TABS = [
  { value: "", label: "Todos" },
  { value: "MATERIAL", label: "Materiales" },
  { value: "MANO_OBRA", label: "Mano de obra" },
  { value: "EQUIPO", label: "Equipo" },
  { value: "TRANSPORTE", label: "Transporte" },
];

const columnHelper = createColumnHelper<InsumoResponse>();

export function TablaInsumos({ proyectoId }: { proyectoId: string }) {
  const [tipo, setTipo] = useState("");
  const [q, setQ] = useState("");
  const [soloDesactualizados, setSoloDesactualizados] = useState(false);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [page, setPage] = useState(0);

  const [dialogoAbierto, setDialogoAbierto] = useState(false);
  const [insumoEditar, setInsumoEditar] = useState<InsumoResponse | undefined>(undefined);
  const [importAbierto, setImportAbierto] = useState(false);
  const [copiarAbierto, setCopiarAbierto] = useState(false);
  const [usoDialogo, setUsoDialogo] = useState<{
    abierto: boolean;
    insumoId: string;
    usosPrecargados?: InsumoUsoResponse[];
  }>({ abierto: false, insumoId: "" });

  const filtros = useMemo(() => {
    const f: Record<string, unknown> = {};
    if (tipo) f.tipo = tipo;
    if (q) f.q = q;
    if (soloDesactualizados) f.desactualizados = true;
    f.page = page;
    return f;
  }, [tipo, q, soloDesactualizados, page]);

  const { data, isPending } = useInsumos(proyectoId, filtros);
  const eliminar = useEliminarInsumo(proyectoId);

  const columns = useMemo(
    () => [
      columnHelper.accessor("codigo", {
        header: "Código",
        cell: (info) => <span className="font-mono text-xs">{info.getValue()}</span>,
      }),
      columnHelper.accessor("descripcion", {
        header: "Descripción",
      }),
      columnHelper.accessor("tipo", {
        header: "Tipo",
        cell: (info) => <Badge variant="outline">{info.getValue()}</Badge>,
      }),
      columnHelper.accessor("unidad", {
        header: "Unidad",
      }),
      columnHelper.accessor("precioUnitario", {
        header: "Precio",
        cell: (info) => <Moneda valor={info.getValue()} />,
        meta: { align: "right" },
      }),
      columnHelper.accessor("desactualizado", {
        header: "",
        cell: (info) => <BadgeDesactualizado desactualizado={info.getValue()} />,
      }),
      // Sin columna "Fuente": InsumoResponse no trae `fuente`; es de
      // InsumoBusquedaResponse, el DTO del selector. Pintaba siempre "Local".
      columnHelper.display({
        id: "acciones",
        header: "",
        cell: (info) => {
          const insumo = info.row.original;
          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon-sm">
                  <MoreHorizontalIcon />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={() => {
                    setInsumoEditar(insumo);
                    setDialogoAbierto(true);
                  }}
                >
                  <EditIcon /> Editar
                </DropdownMenuItem>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span>
                      <DropdownMenuItem
                        disabled
                        onClick={() =>
                          setUsoDialogo({
                            abierto: true,
                            insumoId: insumo.id,
                          })
                        }
                      >
                        <EyeIcon /> Ver uso
                      </DropdownMenuItem>
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>{MOTIVO_SIN_BACKEND}</TooltipContent>
                </Tooltip>
                <ConfirmarDestructivo
                  titulo="Eliminar insumo"
                  descripcion={`¿Eliminar "${insumo.codigo}"?`}
                  textoConfirmar="Eliminar"
                  onConfirmar={async () => {
                    try {
                      await eliminar.mutateAsync(insumo.id);
                    } catch (err) {
                      if (err instanceof ApiError && err.is("insumo-en-uso")) {
                        setUsoDialogo({
                          abierto: true,
                          insumoId: insumo.id,
                          usosPrecargados: (err.problem as InsumoEnUsoProblem).usos,
                        });
                      }
                    }
                  }}
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
          );
        },
      }),
    ],
    [eliminar],
  );

  const table = useReactTable({
    data: data?.contenido ?? [],
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const handleNuevo = () => {
    setInsumoEditar(undefined);
    setDialogoAbierto(true);
  };

  const handleCloseDialogo = () => {
    setDialogoAbierto(false);
    setInsumoEditar(undefined);
  };

  return (
    <div className="space-y-4">
      <Tabs
        value={tipo}
        onValueChange={(v) => {
          setTipo(v);
          setPage(0);
        }}
      >
        <div className="flex items-center justify-between">
          <TabsList>
            {TIPO_TABS.map((t) => (
              <TabsTrigger key={t.value} value={t.value}>
                {t.label}
              </TabsTrigger>
            ))}
          </TabsList>

          <div className="flex items-center gap-2">
            <Button size="sm" onClick={handleNuevo}>
              <PlusIcon /> Nuevo
            </Button>
            <Button size="sm" variant="outline" onClick={() => setImportAbierto(true)}>
              <FileUpIcon /> Importar CSV
            </Button>
            <Button size="sm" variant="outline" onClick={() => setCopiarAbierto(true)}>
              <CopyIcon /> Copiar base
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative flex-1">
            <SearchIcon className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar insumos…"
              className="pl-8"
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setPage(0);
              }}
            />
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id="solo-desact"
              checked={soloDesactualizados}
              onCheckedChange={(v) => {
                setSoloDesactualizados(!!v);
                setPage(0);
              }}
            />
            <Label htmlFor="solo-desact" className="text-sm whitespace-nowrap">
              Solo desactualizados
            </Label>
          </div>
        </div>

        <TabsContent value={tipo} className="mt-0">
          {isPending ? (
            <CargandoTabla />
          ) : !data?.contenido.length ? (
            <EstadoVacio
              titulo="No hay insumos"
              descripcion={
                q
                  ? "No se encontraron insumos con esos filtros."
                  : "Agrega tu primer insumo para empezar."
              }
              accion={
                !q ? (
                  <Button onClick={handleNuevo}>
                    <PlusIcon /> Nuevo insumo
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <TarjetaTabla
              pie={
                data.totalPaginas > 1 ? (
                  <span>
                    Página {data.page + 1} de {data.totalPaginas} ({data.totalElementos} total)
                  </span>
                ) : undefined
              }
            >
              <Table>
                <TableHeader>
                  {table.getHeaderGroups().map((hg) => (
                    <TableRow key={hg.id}>
                      {hg.headers.map((h) => (
                        <TableHead
                          key={h.id}
                          scope="col"
                          className={h.column.columnDef.meta?.align === "right" ? "text-right" : ""}
                        >
                          {h.isPlaceholder
                            ? null
                            : flexRender(h.column.columnDef.header, h.getContext())}
                        </TableHead>
                      ))}
                    </TableRow>
                  ))}
                </TableHeader>
                <TableBody>
                  {table.getRowModel().rows.map((row) => (
                    <TableRow key={row.id}>
                      {row.getVisibleCells().map((cell) => (
                        <TableCell
                          key={cell.id}
                          className={
                            cell.column.columnDef.meta?.align === "right"
                              ? "text-right tabular-nums"
                              : ""
                          }
                        >
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {data.totalPaginas > 1 && (
                <div className="flex items-center justify-end gap-2 border-t px-4 py-2.5">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page === 0}
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                  >
                    Anterior
                  </Button>
                  <Select value={String(page)} onValueChange={(v) => setPage(Number(v))}>
                    <SelectTrigger className="w-20">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: data.totalPaginas }, (_, i) => (
                        <SelectItem key={i} value={String(i)}>
                          {i + 1}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= data.totalPaginas - 1}
                    onClick={() => setPage((p) => Math.min(data.totalPaginas - 1, p + 1))}
                  >
                    Siguiente
                  </Button>
                </div>
              )}
            </TarjetaTabla>
          )}
        </TabsContent>
      </Tabs>

      <DialogoInsumo
        abierto={dialogoAbierto}
        onClose={handleCloseDialogo}
        proyectoId={proyectoId}
        insumo={insumoEditar}
      />

      <DialogoUsoInsumo
        abierto={usoDialogo.abierto}
        onClose={() => setUsoDialogo({ abierto: false, insumoId: "" })}
        proyectoId={proyectoId}
        insumoId={usoDialogo.insumoId}
        usosPrecargados={usoDialogo.usosPrecargados}
      />

      <AsistenteImportCsv
        abierto={importAbierto}
        onClose={() => setImportAbierto(false)}
        proyectoId={proyectoId}
      />

      <DialogoCopiarBase
        abierto={copiarAbierto}
        onClose={() => setCopiarAbierto(false)}
        proyectoId={proyectoId}
      />
    </div>
  );
}
