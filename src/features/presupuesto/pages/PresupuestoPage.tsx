import { useState, useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { usePresupuesto, useResumen, useValidacion } from "../hooks/usePresupuesto";
import { useCapituloMutaciones } from "../hooks/useCapituloMutaciones";
import { useRubroMutaciones } from "../hooks/useRubroMutaciones";
import { ArbolPresupuesto } from "../components/ArbolPresupuesto";
import { DialogoCapitulo } from "../components/DialogoCapitulo";
import { DialogoAgregarItem } from "../components/DialogoAgregarItem";
import { DialogoMoverCapitulo } from "../components/DialogoMoverCapitulo";
import { ResumenComponentes } from "../components/ResumenComponentes";
import { BannerIntegridad } from "../components/BannerIntegridad";
import type { CapituloResponse } from "@/api/contract";

export function PresupuestoPage() {
  const [searchParams] = useSearchParams();
  const versionId = Number(searchParams.get("v")) || 0;

  const { data: presupuesto, isLoading } = usePresupuesto(versionId);
  const { data: resumen, isLoading: resumenLoading } = useResumen(versionId);
  const { data: validacion, isLoading: validacionLoading } = useValidacion(versionId);

  const { crear, editar, mover, eliminar } = useCapituloMutaciones(versionId);
  const { agregar, actualizarCantidad, eliminar: eliminarRubro } = useRubroMutaciones(versionId);

  const [dialogo, setDialogo] = useState<{
    type: "crear" | "editar" | "mover" | "agregar";
    padreId?: number;
    capitulo?: CapituloResponse;
  } | null>(null);

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

  const handleEliminarCapitulo = useCallback(
    (capitulo: CapituloResponse) => {
      if (window.confirm(`¿Eliminar capítulo "${capitulo.descripcion}" y su contenido?`)) {
        eliminar.mutate(capitulo.id);
      }
    },
    [eliminar],
  );

  const handleMoverCapitulo = useCallback((capitulo: CapituloResponse) => {
    setDialogo({ type: "mover", capitulo });
  }, []);

  const handleConfirmarMover = useCallback(
    (nuevoPadreId: number | null, orden: number) => {
      if (dialogo?.type === "mover" && dialogo.capitulo) {
        mover.mutate({ capituloId: dialogo.capitulo.id, body: { nuevoPadreId, orden } });
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
      const payload: { descripcion: string; padreId?: number } = { descripcion };
      if (dialogo?.type === "crear" && dialogo.padreId) {
        payload.padreId = dialogo.padreId;
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

  const handleEliminarRubro = useCallback(
    (capituloId: number, rubroId: number) => {
      if (window.confirm("¿Eliminar este rubro del presupuesto?")) {
        eliminarRubro.mutate({ capituloId, rubroId });
      }
    },
    [eliminarRubro],
  );

  const optionsText = useMemo(() => {
    if (!presupuesto) return "";
    return `v${presupuesto.version} — ${presupuesto.capitulos.length} capítulos`;
  }, [presupuesto]);

  if (isLoading) {
    return (
      <div className="space-y-4 p-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (!presupuesto || !versionId) {
    return (
      <div className="p-6">
        <h1 className="text-xl font-semibold mb-4">Presupuesto</h1>
        <div className="text-center py-12 text-muted-foreground">
          {!versionId
            ? "Seleccione una versión del presupuesto para visualizar"
            : "Presupuesto no encontrado"}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Presupuesto</h1>
          <p className="text-sm text-muted-foreground">{optionsText}</p>
        </div>
        <Button onClick={() => setDialogo({ type: "crear" })}>Nuevo capítulo</Button>
      </div>

      <BannerIntegridad data={validacion} isLoading={validacionLoading} />

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

      <ResumenComponentes data={resumen} isLoading={resumenLoading} />

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
                subcapitulos: [],
                rubros: [],
                total: "0" as never,
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
    </div>
  );
}
