import { useState } from "react";
import { useSearchParams } from "react-router-dom";
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
import { useValidacionExport, useExportar, usePreflightCronograma } from "../hooks/useExportar";
import { EncabezadoPagina } from "@/components/comunes/EncabezadoPagina";
import type { FormatoExportCronograma, RubroRefResponse } from "@/api/contract";

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

/**
 * El backend genera dos documentos: la especificación técnica en DOCX (plan
 * 051) y el cronograma valorizado en tres formatos (plan 031 del backend, @
 * `5673615`). El presupuesto y los APUs —los otros dos entregables de P-37— no
 * existen en ninguna ruta: se anuncian con un aviso honesto en vez de botones
 * deshabilitados, que prometerían que llegan pronto.
 *
 * De los bloqueos del preflight se muestra el `detalle`, que el servidor ya
 * redacta en español: una tabla de traducción de códigos se quedaría corta en
 * cuanto el backend añada un código.
 */
export function ExportPage() {
  const [searchParams] = useSearchParams();
  const versionId = searchParams.get("v") ?? "";

  const { data: validacion, isLoading: valLoading } = useValidacionExport(versionId);
  const { descargarEspecificacionesTecnicas, descargarCronograma } = useExportar();
  const [descargando, setDescargando] = useState(false);

  const [formato, setFormato] = useState<FormatoExportCronograma>("xlsx");
  const { data: preflight, isLoading: preflightLoading } = usePreflightCronograma(
    versionId,
    formato,
  );
  const [descargandoCronograma, setDescargandoCronograma] = useState(false);

  const handleExport = async () => {
    setDescargando(true);
    await descargarEspecificacionesTecnicas(versionId);
    setDescargando(false);
  };

  const handleExportCronograma = async () => {
    setDescargandoCronograma(true);
    await descargarCronograma(versionId, formato);
    setDescargandoCronograma(false);
  };

  return (
    <>
      <EncabezadoPagina titulo="Exportar" descripcion="Descargue documentos del presupuesto" />

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

      <Card>
        <CardHeader>
          <CardTitle>Documentos disponibles</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between gap-4">
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
              disabled={descargando || (!validacion?.exportable && validacion !== undefined)}
            >
              {descargando ? (
                <Loader2 className="size-3.5 animate-spin mr-1" />
              ) : (
                <FileDown className="size-3.5 mr-1" />
              )}
              Descargar
            </Button>
          </div>
          <p className="text-sm text-muted-foreground border-t pt-4">
            La exportación del presupuesto y de los APUs todavía no existe en el servidor.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Cronograma valorizado</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2 max-w-xs">
            <Label htmlFor="formato-cronograma">Formato</Label>
            <Select value={formato} onValueChange={(v: FormatoExportCronograma) => setFormato(v)}>
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

          {preflight && !preflight.exportable && (
            <Alert variant="destructive">
              <AlertTriangle className="size-4" />
              <AlertTitle>El cronograma no puede exportarse en este formato</AlertTitle>
              <AlertDescription className="mt-2">
                <ul className="list-disc list-inside">
                  {preflight.bloqueos.map((b) => (
                    <li key={`${b.codigo}-${b.actividadId ?? ""}`}>{b.detalle}</li>
                  ))}
                </ul>
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

          <div className="flex items-center justify-between gap-4">
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
                descargandoCronograma || preflightLoading || preflight?.exportable === false
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
