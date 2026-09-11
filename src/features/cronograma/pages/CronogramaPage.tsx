import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
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
import { useCronogramaVistas } from "../hooks/useCronogramaVistas";
import { GanttJerarquicoInteractivo } from "../components/GanttJerarquicoInteractivo";
import { CronogramaValorizado } from "../components/CronogramaValorizado";
import { CurvaSChart } from "../components/CurvaSChart";
import { BadgeDesactualizado } from "../components/BadgeDesactualizado";
import { DialogoConfigurarCronograma } from "../components/DialogoConfigurarCronograma";
import { DialogoConfirmarReduccion } from "../components/DialogoConfirmarReduccion";
import { DialogoEditarActividad } from "../components/DialogoEditarActividad";
import { EncabezadoPagina } from "@/components/comunes/EncabezadoPagina";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type {
  ActividadCronogramaResponse,
  ActividadProgramarRequest,
  CronogramaConfigurarRequest,
  PerdidaAvanceResponse,
  UnidadTiempo,
} from "@/api/contract";

type VistaCronograma = "gantt" | "valorizado" | "curva-s";

function esVistaCronograma(valor: string | null): valor is VistaCronograma {
  return valor === "gantt" || valor === "valorizado" || valor === "curva-s";
}

export function CronogramaPage() {
  // La versión la manda el selector de la barra superior, que ya cae en la
  // vigente cuando la URL no trae `?v=`.
  const { presupuestoId } = useVersionActiva();
  const versionId = presupuestoId ?? "";

  // Esta primera lectura conserva el contrato existente y obtiene el id que
  // necesita la proyección única de vistas.
  const { data: cronograma, isLoading, isError: cronogramaError } = useCronograma(versionId);
  const crearCrono = useCrearCronograma(versionId);

  const [searchParams, setSearchParams] = useSearchParams();
  const vistaParam = searchParams.get("vista");
  const vistaActiva: VistaCronograma = esVistaCronograma(vistaParam) ? vistaParam : "gantt";
  const [configDialog, setConfigDialog] = useState(false);
  const [actividadEdit, setActividadEdit] = useState<ActividadCronogramaResponse | null>(null);
  const [reduccion, setReduccion] = useState<{
    body: CronogramaConfigurarRequest;
    perdidas: PerdidaAvanceResponse[];
  } | null>(null);
  const [ultimaConfig, setUltimaConfig] = useState<CronogramaConfigurarRequest | null>(null);

  const cronogramaId = cronograma?.id ?? "";
  const vistas = useCronogramaVistas(cronogramaId);
  const configCrono = useConfigurarCronograma(cronogramaId, versionId, (perdidas) => {
    if (ultimaConfig) setReduccion({ body: ultimaConfig, perdidas });
  });
  const { mutate: programar } = useProgramarActividad(cronogramaId, versionId);
  const { mutate: revisar } = useRevisarCronograma(cronogramaId, versionId);

  useEffect(() => {
    if (vistaParam === null || esVistaCronograma(vistaParam)) return;
    setSearchParams(
      (actuales) => {
        const siguientes = new URLSearchParams(actuales);
        siguientes.delete("vista");
        return siguientes;
      },
      { replace: true },
    );
  }, [setSearchParams, vistaParam]);

  const handleCambiarVista = useCallback(
    (valor: string) => {
      if (!esVistaCronograma(valor) || actividadEdit) return;
      setSearchParams((actuales) => {
        const siguientes = new URLSearchParams(actuales);
        siguientes.set("vista", valor);
        return siguientes;
      });
    },
    [actividadEdit, setSearchParams],
  );

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

  if (cronogramaError) {
    return <p role="alert">No se pudo cargar el cronograma.</p>;
  }

  const desactualizado =
    cronograma?.desactualizado === true || vistas.data?.gantt.cronograma.desactualizado === true;

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
            <BadgeDesactualizado desactualizado={desactualizado} />
          </>
        }
        acciones={
          <>
            {cronograma && (
              <Button variant="outline" onClick={() => revisar()}>
                Revisar
              </Button>
            )}
            <Button onClick={() => setConfigDialog(true)} disabled={!versionId}>
              {cronograma ? "Reconfigurar" : "Crear cronograma"}
            </Button>
          </>
        }
      />

      {!cronograma && (
        <div className="py-16 text-center text-muted-foreground">
          No hay cronograma para esta versión del presupuesto.
        </div>
      )}

      {cronograma && (
        <>
          <section aria-label="Estado de las vistas del cronograma" className="space-y-2">
            {vistas.isLoading && <output>Cargando vistas del cronograma…</output>}
            {vistas.isFetching && !vistas.isLoading && <output>Actualizando vistas…</output>}
            {desactualizado && !vistas.isError && (
              <output className="text-sm text-muted-foreground">
                La vista está desactualizada respecto del presupuesto; se muestran los valores
                entregados por el servidor.
              </output>
            )}
            {vistas.isError && <p role="alert">No se pudieron cargar las vistas del cronograma.</p>}
            {!vistas.isLoading && !vistas.isError && vistas.data === null && (
              <output>No hay vistas disponibles para este cronograma.</output>
            )}
          </section>

          <Tabs value={vistaActiva} onValueChange={handleCambiarVista} className="min-w-0">
            <div className="overflow-x-auto border-b">
              <TabsList variant="line" aria-label="Vistas del cronograma" className="min-w-max">
                <TabsTrigger value="gantt" disabled={actividadEdit !== null}>
                  Gantt
                </TabsTrigger>
                <TabsTrigger value="valorizado" disabled={actividadEdit !== null}>
                  Cronograma valorizado
                </TabsTrigger>
                <TabsTrigger value="curva-s" disabled={actividadEdit !== null}>
                  Curva S
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="gantt" className="pt-4">
              {vistas.data && (
                <GanttJerarquicoInteractivo
                  gantt={vistas.data.gantt}
                  cronogramaId={cronograma.id}
                  presupuestoId={versionId}
                  onClickActividad={setActividadEdit}
                />
              )}
            </TabsContent>

            <TabsContent value="valorizado" className="pt-4">
              {vistas.data && (
                <CronogramaValorizado
                  valorizado={vistas.data.valorizado}
                  unidadTiempo={vistas.data.gantt.cronograma.unidadTiempo}
                />
              )}
            </TabsContent>

            <TabsContent value="curva-s" className="pt-4">
              {vistas.data && (
                <CurvaSChart
                  curvaS={vistas.data.curvaS}
                  unidadTiempo={vistas.data.gantt.cronograma.unidadTiempo}
                />
              )}
            </TabsContent>
          </Tabs>

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
