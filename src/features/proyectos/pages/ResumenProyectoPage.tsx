import { useState } from "react";
import { useParams, Link, useNavigate, useSearchParams } from "react-router-dom";
import { useProyecto, useEliminarProyecto } from "../hooks/useProyectos";
import { useParametros } from "../hooks/useParametros";
import { TabFirmantes } from "../components/TabFirmantes";
import { ChipEstado } from "@/components/comunes/ChipEstado";
import { CargandoTabla } from "@/components/comunes/CargandoTabla";
import { ConfirmarDestructivo } from "@/components/comunes/ConfirmarDestructivo";
import { EncabezadoPagina, PuntoMeta } from "@/components/comunes/EncabezadoPagina";
import { TarjetaTabla } from "@/components/comunes/TarjetaTabla";
import { Moneda } from "@/components/comunes/Moneda";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
import { TriangleAlertIcon, PencilIcon, Trash2Icon, BookmarkIcon } from "lucide-react";
import { MoreHorizontalIcon } from "lucide-react";
import { DialogoEditarProyecto } from "../components/DialogoEditarProyecto";
import { DialogoGuardarComoPlantilla } from "../components/DialogoGuardarComoPlantilla";
import { useVersionActiva } from "@/shell/contexto";
import { usePresupuesto, useResumen } from "@/features/presupuesto/hooks/usePresupuesto";
import { formatearPorcentaje } from "@/lib/decimal";
import type { Decimal } from "@/lib/decimal";
import type { ResumenComponentesResponse } from "@/api/contract";

export function ResumenProyectoPage() {
  const { id } = useParams();
  const proyectoId = id ?? "";
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: proyecto, isPending } = useProyecto(proyectoId);
  const [guardarPlantillaAbierto, setGuardarPlantillaAbierto] = useState(false);
  const eliminar = useEliminarProyecto();
  const { presupuestoId, activa } = useVersionActiva();
  const { data: presupuesto } = usePresupuesto(presupuestoId ?? "");
  const { data: resumen } = useResumen(presupuestoId ?? "");
  const { data: parametros } = useParametros(id ?? null);

  if (isPending) return <CargandoTabla />;
  if (!proyecto) return <p className="text-muted-foreground">Proyecto no encontrado</p>;

  // `null` es «sin configurar»; un 0 explícito es una decisión válida del
  // usuario y no debe disparar el aviso.
  const ciSinConfigurar = parametros != null && parametros.porcentajeIndirecto == null;
  const capitulos = presupuesto?.capitulos ?? [];
  const totalGeneral = presupuesto?.totalGeneral ?? resumen?.totalGeneral ?? null;

  return (
    <>
      <EncabezadoPagina
        titulo={proyecto.nombreProyecto}
        insignia={<ChipEstado estado={proyecto.estado} />}
        meta={
          <>
            <span className="font-mono text-xs">{proyecto.codigo}</span>
            {proyecto.anio ? (
              <>
                <PuntoMeta />
                <span>Año {proyecto.anio}</span>
              </>
            ) : null}
            {activa ? (
              <>
                <PuntoMeta />
                <span>
                  Versión {activa.version}
                  {activa.esVigente ? " · vigente" : ""}
                </span>
              </>
            ) : null}
          </>
        }
        acciones={
          <>
            <Button
              variant="outline"
              onClick={() => navigate(`/proyectos/${proyectoId}?editar=true`)}
            >
              <PencilIcon data-icon="inline-start" /> Editar
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" aria-label="Más acciones">
                  <MoreHorizontalIcon />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuItem onClick={() => setGuardarPlantillaAbierto(true)}>
                  <BookmarkIcon /> Guardar como plantilla
                </DropdownMenuItem>
                <ConfirmarDestructivo
                  titulo="Eliminar proyecto"
                  descripcion={`¿Eliminar "${proyecto.nombreProyecto}"? Esta acción no se puede deshacer.`}
                  textoConfirmar="Eliminar"
                  onConfirmar={() => {
                    eliminar.mutate(proyectoId);
                    navigate("/proyectos");
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
          </>
        }
      />

      {ciSinConfigurar && (
        <Alert variant="destructive">
          <TriangleAlertIcon />
          <AlertTitle>Alertas</AlertTitle>
          <AlertDescription>
            <span>
              Porcentaje de indirectos no configurado.{" "}
              <Link to={`/proyectos/${proyectoId}/parametros`} className="underline">
                Configurar ahora
              </Link>
            </span>
          </AlertDescription>
        </Alert>
      )}

      <FranjaTotales total={totalGeneral} resumen={resumen} />

      <div className="flex flex-col gap-5 xl:flex-row xl:items-start">
        <div className="flex min-w-0 flex-1 flex-col gap-5">
          <TarjetaTabla
            titulo="Capítulos"
            accion={
              <Link
                to={`/proyectos/${proyectoId}/presupuesto`}
                className="text-sm text-primary hover:underline"
              >
                Ver presupuesto
              </Link>
            }
          >
            {capitulos.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-muted-foreground">
                Esta versión aún no tiene capítulos.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">Ítem</TableHead>
                    <TableHead>Descripción</TableHead>
                    <TableHead className="w-24 text-right">Rubros</TableHead>
                    <TableHead className="w-40 text-right">Subtotal</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {capitulos.map((c) => (
                    <TableRow key={c.id} className="h-10">
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {c.item}
                      </TableCell>
                      <TableCell>{c.descripcion}</TableCell>
                      <TableCell className="num text-muted-foreground">
                        {c.rubros.length + c.subcapitulos.length}
                      </TableCell>
                      <TableCell>
                        <Moneda valor={c.total} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </TarjetaTabla>

          <TabFirmantes proyectoId={proyectoId} />
        </div>

        <div className="flex w-full shrink-0 flex-col gap-5 xl:w-80">
          <TarjetaTabla titulo="Datos del proyecto">
            <dl className="flex flex-col gap-3 p-4">
              <Dato etiqueta="Dirección institucional" valor={proyecto.direccionInstitucional} />
              <Dato etiqueta="Subdirección" valor={proyecto.subdireccionInstitucional} />
              <Dato
                etiqueta="Fecha de inicio"
                valor={
                  proyecto.fechaInicio
                    ? new Date(proyecto.fechaInicio).toLocaleDateString("es-EC", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })
                    : undefined
                }
              />
              <Dato
                etiqueta="Plazo de ejecución"
                valor={
                  proyecto.plazoEjecucion
                    ? `${proyecto.plazoEjecucion} ${
                        proyecto.plazoUnidad === "SEMANA" ? "semanas" : "meses"
                      }`
                    : undefined
                }
              />
              <Dato etiqueta="Descripción" valor={proyecto.descripcion} multilinea />
            </dl>
          </TarjetaTabla>
        </div>
      </div>

      <DialogoGuardarComoPlantilla
        abierto={guardarPlantillaAbierto}
        onClose={() => setGuardarPlantillaAbierto(false)}
        proyectoId={proyectoId}
      />

      {/* Plan 067: el botón Editar ya navegaba a `?editar=true` y nadie leía el
          parámetro. `replace: true` al cerrar, o el botón "atrás" lo reabre. */}
      <DialogoEditarProyecto
        abierto={searchParams.get("editar") === "true"}
        onClose={() => setSearchParams({}, { replace: true })}
      />
    </>
  );
}

function Dato({
  etiqueta,
  valor,
  multilinea,
}: {
  etiqueta: string;
  valor?: string;
  multilinea?: boolean;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-xs text-muted-foreground">{etiqueta}</dt>
      <dd className={multilinea ? "text-sm leading-relaxed text-pretty" : "truncate text-sm"}>
        {valor || "—"}
      </dd>
    </div>
  );
}

const ETIQUETA_COMPONENTE: Record<string, string> = {
  EQUIPO: "Equipo",
  MANO_OBRA: "Mano de obra",
  MATERIAL: "Materiales",
  TRANSPORTE: "Transporte",
};

function FranjaTotales({
  total,
  resumen,
}: {
  total: Decimal | null;
  resumen?: ResumenComponentesResponse;
}) {
  // Sin desglose real preferimos decirlo a pintar cuatro casillas en blanco.
  const totalNum = Number(resumen?.totalGeneral ?? 0);
  const porComponente: Record<string, Decimal> = resumen?.porComponente ?? {};
  const componentes = Object.entries(porComponente).map(([clave, valor]) => ({
    etiqueta: ETIQUETA_COMPONENTE[clave] ?? clave,
    total: valor,
    porcentaje: totalNum > 0 ? Number(valor) / totalNum : 0,
  }));

  return (
    <div className="grid grid-cols-1 gap-px overflow-hidden rounded-xl bg-border ring-1 ring-foreground/10 sm:grid-cols-2 lg:grid-cols-5">
      <div className="flex flex-col gap-1 bg-muted/60 p-4">
        <span className="text-xs font-medium">Total general</span>
        <span className="num text-left text-xl font-semibold tracking-tight">
          <Moneda valor={total} className="text-left" />
        </span>
      </div>
      {componentes.length === 0 ? (
        <div className="flex items-center bg-card p-4 text-sm text-muted-foreground sm:col-span-1 lg:col-span-4">
          Selecciona una versión para ver el desglose por componente.
        </div>
      ) : (
        componentes.map((c) => (
          <div key={c.etiqueta} className="flex flex-col gap-1 bg-card p-4">
            <span className="text-xs text-muted-foreground">
              {c.etiqueta} · {formatearPorcentaje(c.porcentaje)}
            </span>
            <span className="text-lg font-medium tracking-tight">
              <Moneda valor={c.total} className="text-left" />
            </span>
          </div>
        ))
      )}
    </div>
  );
}
