import { useState, useCallback, useMemo } from "react";
import { useVersionActiva } from "@/shell/contexto";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EncabezadoPagina } from "@/components/comunes/EncabezadoPagina";
import { EstadoVacio } from "@/components/comunes/EstadoVacio";
import { PlusIcon } from "lucide-react";
import { usePresupuesto, useResumen, useValidacion } from "../hooks/usePresupuesto";
import { useCapituloMutaciones } from "../hooks/useCapituloMutaciones";
import { useRubroMutaciones } from "../hooks/useRubroMutaciones";
import { ArbolPresupuesto } from "../components/ArbolPresupuesto";
import { DialogoCapitulo } from "../components/DialogoCapitulo";
import { DialogoAgregarItem } from "../components/DialogoAgregarItem";
import { DialogoMoverCapitulo } from "../components/DialogoMoverCapitulo";
import { ResumenComponentes } from "../components/ResumenComponentes";
import { BannerIntegridad } from "../components/BannerIntegridad";
import { ConfirmarDestructivo } from "@/components/comunes/ConfirmarDestructivo";
import type { CapituloResponse } from "@/api/contract";
import { DECIMAL_ZERO } from "@/lib/decimal";

export function PresupuestoPage() {
  // La versión la manda el selector de la barra superior, que ya cae en la
  // vigente cuando la URL no trae `?v=`; leer el parámetro en crudo dejaba la
  // pantalla vacía en la primera carga.
  const { presupuestoId } = useVersionActiva();
  const versionId = presupuestoId ?? 0;

  const { data: presupuesto, isLoading } = usePresupuesto(versionId);
  const { data: resumen, isLoading: resumenLoading } = useResumen(versionId);
  const { data: validacion, isLoading: validacionLoading } = useValidacion(versionId);

  const { crear, editar, mover, eliminar } = useCapituloMutaciones(versionId);
  const { agregar, actualizarCantidad, eliminar: eliminarRubro } = useRubroMutaciones(versionId);

  const [dialogo, setDialogo] = useState<
    | {
        type: "crear" | "editar" | "mover" | "agregar";
        padreId?: number;
        capitulo?: CapituloResponse;
      }
    | { type: "eliminar-capitulo"; capitulo: CapituloResponse }
    | { type: "eliminar-rubro"; capituloId: number; rubroId: number }
    | null
  >(null);

  const handleEditarCapitulo = useCallback((capitulo: CapituloResponse) => {
    setDialogo({ type: "editar", capitulo });
  }, []);

  const handleGuardarEdicion = useCallback(
    (descripcion: string) => {
      if (dialogo?.type === "editar" && dialogo.capitulo) {
        editar.mutate({ capituloId: dialogo.capitulo.id, descripcion });
      }
      setDialogo(null);
    },
    [editar, dialogo],
  );

  const handleEliminarCapitulo = useCallback((capitulo: CapituloResponse) => {
    setDialogo({ type: "eliminar-capitulo", capitulo });
  }, []);

  const handleMoverCapitulo = useCallback((capitulo: CapituloResponse) => {
    setDialogo({ type: "mover", capitulo });
  }, []);

  const handleConfirmarMover = useCallback(
    (parentId: number | null, orden: number) => {
      if (dialogo?.type === "mover" && dialogo.capitulo) {
        mover.mutate({ capituloId: dialogo.capitulo.id, body: { parentId, orden } });
      }
      setDialogo(null);
    },
    [mover, dialogo],
  );

  const handleAgregarRubro = useCallback((capituloId: number) => {
    setDialogo({ type: "agregar", padreId: capituloId });
  }, []);

  const handleConfirmarAgregarRubro = useCallback(
    (apuId: number, cantidad: string) => {
      if (dialogo?.type === "agregar" && dialogo.padreId) {
        agregar.mutate({ capituloId: dialogo.padreId, apuId, cantidad });
      }
      setDialogo(null);
    },
    [agregar, dialogo],
  );

  const handleConfirmarAgregarSub = useCallback(
    (descripcion: string) => {
      const payload: { descripcion: string; parentId?: number } = { descripcion };
      if (dialogo?.type === "crear" && dialogo.padreId) {
        payload.parentId = dialogo.padreId;
      }
      crear.mutate(payload);
      setDialogo(null);
    },
    [crear, dialogo],
  );

  const handleCantidadChange = useCallback(
    (capituloId: number, rubroId: number, cantidad: string) => {
      actualizarCantidad.mutate({ capituloId, rubroId, cantidad });
    },
    [actualizarCantidad],
  );

  const handleEliminarRubro = useCallback((capituloId: number, rubroId: number) => {
    setDialogo({ type: "eliminar-rubro", capituloId, rubroId });
  }, []);

  const optionsText = useMemo(() => {
    if (!presupuesto) return "";
    return `v${presupuesto.version} — ${presupuesto.capitulos.length} capítulos`;
  }, [presupuesto]);

  if (isLoading) {
    return (
      <div className="flex flex-col gap-5">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!presupuesto || !versionId) {
    return (
      <>
        <EncabezadoPagina titulo="Presupuesto" />
        <EstadoVacio
          titulo={!versionId ? "Sin versión seleccionada" : "Presupuesto no encontrado"}
          descripcion={
            !versionId
              ? "Elige una versión en la barra superior para ver su presupuesto."
              : "La versión solicitada ya no existe."
          }
        />
      </>
    );
  }

  return (
    <>
      <EncabezadoPagina
        titulo="Presupuesto"
        descripcion={optionsText}
        acciones={
          <Button onClick={() => setDialogo({ type: "crear" })}>
            <PlusIcon data-icon="inline-start" /> Nuevo capítulo
          </Button>
        }
      />

      <BannerIntegridad data={validacion} isLoading={validacionLoading} />

      {/* El total encabeza la pantalla: es lo que se consulta, no el detalle. */}
      <ResumenComponentes data={resumen} isLoading={resumenLoading} />

      <ArbolPresupuesto
        presupuesto={presupuesto}
        onAgregarSub={(padreId) => setDialogo({ type: "crear", padreId })}
        onEditarCapitulo={handleEditarCapitulo}
        onEliminarCapitulo={handleEliminarCapitulo}
        onMoverCapitulo={handleMoverCapitulo}
        onAgregarRubro={handleAgregarRubro}
        onEliminarRubro={handleEliminarRubro}
        onCantidadChange={handleCantidadChange}
      />

      <DialogoCapitulo
        open={dialogo?.type === "crear"}
        onOpenChange={() => setDialogo(null)}
        onConfirm={handleConfirmarAgregarSub}
        titulo="Nuevo capítulo"
      />

      <DialogoCapitulo
        open={dialogo?.type === "editar"}
        onOpenChange={() => setDialogo(null)}
        onConfirm={handleGuardarEdicion}
        titulo="Editar capítulo"
        valorInicial={dialogo?.type === "editar" ? dialogo.capitulo?.descripcion : ""}
      />

      <DialogoMoverCapitulo
        open={dialogo?.type === "mover"}
        onOpenChange={() => setDialogo(null)}
        onConfirm={handleConfirmarMover}
        capitulo={
          dialogo?.type === "mover"
            ? dialogo.capitulo!
            : {
                id: 0,
                item: "",
                descripcion: "",
                orden: 0,
                subcapitulos: [],
                rubros: [],
                total: DECIMAL_ZERO,
              }
        }
        capitulos={presupuesto.capitulos}
      />

      <DialogoAgregarItem
        open={dialogo?.type === "agregar"}
        onOpenChange={() => setDialogo(null)}
        onConfirm={handleConfirmarAgregarRubro}
        presupuestoId={versionId}
      />

      <ConfirmarDestructivo
        abierto={dialogo?.type === "eliminar-capitulo"}
        onAbiertoChange={(v) => {
          if (!v) setDialogo(null);
        }}
        titulo="Eliminar capítulo"
        descripcion={
          dialogo?.type === "eliminar-capitulo"
            ? `¿Eliminar el capítulo "${dialogo.capitulo.descripcion}" y todo su contenido? Esta acción no se puede deshacer.`
            : ""
        }
        onConfirmar={() => {
          if (dialogo?.type === "eliminar-capitulo") eliminar.mutate(dialogo.capitulo.id);
          setDialogo(null);
        }}
      />

      <ConfirmarDestructivo
        abierto={dialogo?.type === "eliminar-rubro"}
        onAbiertoChange={(v) => {
          if (!v) setDialogo(null);
        }}
        titulo="Eliminar rubro"
        descripcion="¿Eliminar este rubro del presupuesto? Esta acción no se puede deshacer."
        onConfirmar={() => {
          if (dialogo?.type === "eliminar-rubro")
            eliminarRubro.mutate({ capituloId: dialogo.capituloId, rubroId: dialogo.rubroId });
          setDialogo(null);
        }}
      />
    </>
  );
}
