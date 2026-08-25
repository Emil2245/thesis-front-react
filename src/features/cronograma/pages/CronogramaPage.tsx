import { useState, useCallback } from "react";
import { useVersionActiva } from "@/shell/contexto";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useCronograma,
  useCrearCronograma,
  useConfigurarCronograma,
  useActualizarAvance,
  useRevisarCronograma,
} from "../hooks/useCronograma";
import { TablaActividades } from "../components/TablaActividades";
import { GanttChart } from "../components/GanttChart";
import { BadgeDesactualizado } from "../components/BadgeDesactualizado";
import { DialogoConfigurarCronograma } from "../components/DialogoConfigurarCronograma";
import { DialogoEditarActividad } from "../components/DialogoEditarActividad";
import { EncabezadoPagina } from "@/components/comunes/EncabezadoPagina";
import { ModuloNoDisponible } from "@/components/comunes/ModuloNoDisponible";
import type { ActividadResponse, UnidadTiempo } from "@/api/contract";

// El backend no expone /presupuestos/{id}/cronograma todavía (plan 027).
// Para reactivar: borra este bloque, quita "cronograma" de MODULOS_SIN_BACKEND
// y exporta CronogramaPageActiva como CronogramaPage.
export function CronogramaPage() {
  return (
    <>
      <EncabezadoPagina titulo="Cronograma" />
      <ModuloNoDisponible
        modulo="El cronograma"
        descripcion="El servidor todavía no expone el cronograma de un presupuesto. La pantalla está construida y se activará cuando el endpoint exista."
      />
    </>
  );
}

export function CronogramaPageActiva() {
  // La versión la manda el selector de la barra superior, que ya cae en la
  // vigente cuando la URL no trae `?v=`.
  const { presupuestoId } = useVersionActiva();
  const versionId = presupuestoId ?? 0;

  const { data: cronograma, isLoading } = useCronograma(versionId);
  const crearCrono = useCrearCronograma(versionId);
  const configCrono = useConfigurarCronograma(versionId);
  const { mutate: actualizarAvance } = useActualizarAvance(cronograma?.id ?? 0, versionId);
  const { mutate: revisar } = useRevisarCronograma(cronograma?.id ?? 0, versionId);

  const [configDialog, setConfigDialog] = useState(false);
  const [actividadEdit, setActividadEdit] = useState<ActividadResponse | null>(null);

  const handleConfigurar = useCallback(
    (unidadTiempo: UnidadTiempo, numeroPeriodos: number) => {
      if (cronograma) {
        configCrono.mutate({ unidadTiempo, numeroPeriodos, confirmarPerdida: true });
      } else {
        crearCrono.mutate({ unidadTiempo, numeroPeriodos });
      }
      setConfigDialog(false);
    },
    [cronograma, configCrono, crearCrono],
  );

  const handleGuardarAvance = useCallback(
    (body: { avancePorPeriodo: Record<string, string> }) => {
      if (actividadEdit) {
        actualizarAvance({
          actividadId: actividadEdit.id,
          body: body as import("@/api/contract").ActividadAvanceRequest,
        });
        setActividadEdit(null);
      }
    },
    [actividadEdit, actualizarAvance],
  );

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Cronograma</h1>
          <p className="text-sm text-muted-foreground">
            {cronograma
              ? `${cronograma.numeroPeriodos} períodos (${cronograma.unidadTiempo.toLowerCase()})`
              : "No configurado"}
          </p>
        </div>
        <div className="flex gap-2">
          <BadgeDesactualizado desactualizado={cronograma?.desactualizado ?? false} />
          {cronograma && (
            <Button variant="outline" onClick={() => revisar()}>
              Revisar
            </Button>
          )}
          <Button onClick={() => setConfigDialog(true)}>
            {cronograma ? "Reconfigurar" : "Crear cronograma"}
          </Button>
        </div>
      </div>

      {!cronograma && (
        <div className="text-center py-16 text-muted-foreground">
          No hay cronograma para esta versión del presupuesto.
        </div>
      )}

      {cronograma && (
        <>
          <TablaActividades
            actividades={cronograma.actividades}
            periodos={cronograma.numeroPeriodos}
          />
          <GanttChart cronograma={cronograma} />
        </>
      )}

      <DialogoConfigurarCronograma
        open={configDialog}
        onOpenChange={setConfigDialog}
        onConfirm={handleConfigurar}
        unidadActual={cronograma?.unidadTiempo}
        periodosActual={cronograma?.numeroPeriodos}
        modo={cronograma ? "reconfigurar" : "crear"}
      />

      <DialogoEditarActividad
        open={!!actividadEdit}
        onOpenChange={(open) => {
          if (!open) setActividadEdit(null);
        }}
        onConfirm={handleGuardarAvance}
        actividad={
          actividadEdit ?? {
            id: 0,
            rubroId: 0,
            item: "",
            descripcion: "",
            precioTotal: "0" as never,
            pesoPonderado: "0" as never,
            avancePorPeriodo: {},
            desviacion: "0" as never,
          }
        }
        numeroPeriodos={cronograma?.numeroPeriodos ?? 1}
      />
    </div>
  );
}
