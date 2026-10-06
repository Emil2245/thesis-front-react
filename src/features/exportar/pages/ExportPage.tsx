import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { FileDown, AlertTriangle, Loader2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useValidacionExport,
  useExportar,
  usePreflightCronograma,
  usePreflightDocumento,
  type ContextoPreflightDocumento,
} from "../hooks/useExportar";
import { DocumentoPreflightError } from "@/api/client";
import { EncabezadoPagina } from "@/components/comunes/EncabezadoPagina";
import { useProyectoActivoId, useVersionActiva } from "@/shell/contexto";
import { useCronograma } from "@/features/cronograma/hooks/useCronograma";
import { BloqueosCronograma } from "@/features/cronograma/components/BloqueosCronograma";
import type {
  DocumentoPreflightResponse,
  FormatoExportCronograma,
  RubroRefResponse,
} from "@/api/contract";

function ListaRubros({ items, titulo }: { items: RubroRefResponse[]; titulo: string }) {
  if (!items.length) return null;
  return (
    <div className="text-sm">
      <p className="font-medium text-destructive">
        {titulo} ({items.length})
      </p>
      <ul className="list-disc list-inside text-muted-foreground">
        {items.map((r) => (
          <li key={r.id}>
            {r.item} — {r.descripcion}
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Las tres etiquetas en español; `mspdi` viaja como XML, no como `.mspdi`. */
const FORMATOS: { valor: FormatoExportCronograma; etiqueta: string }[] = [
  { valor: "xlsx", etiqueta: "Excel (.xlsx)" },
  { valor: "pdf", etiqueta: "PDF (.pdf)" },
  { valor: "mspdi", etiqueta: "MS Project (.xml)" },
];

/** Feedback local identificado por el mismo contexto efectivo que el preflight. */
function DocumentoPresupuestario({
  documento,
  versionId,
  exportar,
}: {
  documento: "presupuesto" | "apus";
  versionId: string;
  exportar: ReturnType<typeof useExportar>;
}) {
  const [formato, setFormato] = useState<"xlsx" | "pdf">("xlsx");
  const [orientacion, setOrientacion] = useState<"vertical" | "horizontal">("vertical");
  const [layout, setLayout] = useState<"pestanas" | "apilado">("pestanas");
  const contexto: ContextoPreflightDocumento =
    documento === "presupuesto"
      ? {
          presupuestoId: versionId,
          documento,
          opciones: formato === "pdf" ? { formato, orientacion } : { formato },
        }
      : {
          presupuestoId: versionId,
          documento,
          opciones: formato === "xlsx" ? { formato, layout } : { formato },
        };
  const consulta = usePreflightDocumento(contexto);
  const identidad = JSON.stringify([versionId, documento, contexto.opciones]);
  const [feedback, setFeedback] = useState<{
    identidad: string;
    mensaje?: string;
    preflight?: DocumentoPreflightResponse;
    actualizado?: number;
  }>();
  const actual = feedback?.identidad === identidad ? feedback : undefined;
  const directo =
    actual?.preflight &&
    (consulta.isFetching || consulta.isError || consulta.dataUpdatedAt <= (actual.actualizado ?? 0))
      ? actual.preflight
      : undefined;
  const preflight = directo ?? consulta.data;
  const habilitado =
    consulta.isSuccess &&
    !consulta.isFetching &&
    consulta.data?.exportable === true &&
    preflight?.exportable === true &&
    !exportar.descargando;
  const nombre = documento === "presupuesto" ? "presupuesto" : "APUs";

  const descargar = async () => {
    if (!habilitado) return;
    // El render del clic captura UUID, opciones y la invalidación lexical exacta.
    const invalidar = consulta.invalidar;
    const actualizado = consulta.dataUpdatedAt;
    setFeedback(undefined);
    try {
      if (contexto.documento === "presupuesto") {
        await exportar.descargarPresupuesto(versionId, contexto.opciones);
      } else {
        await exportar.descargarApus(versionId, contexto.opciones);
      }
    } catch (error) {
      if (error instanceof DocumentoPreflightError) {
        const recibido = error.preflight;
        const opcionesEsperadas = contexto.opciones;
        const coincide =
          recibido.presupuestoId === versionId &&
          recibido.documento === documento &&
          recibido.formato === formato &&
          JSON.stringify(recibido.opciones) ===
            JSON.stringify(
              documento === "presupuesto" && opcionesEsperadas.formato === "pdf"
                ? { orientacion: opcionesEsperadas.orientacion }
                : documento === "apus" && opcionesEsperadas.formato === "xlsx"
                  ? { layout: opcionesEsperadas.layout }
                  : {},
            );
        // Bloquear antes de refrescar: un éxito antiguo en caché no autoriza otro clic.
        setFeedback({
          identidad,
          actualizado,
          ...(coincide
            ? { preflight: recibido }
            : { mensaje: "No se pudo descargar el documento. Intente nuevamente." }),
        });
        await invalidar();
      } else {
        setFeedback({
          identidad,
          mensaje: "No se pudo descargar el documento. Intente nuevamente.",
        });
      }
    }
  };

  return (
    <Card className="shrink-0 min-w-0 break-words">
      <CardHeader>
        <CardTitle>{documento === "presupuesto" ? "Presupuesto" : "APUs referenciados"}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2 max-w-xs">
          <Label htmlFor={`formato-${documento}`}>Formato de {nombre}</Label>
          <Select
            value={formato}
            onValueChange={(valor: "xlsx" | "pdf") => {
              setFormato(valor);
              setOrientacion("vertical");
              setLayout("pestanas");
              setFeedback(undefined);
            }}
          >
            <SelectTrigger id={`formato-${documento}`} aria-label={`Formato de ${nombre}`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="xlsx">Excel (.xlsx)</SelectItem>
                <SelectItem value="pdf">PDF (.pdf)</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
        {documento === "presupuesto" && formato === "pdf" && (
          <div className="space-y-2 max-w-xs">
            <Label htmlFor="orientacion-presupuesto">Orientación del PDF A4</Label>
            <Select
              value={orientacion}
              onValueChange={(valor: "vertical" | "horizontal") => setOrientacion(valor)}
            >
              <SelectTrigger id="orientacion-presupuesto" aria-label="Orientación del PDF A4">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="vertical">Vertical</SelectItem>
                  <SelectItem value="horizontal">Horizontal</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
        )}
        {documento === "apus" && formato === "xlsx" && (
          <div className="space-y-2 max-w-xs">
            <Label htmlFor="layout-apus">Organización de APUs</Label>
            <Select
              value={layout}
              onValueChange={(valor: "pestanas" | "apilado") => setLayout(valor)}
            >
              <SelectTrigger id="layout-apus" aria-label="Organización de APUs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="pestanas">Pestañas</SelectItem>
                  <SelectItem value="apilado">Apilado</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
        )}
        {preflight?.bloqueos.length ? (
          <Alert variant="destructive">
            <AlertTriangle className="size-4" />
            <AlertTitle className="min-w-0 [overflow-wrap:anywhere]">
              No se puede descargar {nombre}
            </AlertTitle>
            <AlertDescription className="min-w-0 [overflow-wrap:anywhere] space-y-2 mt-2">
              {preflight.bloqueos.map((bloqueo) => (
                <div key={bloqueo.codigo}>
                  <p>{bloqueo.mensaje}</p>
                  <ListaRubros items={bloqueo.rubros} titulo="Rubros afectados" />
                </div>
              ))}
            </AlertDescription>
          </Alert>
        ) : null}
        {preflight?.warnings.length ? (
          <Alert className="bg-advertencia/15 text-advertencia-texto border-advertencia/30">
            <AlertTriangle className="size-4" />
            <AlertTitle className="min-w-0 [overflow-wrap:anywhere]">Avisos de {nombre}</AlertTitle>
            <AlertDescription className="min-w-0 [overflow-wrap:anywhere] mt-2 text-advertencia-texto">
              {preflight.warnings.map((warning) => (
                <div key={warning.codigo}>
                  <p>{warning.mensaje}</p>
                  <ul className="list-disc list-inside">
                    {warning.rubros.map((rubro) => (
                      <li key={rubro.id}>
                        {rubro.item} — {rubro.descripcion}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </AlertDescription>
          </Alert>
        ) : null}
        {(consulta.isError || actual?.mensaje) && (
          <Alert variant="destructive">
            <AlertTriangle className="size-4" />
            <AlertTitle className="min-w-0 [overflow-wrap:anywhere]">
              Error al exportar {nombre}
            </AlertTitle>
            <AlertDescription className="min-w-0 [overflow-wrap:anywhere]">
              {actual?.mensaje ?? "No se pudo comprobar la exportación. Intente nuevamente."}
            </AlertDescription>
          </Alert>
        )}
        <Button size="sm" onClick={descargar} disabled={!habilitado}>
          {exportar.descargando ? (
            <Loader2 className="size-3.5 animate-spin mr-1" />
          ) : (
            <FileDown className="size-3.5 mr-1" />
          )}
          Descargar {nombre}
        </Button>
      </CardContent>
    </Card>
  );
}

/** Los documentos conservan sus gates independientes y la versión seleccionada. */
export function ExportPage() {
  const { presupuestoId, activa, isPending: versionPendiente } = useVersionActiva();
  const versionId = presupuestoId ?? "";

  const { data: validacion, isLoading: valLoading } = useValidacionExport(versionId);
  const exportar = useExportar();
  const { descargarEspecificacionesTecnicas, descargarCronograma } = exportar;
  const [descargando, setDescargando] = useState(false);

  const [formato, setFormato] = useState<FormatoExportCronograma>("xlsx");
  const [papel, setPapel] = useState<"a4" | "a3">("a4");
  const { data: preflight, isLoading: preflightLoading } = usePreflightCronograma(
    versionId,
    formato,
  );
  const [descargandoCronograma, setDescargandoCronograma] = useState(false);
  // Sólo para poner nombre a las actividades que el preflight señala por id.
  const { data: cronograma } = useCronograma(versionId);
  const proyectoId = useProyectoActivoId();
  const { search } = useLocation();

  // Con la query deshabilitada por falta de id, `validacion` y `preflight` son
  // `undefined` y sus guardas evalúan a «habilitado». Lo que tiene que bloquear
  // el botón es la ausencia del id, no el resultado de una query que no corrió.
  const sinVersion = !versionId;

  const handleExport = async () => {
    setDescargando(true);
    await descargarEspecificacionesTecnicas(versionId);
    setDescargando(false);
  };

  const handleExportCronograma = async () => {
    setDescargandoCronograma(true);
    await descargarCronograma(versionId, formato, formato === "pdf" ? papel : undefined);
    setDescargandoCronograma(false);
  };

  return (
    <>
      <EncabezadoPagina
        titulo="Exportar"
        descripcion={
          activa
            ? `Descargue documentos de la versión ${activa.version}${
                activa.esVigente ? " (vigente)" : ""
              }`
            : "Descargue documentos del presupuesto"
        }
      />

      {!versionPendiente && sinVersion && (
        <Alert>
          <AlertTriangle className="size-4" />
          <AlertTitle>Sin versión de presupuesto</AlertTitle>
          <AlertDescription>
            Este proyecto todavía no tiene ninguna versión de presupuesto, así que no hay nada que
            exportar.
          </AlertDescription>
        </Alert>
      )}

      {valLoading && (
        <div className="flex justify-center py-8">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        </div>
      )}

      {validacion && !validacion.exportable && (
        <Alert variant="destructive">
          <AlertTriangle className="size-4" />
          <AlertTitle>El presupuesto no puede exportarse</AlertTitle>
          <AlertDescription className="space-y-2 mt-2">
            <ListaRubros items={validacion.itemsPuCero} titulo="Rubros con precio unitario cero" />
            <ListaRubros items={validacion.itemsCantidadCero} titulo="Rubros con cantidad cero" />
            <ListaRubros
              items={validacion.itemsSinActividad}
              titulo="Rubros sin actividad en cronograma"
            />
          </AlertDescription>
        </Alert>
      )}

      <Card className="shrink-0 min-w-0">
        <CardHeader>
          <CardTitle>Documentos disponibles</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
            <div className="flex items-center gap-2">
              <FileDown className="size-4 text-muted-foreground" />
              <div>
                <p className="font-medium">Especificaciones técnicas (DOCX)</p>
                <p className="text-sm text-muted-foreground">
                  Pliego de especificaciones del proyecto
                </p>
              </div>
            </div>
            <Button
              size="sm"
              onClick={handleExport}
              disabled={
                sinVersion || descargando || (!validacion?.exportable && validacion !== undefined)
              }
            >
              {descargando ? (
                <Loader2 className="size-3.5 animate-spin mr-1" />
              ) : (
                <FileDown className="size-3.5 mr-1" />
              )}
              Descargar
            </Button>
          </div>
        </CardContent>
      </Card>

      <DocumentoPresupuestario documento="presupuesto" versionId={versionId} exportar={exportar} />
      <DocumentoPresupuestario documento="apus" versionId={versionId} exportar={exportar} />

      <Card className="shrink-0 min-w-0">
        <CardHeader>
          <CardTitle>Cronograma valorizado</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2 max-w-xs">
            <Label htmlFor="formato-cronograma">Formato</Label>
            <Select
              value={formato}
              onValueChange={(v: FormatoExportCronograma) => {
                setFormato(v);
                setPapel("a4");
              }}
            >
              <SelectTrigger id="formato-cronograma" aria-label="Formato">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {FORMATOS.map((f) => (
                    <SelectItem key={f.valor} value={f.valor}>
                      {f.etiqueta}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>

          {formato === "pdf" && (
            <div className="space-y-2 max-w-xs">
              <Label htmlFor="papel-cronograma">Papel del PDF de cronograma</Label>
              <Select value={papel} onValueChange={(valor: "a4" | "a3") => setPapel(valor)}>
                <SelectTrigger id="papel-cronograma" aria-label="Papel del PDF de cronograma">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="a4">A4 horizontal</SelectItem>
                    <SelectItem value="a3">A3 horizontal</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
          )}

          {preflight && !preflight.exportable && (
            <Alert variant="destructive">
              <AlertTriangle className="size-4" />
              <AlertTitle>El cronograma no puede exportarse en este formato</AlertTitle>
              <AlertDescription className="mt-2 space-y-2">
                <BloqueosCronograma
                  bloqueos={preflight.bloqueos}
                  actividades={cronograma?.actividades ?? []}
                />
                {proyectoId && (
                  <Link
                    to={`/proyectos/${proyectoId}/cronograma${search}`}
                    className="inline-block font-medium underline underline-offset-2"
                  >
                    Abrir el cronograma
                  </Link>
                )}
              </AlertDescription>
            </Alert>
          )}

          {/* Un warning avisa pero no bloquea: el botón sigue habilitado. */}
          {preflight && preflight.warnings.length > 0 && (
            <Alert className="bg-advertencia/15 text-advertencia-texto border-advertencia/30">
              <AlertTriangle className="size-4" />
              <AlertTitle>Avisos</AlertTitle>
              <AlertDescription className="mt-2 text-advertencia-texto">
                <ul className="list-disc list-inside">
                  {preflight.warnings.map((w) => (
                    <li key={w.codigo}>{w.detalle}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
            <div className="flex items-center gap-2">
              <FileDown className="size-4 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Cronograma de avance valorizado del presupuesto
              </p>
            </div>
            <Button
              size="sm"
              onClick={handleExportCronograma}
              disabled={
                sinVersion ||
                descargandoCronograma ||
                preflightLoading ||
                preflight?.exportable === false
              }
            >
              {descargandoCronograma ? (
                <Loader2 className="size-3.5 animate-spin mr-1" />
              ) : (
                <FileDown className="size-3.5 mr-1" />
              )}
              Descargar cronograma
            </Button>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
