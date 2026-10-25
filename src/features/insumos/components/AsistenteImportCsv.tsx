import { useState, useRef } from "react";
import Papa from "papaparse";
import { toast } from "sonner";
import { useImportarCsv } from "../hooks/useImportCsv";
import type { ImportResultadoResponse } from "@/api/contract";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/field";
import { Label } from "@/components/ui/label";
import { ChevronLeftIcon, DownloadIcon, AlertCircleIcon } from "lucide-react";
import { notificarError } from "@/lib/manejoErrores";
import type { DestinoInsumos } from "../destino";

const PASOS = ["Seleccionar archivo", "Importar"];

/** Mismas equivalencias que `CsvInsumoParser` del backend. Celda vacía = Material. */
export function tipoDetectado(raw: string | undefined): string {
  const t = (raw ?? "").trim().toUpperCase().replace(/_/g, " ");
  if (t === "") return "Material";
  if (["MATERIAL", "MAT"].includes(t)) return "Material";
  if (["MANO OBRA", "MANO DE OBRA", "MO"].includes(t)) return "Mano de obra";
  if (["EQUIPO", "EQ"].includes(t)) return "Equipo";
  if (["TRANSPORTE", "TR"].includes(t)) return "Transporte";
  return "No reconocido";
}

const VISTA_PREVIA = 5;

export function AsistenteImportCsv({
  abierto,
  onClose,
  destino,
}: {
  abierto: boolean;
  onClose: () => void;
  /** El backend usa el mismo parser y servicio para proyecto y base central. */
  destino: DestinoInsumos;
}) {
  const [paso, setPaso] = useState(0);
  const [archivo, setArchivo] = useState<File | null>(null);
  const [filas, setFilas] = useState<Record<string, string>[]>([]);
  const [resultado, setResultado] = useState<ImportResultadoResponse | null>(null);
  const importar = useImportarCsv(destino);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setArchivo(f);
    Papa.parse(f, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        setFilas(results.data as Record<string, string>[]);
      },
    });
  };

  const handleImportar = async () => {
    if (!archivo) return;
    const formData = new FormData();
    formData.append("archivo", archivo);
    try {
      const res = await importar.mutateAsync({ formData });
      toast.success(
        `${res.creados} creados, ${res.actualizados} actualizados, ${res.sinCambios} sin cambios${res.errores.length ? `, ${res.errores.length} errores` : ""}`,
      );
      if (res.errores.length > 0) {
        setResultado(res);
        setPaso(1);
      } else {
        onClose();
      }
    } catch (err) {
      // No hay ningún `csv-invalido`: los errores de fila vuelven en un 200
      // con `ImportResultadoResponse.errores[]` (arriba), y un CSV que el
      // backend no puede procesar sale como `validacion` con su mensaje.
      notificarError(err, "Error al importar");
    }
  };

  return (
    <Dialog open={abierto} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Importar insumos desde CSV</DialogTitle>
          <DialogDescription>
            Paso {paso + 1} de 2 — {PASOS[paso]}
          </DialogDescription>
        </DialogHeader>

        {paso === 0 && (
          <div className="space-y-4">
            {/* Plan 067: las columnas son las del parser del backend
                (CsvInsumoParser), no las que el texto anterior inventaba. */}
            <p className="text-sm text-muted-foreground">
              Selecciona un archivo CSV con las columnas codigo, descripcion, precio, tipo y unidad,
              en cualquier orden. Solo tipo y unidad son opcionales.
            </p>
            <p className="text-sm text-muted-foreground">
              El tipo puede ser MATERIAL, MANO_OBRA, EQUIPO o TRANSPORTE; si falta, el insumo se
              crea como Material. La mano de obra y el equipo usan siempre la unidad h. Si el código
              ya existe en la base, se actualizan su descripción, unidad y precio.
            </p>
            <Field>
              <Label htmlFor="csv-archivo">Archivo CSV</Label>
              <Input
                id="csv-archivo"
                ref={fileRef}
                type="file"
                accept=".csv"
                onChange={handleFileChange}
              />
            </Field>
            {archivo && (
              <p className="text-sm text-muted-foreground">{filas.length} filas detectadas</p>
            )}
            {archivo && filas.length > 0 && (
              <table className="w-full text-sm" aria-label="Vista previa">
                <thead>
                  <tr className="text-left text-muted-foreground">
                    <th>Código</th>
                    <th>Descripción</th>
                    <th>Tipo detectado</th>
                  </tr>
                </thead>
                <tbody>
                  {filas.slice(0, VISTA_PREVIA).map((f, i) => (
                    <tr key={i}>
                      <td>{f.codigo}</td>
                      <td>{f.descripcion}</td>
                      <td>{tipoDetectado(f.tipo)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            <Button variant="outline" size="sm" asChild>
              <a href="/plantillas/insumos-template.csv" download>
                <DownloadIcon /> Descargar plantilla
              </a>
            </Button>
          </div>
        )}

        {paso === 1 && resultado && (
          <div className="space-y-4">
            <p className="text-sm">
              Se importaron {resultado.creados} nuevos y se actualizaron {resultado.actualizados}{" "}
              existentes ({resultado.sinCambios} sin cambios), con {resultado.errores.length}{" "}
              errores.
            </p>
            <div className="max-h-48 overflow-y-auto">
              {resultado.errores.map((e) => (
                <div key={e.fila} className="flex items-center gap-2 text-sm text-destructive">
                  <AlertCircleIcon className="size-4" />
                  <span>
                    Fila {e.fila}: {e.mensaje}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <DialogFooter className="flex justify-between">
          {paso === 1 && (
            <Button variant="outline" onClick={() => setPaso(0)}>
              <ChevronLeftIcon /> Atrás
            </Button>
          )}
          {paso === 0 && (
            <Button onClick={handleImportar} disabled={!archivo || importar.isPending}>
              {importar.isPending ? "Importando…" : "Importar"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
