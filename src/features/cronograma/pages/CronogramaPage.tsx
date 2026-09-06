import { useState, useCallback } from "react";
import { useVersionActiva } from "@/shell/contexto";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useCronograma,
  useCrearCronograma,
  useConfigurarCronograma,
  useProgramarActividad,
  useRevisarCronograma,
} from "../hooks/useCronograma";
import { TablaActividades } from "../components/TablaActividades";
import { GanttChart } from "../components/GanttChart";
import { BadgeDesactualizado } from "../components/BadgeDesactualizado";
import { DialogoConfigurarCronograma } from "../components/DialogoConfigurarCronograma";
import { DialogoConfirmarReduccion } from "../components/DialogoConfirmarReduccion";
import { DialogoEditarActividad } from "../components/DialogoEditarActividad";
import { EncabezadoPagina } from "@/components/comunes/EncabezadoPagina";
import { Badge } from "@/components/ui/badge";
import type {
  ActividadCronogramaResponse,
  ActividadProgramarRequest,
  CronogramaConfigurarRequest,
  PerdidaAvanceResponse,
  UnidadTiempo,
} from "@/api/contract";

export function CronogramaPage() {
  // La versión la manda el selector de la barra superior, que ya cae en la
  // vigente cuando la URL no trae `?v=`.
  const { presupuestoId } = useVersionActiva();
  const versionId = presupuestoId ?? "";

  // `data` es `null` —no `undefined`— cuando el backend responde 404: este
  // presupuesto todavía no tiene cronograma, que es un estado, no un fallo.
  const { data: cronograma, isLoading } = useCronograma(versionId);
  const crearCrono = useCrearCronograma(versionId);

  const [configDialog, setConfigDialog] = useState(false);
  const [actividadEdit, setActividadEdit] = useState<ActividadCronogramaResponse | null>(null);
  const [reduccion, setReduccion] = useState<{
    body: CronogramaConfigurarRequest;
    perdidas: PerdidaAvanceResponse[];
  } | null>(null);
  const [ultimaConfig, setUltimaConfig] = useState<CronogramaConfigurarRequest | null>(null);

  const cronogramaId = cronograma?.id ?? "";
  const configCrono = useConfigurarCronograma(cronogramaId, versionId, (perdidas) => {
    if (ultimaConfig) setReduccion({ body: ultimaConfig, perdidas });
  });
  const { mutate: programar } = useProgramarActividad(cronogramaId, versionId);
  const { mutate: revisar } = useRevisarCronograma(cronogramaId, versionId);

  const handleConfigurar = useCallback(
    (unidadTiempo: UnidadTiempo, numeroPeriodos: number) => {
      const body = { unidadTiempo, numeroPeriodos };
      if (cronograma) {
        setUltimaConfig(body);
        configCrono.mutate(body);
      } else {
        crearCrono.mutate(body);
      }
      setConfigDialog(false);
    },
    [cronograma, configCrono, crearCrono],
  );

  const handleProgramar = useCallback(
    (body: ActividadProgramarRequest) => {
      if (!actividadEdit) return;
      programar({ actividadId: actividadEdit.id, body });
      setActividadEdit(null);
    },
    [actividadEdit, programar],
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
        insignia={
          <>
            {cronograma?.estadoDistribucion === "BORRADOR" && (
              <Badge variant="secondary">Distribución incompleta</Badge>
            )}
            <BadgeDesactualizado desactualizado={cronograma?.desactualizado ?? false} />
          </>
        }
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

          {/* Sólo con una actividad de verdad: el objeto ficticio que había
              aquí existía para contentar al tipado viejo. */}
          {actividadEdit && (
            <DialogoEditarActividad
              open
              onOpenChange={(open) => {
                if (!open) setActividadEdit(null);
              }}
              onConfirm={handleProgramar}
              actividad={actividadEdit}
              numeroPeriodos={cronograma.numeroPeriodos}
            />
          )}

          <DialogoConfirmarReduccion
            open={!!reduccion}
            onOpenChange={(open) => {
              if (!open) setReduccion(null);
            }}
            onConfirm={() => {
              if (reduccion) {
                configCrono.mutate({ ...reduccion.body, confirmarPerdida: true });
                setReduccion(null);
              }
            }}
            perdidas={reduccion?.perdidas ?? []}
            actividades={cronograma.actividades}
          />
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
    </>
  );
}
