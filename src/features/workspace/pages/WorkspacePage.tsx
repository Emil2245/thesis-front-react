import { useSearchParams } from "react-router-dom";
import { EncabezadoPagina, PuntoMeta } from "@/components/comunes/EncabezadoPagina";
import { EstadoVacio } from "@/components/comunes/EstadoVacio";
import { TarjetaTabla } from "@/components/comunes/TarjetaTabla";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { usePresupuesto } from "@/features/presupuesto/hooks/usePresupuesto";
import { useProyecto } from "@/features/proyectos/hooks/useProyectos";
import { useProyectoActivoId, useVersionActiva } from "@/shell/contexto";
import { PestanaApu } from "../components/PestanaApu";
import { PestanaEspecificacionTecnica } from "../components/PestanaEspecificacionTecnica";
import { PestanaInsumos } from "../components/PestanaInsumos";
import { PresupuestoCompacto } from "../components/PresupuestoCompacto";
import { WorkspaceSplit } from "../components/WorkspaceSplit";

export function WorkspacePage() {
  const proyectoId = useProyectoActivoId();
  const { data: proyecto, isPending: proyectoPendiente } = useProyecto(proyectoId);
  const { activa, isPending: versionPendiente } = useVersionActiva();
  const presupuestoQuery = usePresupuesto(activa?.presupuestoId ?? "");
  const [params] = useSearchParams();
  const rubroId = params.get("rubro");
  const selectedApuId = presupuestoQuery.data
    ? (function findApu(capitulos: typeof presupuestoQuery.data.capitulos): string | null {
        for (const capitulo of capitulos) {
          const rubro = capitulo.rubros.find((item) => item.id === rubroId);
          if (rubro) return rubro.apuId;
          const nested = findApu(capitulo.subcapitulos);
          if (nested) return nested;
        }
        return null;
      })(presupuestoQuery.data.capitulos)
    : null;

  if (proyectoPendiente || versionPendiente || (activa && presupuestoQuery.isPending))
    return <output className="block">Cargando proyecto, versión y presupuesto…</output>;
  if (!proyecto) {
    return (
      <EstadoVacio
        titulo="Proyecto no encontrado"
        descripcion="No se encontró el proyecto solicitado."
      />
    );
  }

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-5 overflow-x-hidden">
      <EncabezadoPagina
        titulo={proyecto.nombreProyecto}
        descripcion="Workspace del proyecto"
        meta={
          activa ? (
            <>
              <span>
                Versión {activa.version}
                {activa.esVigente ? " · vigente" : ""}
              </span>
              <PuntoMeta />
              <span>Presupuesto {activa.presupuestoId}</span>
            </>
          ) : (
            <span>Sin versión de presupuesto seleccionada</span>
          )
        }
      />
      <WorkspaceSplit
        left={
          <TarjetaTabla titulo="Presupuesto">
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
              <PresupuestoCompacto presupuesto={presupuestoQuery.data} />
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
    </div>
  );
}
