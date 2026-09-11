import { useEffect, useMemo, useState, type RefObject } from "react";
import { toast } from "sonner";

import type { CapituloResponse, Page, PlantillaApuResumenResponse } from "@/api/contract";
import { ApiError } from "@/api/problem";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  usePlantillaDetalle,
  useBusquedaPlantillas,
} from "@/features/apu-editor/hooks/usePlantillas";
import { useAgregarDesdePlantillas } from "@/features/presupuesto/hooks/useRubroMutaciones";
import { BuscadorFiltrosPlantillas } from "./agregar-apu/BuscadorFiltrosPlantillas";
import { DetallePlantilla } from "./agregar-apu/DetallePlantilla";
import { FormularioApuManualCompleto } from "./agregar-apu/FormularioApuManualCompleto";
import { ListaPlantillas } from "./agregar-apu/ListaPlantillas";
import { CAPITULO_AL_FINAL, aplanarCapitulos } from "./agregar-apu/capitulos";
import { SelectorCapitulo } from "./agregar-apu/SelectorCapitulo";

interface DialogoAgregarApuProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  presupuestoId: string;
  proyectoId: string;
  capitulos: CapituloResponse[];
  defaultCapituloId?: string;
  onCrearManualmente?: () => void;
  returnFocusRef?: RefObject<HTMLButtonElement | null>;
}

function useValorDebounced<T>(valor: T, esperaMs: number): T {
  const [debounced, setDebounced] = useState(valor);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(valor), esperaMs);
    return () => window.clearTimeout(timer);
  }, [esperaMs, valor]);

  return debounced;
}

function ordenarSeleccionVisual(
  seleccionadas: PlantillaApuResumenResponse[],
  ordenVisual: string[],
): PlantillaApuResumenResponse[] {
  const posiciones = new Map(ordenVisual.map((id, indice) => [id, indice]));
  return seleccionadas.toSorted((a, b) => {
    const posicionA = posiciones.get(a.id);
    const posicionB = posiciones.get(b.id);
    if (posicionA === undefined || posicionB === undefined) return 0;
    return posicionA - posicionB;
  });
}

function nombrePlantillaFallida(
  error: unknown,
  plantillas: PlantillaApuResumenResponse[],
  idsEnviados: string[],
): string | null {
  if (!(error instanceof ApiError)) return null;
  const detalles = error.problem.detalles;
  if (!detalles || typeof detalles !== "object") return null;

  let plantillaId: string | undefined;
  if ("plantillaId" in detalles && typeof detalles.plantillaId === "string") {
    plantillaId = detalles.plantillaId;
  } else if (
    "indice" in detalles &&
    typeof detalles.indice === "number" &&
    Number.isInteger(detalles.indice)
  ) {
    plantillaId = idsEnviados[detalles.indice];
  }

  return plantillas.find((plantilla) => plantilla.id === plantillaId)?.nombre ?? null;
}

export function DialogoAgregarApu({
  open,
  onOpenChange,
  presupuestoId,
  proyectoId,
  capitulos,
  defaultCapituloId,
  onCrearManualmente,
  returnFocusRef,
}: DialogoAgregarApuProps) {
  const opcionesCapitulo = useMemo(() => aplanarCapitulos(capitulos), [capitulos]);
  const capituloInicial =
    defaultCapituloId && opcionesCapitulo.some(({ capitulo }) => capitulo.id === defaultCapituloId)
      ? defaultCapituloId
      : CAPITULO_AL_FINAL;
  const [capituloId, setCapituloId] = useState(capituloInicial);
  const [busqueda, setBusqueda] = useState("");
  const busquedaDebounced = useValorDebounced(busqueda.trim(), 300);
  const [incluirSistema, setIncluirSistema] = useState(true);
  const [incluirPersonal, setIncluirPersonal] = useState(true);
  const [page, setPage] = useState(0);
  const [activa, setActiva] = useState<PlantillaApuResumenResponse | null>(null);
  const [seleccionadas, setSeleccionadas] = useState<PlantillaApuResumenResponse[]>([]);
  const [errorAgregar, setErrorAgregar] = useState<string | null>(null);
  const [modo, setModo] = useState<"plantillas" | "manual">("plantillas");
  const [paginaAnterior, setPaginaAnterior] = useState<
    Page<PlantillaApuResumenResponse> | undefined
  >(undefined);

  const tipos = useMemo(() => {
    const fuentes: Array<"SISTEMA" | "PERSONAL"> = [];
    if (incluirSistema) fuentes.push("SISTEMA");
    if (incluirPersonal) fuentes.push("PERSONAL");
    return fuentes;
  }, [incluirPersonal, incluirSistema]);

  const busquedaQuery = useBusquedaPlantillas({
    q: busquedaDebounced || undefined,
    tipos,
    page,
    size: 20,
  });
  const detalleQuery = usePlantillaDetalle(activa?.id ?? null);
  const agregar = useAgregarDesdePlantillas(presupuestoId);
  const paginaMostrada = busquedaQuery.data ?? paginaAnterior;
  const plantillas = paginaMostrada?.contenido ?? [];
  const seleccionadasIds = useMemo(
    () => new Set(seleccionadas.map((plantilla) => plantilla.id)),
    [seleccionadas],
  );

  const conservarPaginaActual = () => {
    if (busquedaQuery.data) setPaginaAnterior(busquedaQuery.data);
  };

  const cambiarBusqueda = (valor: string) => {
    conservarPaginaActual();
    setBusqueda(valor);
    setPage(0);
  };

  const cambiarFuente = (fuente: "SISTEMA" | "PERSONAL", activo: boolean) => {
    conservarPaginaActual();
    if (fuente === "SISTEMA") setIncluirSistema(activo);
    else setIncluirPersonal(activo);
    setPage(0);
  };

  const cambiarPagina = (siguiente: number) => {
    conservarPaginaActual();
    setPage(siguiente);
  };

  const seleccionar = (id: string, checked: boolean, ordenVisual: string[]) => {
    const plantilla = plantillas.find((item) => item.id === id);
    if (!plantilla) return;
    setSeleccionadas((actuales) => {
      const sinActual = actuales.filter((item) => item.id !== id);
      return checked ? ordenarSeleccionVisual([...sinActual, plantilla], ordenVisual) : sinActual;
    });
    setErrorAgregar(null);
  };

  const agregarPlantillas = async () => {
    const elegidas = seleccionadas.length > 0 ? seleccionadas : activa ? [activa] : [];
    if (elegidas.length === 0) return;

    const plantillaIds = elegidas.map((plantilla) => plantilla.id);
    setErrorAgregar(null);
    try {
      const response = await agregar.mutateAsync({
        ...(capituloId === CAPITULO_AL_FINAL ? {} : { capituloId }),
        plantillaIds,
      });
      response.resultados.forEach((resultado) => {
        if (resultado.advertencias.length === 0) return;
        const mensajes = resultado.advertencias
          .map((advertencia) => `${advertencia.insumoCodigo} — ${advertencia.mensaje}`)
          .join("; ");
        toast.warning(`${resultado.plantillaNombre}: ${mensajes}`);
      });
      toast.success(
        plantillaIds.length === 1
          ? "Plantilla agregada al presupuesto"
          : "Plantillas agregadas al presupuesto",
      );
      onOpenChange(false);
    } catch (error) {
      const nombre = nombrePlantillaFallida(error, elegidas, plantillaIds);
      const mensaje =
        error instanceof ApiError
          ? error.problem.mensaje
          : "No se pudieron agregar las plantillas.";
      setErrorAgregar(nombre ? `${mensaje}: ${nombre}.` : mensaje);
    }
  };

  const ocultarResultados =
    tipos.length > 0 &&
    (busqueda !== busquedaDebounced || (busquedaQuery.isFetching && !busquedaQuery.data));
  const puedeAgregar = seleccionadas.length > 0 || activa !== null;

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!agregar.isPending) onOpenChange(nextOpen);
      }}
    >
      <DialogContent
        className="max-h-[calc(100vh-2rem)] overflow-hidden sm:max-w-4xl"
        onCloseAutoFocus={(event) => {
          if (!returnFocusRef?.current) return;
          event.preventDefault();
          returnFocusRef.current.focus();
        }}
      >
        <DialogHeader>
          <DialogTitle>Agregar APU</DialogTitle>
          <DialogDescription>
            {modo === "plantillas"
              ? "Busca plantillas, revisa su contenido y agrega una o varias al presupuesto."
              : "Completa los datos del APU y agrega al menos un insumo."}
          </DialogDescription>
        </DialogHeader>

        {modo === "manual" ? (
          <div className="min-h-0 overflow-y-auto py-1">
            <FormularioApuManualCompleto
              presupuestoId={presupuestoId}
              proyectoId={proyectoId}
              {...(capituloId === CAPITULO_AL_FINAL ? {} : { capituloId })}
              onCreado={() => onOpenChange(false)}
              onCancelar={() => setModo("plantillas")}
            />
          </div>
        ) : (
          <>
            <div className="min-h-0 space-y-4 overflow-y-auto py-1">
              <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(15rem,0.7fr)] md:items-end">
                <BuscadorFiltrosPlantillas
                  busqueda={busqueda}
                  onBusquedaChange={cambiarBusqueda}
                  sistema={incluirSistema}
                  onSistemaChange={(activo) => cambiarFuente("SISTEMA", activo)}
                  personal={incluirPersonal}
                  onPersonalChange={(activo) => cambiarFuente("PERSONAL", activo)}
                />
                <SelectorCapitulo
                  opciones={opcionesCapitulo}
                  value={capituloId}
                  onValueChange={setCapituloId}
                />
              </div>

              <div className="grid min-h-0 gap-4 md:grid-cols-2">
                <ListaPlantillas
                  plantillas={plantillas}
                  activaId={activa?.id ?? null}
                  seleccionadas={seleccionadasIds}
                  onActivar={(id) => {
                    const plantilla = plantillas.find((item) => item.id === id);
                    if (plantilla) setActiva(plantilla);
                    setErrorAgregar(null);
                  }}
                  onSeleccionar={seleccionar}
                  cargando={busquedaQuery.isFetching}
                  ocultarResultados={ocultarResultados}
                  error={busquedaQuery.isError}
                  sinFuentes={tipos.length === 0}
                  page={page}
                  totalPaginas={paginaMostrada?.totalPaginas ?? 0}
                  onPageChange={cambiarPagina}
                />
                <DetallePlantilla
                  detalle={detalleQuery.data}
                  cargando={detalleQuery.isFetching}
                  error={detalleQuery.isError}
                  hayActiva={activa !== null}
                />
              </div>

              {errorAgregar ? (
                <p
                  role="alert"
                  aria-live="assertive"
                  className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive"
                >
                  {errorAgregar}
                </p>
              ) : null}
            </div>

            <DialogFooter className="sm:justify-between">
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  onCrearManualmente?.();
                  setModo("manual");
                }}
                disabled={agregar.isPending}
              >
                Crear manualmente
              </Button>
              <div className="flex flex-col-reverse gap-2 sm:flex-row">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={agregar.isPending}
                >
                  Cancelar
                </Button>
                <Button
                  type="button"
                  onClick={agregarPlantillas}
                  disabled={!puedeAgregar || agregar.isPending}
                  aria-label="Agregar plantillas"
                >
                  {agregar.isPending ? "Agregando…" : "Agregar"}
                </Button>
              </div>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
