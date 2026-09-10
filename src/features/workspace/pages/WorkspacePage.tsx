import { useSearchParams } from "react-router-dom";
import { EncabezadoPagina, PuntoMeta } from "@/components/comunes/EncabezadoPagina";
import { EstadoVacio } from "@/components/comunes/EstadoVacio";
import { TarjetaTabla } from "@/components/comunes/TarjetaTabla";
import { usePresupuesto } from "@/features/presupuesto/hooks/usePresupuesto";
import { useProyecto } from "@/features/proyectos/hooks/useProyectos";
import { useProyectoActivoId, useVersionActiva } from "@/shell/contexto";
import { PresupuestoCompacto } from "../components/PresupuestoCompacto";
import { WorkspaceSplit } from "../components/WorkspaceSplit";

export function WorkspacePage() {
  const proyectoId = useProyectoActivoId();
  const { data: proyecto, isPending: proyectoPendiente } = useProyecto(proyectoId);
  const { activa, isPending: versionPendiente } = useVersionActiva();
  const presupuestoQuery = usePresupuesto(activa?.presupuestoId ?? "");
  const [params] = useSearchParams();
  const rubroId = params.get("rubro");

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
          <TarjetaTabla titulo="Detalle del proyecto">
            <EstadoVacio
              titulo={rubroId ? "Rubro seleccionado" : "Selecciona un elemento"}
              descripcion={
                rubroId
                  ? "El detalle del rubro estará disponible en un plan posterior."
                  : "Selecciona un rubro del presupuesto para consultar su detalle."
              }
            />
          </TarjetaTabla>
        }
      />
    </div>
  );
}
