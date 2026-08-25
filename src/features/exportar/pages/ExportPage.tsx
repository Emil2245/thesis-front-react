import { useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { FileDown, FileSpreadsheet, AlertTriangle, Loader2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useValidacionExport, useExportar, opcionesExport } from "../hooks/useExportar";
import { EncabezadoPagina } from "@/components/comunes/EncabezadoPagina";
import { ModuloNoDisponible } from "@/components/comunes/ModuloNoDisponible";
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
          <li key={r.rubroId}>
            {r.item} — {r.descripcion}
          </li>
        ))}
      </ul>
    </div>
  );
}

// El backend no tiene ningún endpoint de exportación todavía (plan 027).
// Para reactivar: borra este bloque, quita "documentos" de MODULOS_SIN_BACKEND
// y exporta ExportPageActiva como ExportPage.
export function ExportPage() {
  return (
    <>
      <EncabezadoPagina titulo="Exportar" />
      <ModuloNoDisponible
        modulo="La exportación de documentos"
        descripcion="El servidor todavía no expone la generación de documentos del presupuesto. La pantalla está construida y se activará cuando el endpoint exista."
      />
    </>
  );
}

export function ExportPageActiva() {
  const { id: proyectoId } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const versionId = Number(searchParams.get("v")) || 0;

  const { data: validacion, isLoading: valLoading } = useValidacionExport(versionId);
  const { descargarConFallback } = useExportar();
  const [descargando, setDescargando] = useState<string | null>(null);

  const handleExport = async (opcion: (typeof opcionesExport)[number]) => {
    setDescargando(opcion.key);
    await descargarConFallback(opcion.endpoint(versionId), opcion.nombre(proyectoId ?? "0"));
    setDescargando(null);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Exportar</h1>
          <p className="text-sm text-muted-foreground">Descargue documentos del presupuesto</p>
        </div>
      </div>

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
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Documento</TableHead>
                <TableHead className="w-40 text-right">Acción</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {opcionesExport.map((op) => (
                <TableRow key={op.key}>
                  <TableCell className="flex items-center gap-2">
                    {op.key.includes("excel") ? (
                      <FileSpreadsheet className="size-4 text-muted-foreground" />
                    ) : (
                      <FileDown className="size-4 text-muted-foreground" />
                    )}
                    {op.label}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      onClick={() => handleExport(op)}
                      disabled={
                        descargando === op.key ||
                        (!validacion?.exportable && validacion !== undefined)
                      }
                    >
                      {descargando === op.key ? (
                        <Loader2 className="size-3.5 animate-spin mr-1" />
                      ) : (
                        <FileDown className="size-3.5 mr-1" />
                      )}
                      Descargar
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
