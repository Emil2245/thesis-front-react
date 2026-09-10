import { EncabezadoPagina, PuntoMeta } from "@/components/comunes/EncabezadoPagina";
import { EstadoVacio } from "@/components/comunes/EstadoVacio";
import { TarjetaTabla } from "@/components/comunes/TarjetaTabla";
import { useProyecto } from "@/features/proyectos/hooks/useProyectos";
import { useProyectoActivoId, useVersionActiva } from "@/shell/contexto";
import { WorkspaceSplit } from "../components/WorkspaceSplit";

export function WorkspacePage() {
  const proyectoId = useProyectoActivoId();
  const { data: proyecto, isPending: proyectoPendiente } = useProyecto(proyectoId);
  const { activa, isPending: versionPendiente } = useVersionActiva();

  if (proyectoPendiente || versionPendiente)
    return <p role="status">Cargando proyecto y versión…</p>;
  if (!proyecto) {
    return (
      <EstadoVacio
        titulo="Proyecto no encontrado"
        descripcion="No se encontró el proyecto solicitado."
      />
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-5">
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
            <EstadoVacio
              titulo="Presupuesto"
              descripcion="El árbol del presupuesto se incorporará en un plan posterior."
            />
          </TarjetaTabla>
        }
        right={
          <TarjetaTabla titulo="Detalle del proyecto">
            <EstadoVacio
              titulo="Selecciona un elemento"
              descripcion="El detalle y las pestañas de APU se incorporarán en planes posteriores."
            />
          </TarjetaTabla>
        }
      />
    </div>
  );
}
