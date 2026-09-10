import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { SearchIcon, PlusIcon } from "lucide-react";
import { EncabezadoPagina } from "@/components/comunes/EncabezadoPagina";
import { EstadoVacio } from "@/components/comunes/EstadoVacio";
import { TarjetaTabla } from "@/components/comunes/TarjetaTabla";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { CapituloResponse } from "@/api/contract";
import { usePresupuesto } from "@/features/presupuesto/hooks/usePresupuesto";
import { useProyecto } from "@/features/proyectos/hooks/useProyectos";
import { useProyectoActivoId, useVersionActiva } from "@/shell/contexto";
import { PestanaApu } from "../components/PestanaApu";
import { PestanaEspecificacionTecnica } from "../components/PestanaEspecificacionTecnica";
import { PestanaInsumos } from "../components/PestanaInsumos";
import { PresupuestoCompacto } from "../components/PresupuestoCompacto";
import { DialogoAgregarApu } from "../components/DialogoAgregarApu";
import { WorkspaceSplit } from "../components/WorkspaceSplit";

type RubroContext = { apuId: string; capituloId: string };

function encontrarRubroContext(
  capitulos: CapituloResponse[],
  rubroId: string | null,
): RubroContext | null {
  if (!rubroId) return null;

  for (const capitulo of capitulos) {
    const rubro = capitulo.rubros.find((item) => item.id === rubroId);
    if (rubro) return { apuId: rubro.apuId, capituloId: capitulo.id };
    const nested = encontrarRubroContext(capitulo.subcapitulos, rubroId);
    if (nested) return nested;
  }
  return null;
}

export function WorkspacePage() {
  const proyectoId = useProyectoActivoId();
  const { data: proyecto, isPending: proyectoPendiente } = useProyecto(proyectoId);
  const { activa, isPending: versionPendiente } = useVersionActiva();
  const presupuestoQuery = usePresupuesto(activa?.presupuestoId ?? "");
  const [params] = useSearchParams();
  const rubroId = params.get("rubro");
  const rubroContext = presupuestoQuery.data
    ? encontrarRubroContext(presupuestoQuery.data.capitulos, rubroId)
    : null;
  const selectedApuId = rubroContext?.apuId ?? null;
  const [busqueda, setBusqueda] = useState("");
  const [agregarApuAbierto, setAgregarApuAbierto] = useState(false);

  if (proyectoPendiente || versionPendiente || (activa && presupuestoQuery.isPending))
    return <output className="block">Cargando proyecto, versión y presupuesto…</output>;
  if (!proyecto)
    return (
      <EstadoVacio
        titulo="Proyecto no encontrado"
        descripcion="No se encontró el proyecto solicitado."
      />
    );

  const tienePresupuesto = Boolean(activa && presupuestoQuery.data);

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-5 overflow-x-hidden">
      <EncabezadoPagina
        titulo={
          <span className="inline-flex min-w-0 flex-wrap items-baseline gap-x-3 gap-y-1">
            <span>{proyecto.nombreProyecto}</span>
            {activa ? (
              <span className="font-mono text-sm font-normal text-muted-foreground">
                Presupuesto {activa.presupuestoId}
              </span>
            ) : null}
          </span>
        }
      />
      <WorkspaceSplit
        left={
          <TarjetaTabla
            titulo="Presupuesto"
            accion={
              <div className="flex min-w-0 items-center gap-2">
                <div className="relative min-w-0">
                  <SearchIcon className="pointer-events-none absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    type="search"
                    aria-label="Buscar en presupuesto"
                    placeholder="Buscar…"
                    value={busqueda}
                    onChange={(event) => setBusqueda(event.target.value)}
                    disabled={!tienePresupuesto}
                    className="h-8 w-24 pl-7 md:w-28 lg:w-40"
                  />
                </div>
                <Button
                  type="button"
                  size="sm"
                  aria-label="Agregar APU"
                  title="Agregar APU"
                  onClick={() => setAgregarApuAbierto(true)}
                  disabled={!tienePresupuesto}
                >
                  <PlusIcon data-icon="inline-start" />
                  <span className="hidden lg:inline">Agregar APU</span>
                </Button>
              </div>
            }
          >
            {!activa ? (
              <EstadoVacio
                titulo="Sin versión"
                descripcion="Selecciona una versión de presupuesto para continuar."
              />
            ) : presupuestoQuery.isError ? (
              <div className="p-4">
                <p role="alert">No se pudo cargar el presupuesto.</p>
                <button
                  type="button"
                  onClick={() => presupuestoQuery.refetch()}
                  className="mt-2 underline"
                >
                  Reintentar
                </button>
              </div>
            ) : presupuestoQuery.data ? (
              <PresupuestoCompacto
                key={presupuestoQuery.data.presupuestoId}
                presupuesto={presupuestoQuery.data}
                busqueda={busqueda}
              />
            ) : null}
          </TarjetaTabla>
        }
        right={
          <TarjetaTabla titulo="APU">
            <Tabs defaultValue="apu">
              <TabsList className="mx-4 mt-3" aria-label="Contenido del APU">
                <TabsTrigger value="apu">APU</TabsTrigger>
                <TabsTrigger value="insumos">Insumos</TabsTrigger>
                <TabsTrigger value="especificacion">Especificación técnica</TabsTrigger>
              </TabsList>
              <TabsContent value="apu">
                <PestanaApu
                  apuId={selectedApuId}
                  proyectoId={proyecto.id}
                  presupuestoId={activa?.presupuestoId ?? ""}
                />
              </TabsContent>
              <TabsContent value="insumos">
                <PestanaInsumos apuId={selectedApuId} presupuestoId={activa?.presupuestoId ?? ""} />
              </TabsContent>
              <TabsContent value="especificacion">
                <PestanaEspecificacionTecnica
                  apuId={selectedApuId}
                  presupuestoId={activa?.presupuestoId ?? ""}
                />
              </TabsContent>
            </Tabs>
          </TarjetaTabla>
        }
      />
      {activa && presupuestoQuery.data && agregarApuAbierto ? (
        <DialogoAgregarApu
          open
          onOpenChange={setAgregarApuAbierto}
          presupuestoId={activa.presupuestoId}
          proyectoId={proyecto.id}
          capitulos={presupuestoQuery.data.capitulos}
          defaultCapituloId={rubroContext?.capituloId}
        />
      ) : null}
    </div>
  );
}
