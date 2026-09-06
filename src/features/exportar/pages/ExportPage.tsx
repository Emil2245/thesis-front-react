import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { FileDown, AlertTriangle, Loader2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useValidacionExport, useExportar } from "../hooks/useExportar";
import { EncabezadoPagina } from "@/components/comunes/EncabezadoPagina";
import type { RubroRefResponse } from "@/api/contract";

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

/**
 * Plan 051: el backend genera un único documento, la especificación técnica en
 * DOCX. Los otros cuatro entregables de P-37 (presupuesto PDF/Excel, APUs,
 * cronograma) no existen en ninguna ruta: se anuncian con un aviso honesto en
 * vez de botones deshabilitados, que prometerían que llegan pronto.
 */
export function ExportPage() {
  const [searchParams] = useSearchParams();
  const versionId = searchParams.get("v") ?? "";

  const { data: validacion, isLoading: valLoading } = useValidacionExport(versionId);
  const { descargarEspecificacionesTecnicas } = useExportar();
  const [descargando, setDescargando] = useState(false);

  const handleExport = async () => {
    setDescargando(true);
    await descargarEspecificacionesTecnicas(versionId);
    setDescargando(false);
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
            Por ahora solo se genera este documento. La exportación del presupuesto, de los APUs y
            del cronograma todavía no existe en el servidor.
          </p>
        </CardContent>
      </Card>
    </>
  );
}
