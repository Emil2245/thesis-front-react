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
import { DialogoConfirmarReduccion } from "../components/DialogoConfirmarReduccion";
import { DialogoEditarActividad } from "../components/DialogoEditarActividad";
import { EncabezadoPagina } from "@/components/comunes/EncabezadoPagina";
import type { ActividadResponse, CronogramaConfigurarRequest, UnidadTiempo } from "@/api/contract";

export function CronogramaPage() {
  // La versión la manda el selector de la barra superior, que ya cae en la
  // vigente cuando la URL no trae `?v=`.
  const { presupuestoId } = useVersionActiva();
  const versionId = presupuestoId ?? 0;

  const { data: cronograma, isLoading } = useCronograma(versionId);
  const crearCrono = useCrearCronograma(versionId);

  const [configDialog, setConfigDialog] = useState(false);
  const [actividadEdit, setActividadEdit] = useState<ActividadResponse | null>(null);
  const [reduccionData, setReduccionData] = useState<{
    body: CronogramaConfigurarRequest;
    periodos: string[];
  } | null>(null);
  const [lastConfigBody, setLastConfigBody] = useState<CronogramaConfigurarRequest | null>(null);

  const configCrono = useConfigurarCronograma(cronograma?.id ?? 0, versionId, (periodos) => {
    if (lastConfigBody) {
      setReduccionData({ body: lastConfigBody, periodos });
    }
  });
  const { mutate: actualizarAvance } = useActualizarAvance(cronograma?.id ?? 0, versionId);
  const { mutate: revisar } = useRevisarCronograma(cronograma?.id ?? 0, versionId);

  const handleConfigurar = useCallback(
    (unidadTiempo: UnidadTiempo, numeroPeriodos: number) => {
      const body = { unidadTiempo, numeroPeriodos };
      if (cronograma) {
        setLastConfigBody(body);
        configCrono.mutate(body);
      } else {
        crearCrono.mutate(body);
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
      <>
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-96" />
      </>
    );
  }

  return (
    <>
      <EncabezadoPagina
        titulo="Cronograma"
        descripcion={
          cronograma
            ? `${cronograma.numeroPeriodos} períodos (${cronograma.unidadTiempo.toLowerCase()})`
            : "No configurado"
        }
        insignia={<BadgeDesactualizado desactualizado={cronograma?.desactualizado ?? false} />}
        acciones={
          <>
            {cronograma && (
              <Button variant="outline" onClick={() => revisar()}>
                Revisar
              </Button>
            )}
            <Button onClick={() => setConfigDialog(true)}>
              {cronograma ? "Reconfigurar" : "Crear cronograma"}
            </Button>
          </>
        }
      />

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
            onClickActividad={setActividadEdit}
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

      <DialogoConfirmarReduccion
        open={!!reduccionData}
        onOpenChange={(open) => {
          if (!open) setReduccionData(null);
        }}
        onConfirm={() => {
          if (reduccionData) {
            configCrono.mutate({ ...reduccionData.body, confirmarPerdida: true });
            setReduccionData(null);
          }
        }}
        periodosAfectados={reduccionData?.periodos ?? []}
      />
    </>
  );
}
