import { useState, useRef } from "react";
import Papa from "papaparse";
import { toast } from "sonner";
import { useImportarCsv } from "../hooks/useImportCsv";
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
import { ChevronLeftIcon, ChevronRightIcon, DownloadIcon, AlertCircleIcon } from "lucide-react";
import { ApiError } from "@/api/problem";

const PASOS = ["Seleccionar archivo", "Validar", "Importar"];

export function AsistenteImportCsv({
  abierto,
  onClose,
  proyectoId,
}: {
  abierto: boolean;
  onClose: () => void;
  proyectoId: number;
}) {
  const [paso, setPaso] = useState(0);
  const [archivo, setArchivo] = useState<File | null>(null);
  const [filas, setFilas] = useState<Record<string, string>[]>([]);
  const [resultado, setResultado] = useState<{
    creados: number;
    actualizados: number;
    errores: Array<{ fila: number; mensaje: string }>;
  } | null>(null);
  const importar = useImportarCsv(proyectoId);
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

  const handleValidar = async () => {
    if (!archivo) return;
    const formData = new FormData();
    formData.append("archivo", archivo);
    try {
      const res = await importar.mutateAsync({ formData, soloValidar: true });
      setResultado(res);
      setPaso(2);
    } catch (err) {
      if (err instanceof ApiError && err.is("csv-invalido")) {
        toast.error(err.problem.detail ?? "El archivo CSV no es válido");
      } else {
        toast.error("Error al validar el archivo");
      }
    }
  };

  const handleImportar = async () => {
    if (!archivo) return;
    const formData = new FormData();
    formData.append("archivo", archivo);
    try {
      const res = await importar.mutateAsync({ formData, soloValidar: false });
      toast.success(
        `${res.creados} creados, ${res.actualizados} actualizados${res.errores.length ? `, ${res.errores.length} errores` : ""}`,
      );
      onClose();
    } catch {
      toast.error("Error al importar");
    }
  };

  return (
    <Dialog open={abierto} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Importar insumos desde CSV</DialogTitle>
          <DialogDescription>
            Paso {paso + 1} de 3 — {PASOS[paso]}
          </DialogDescription>
        </DialogHeader>

        {paso === 0 && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Selecciona un archivo CSV con columnas: codigo, descripcion, tipo, unidad, precio.
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
              {resultado.errores.length > 0
                ? `${resultado.errores.length} filas con errores`
                : "Sin errores de validación"}
            </p>
            {resultado.errores.length > 0 && (
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
            )}
          </div>
        )}

        {paso === 2 && resultado && (
          <div className="space-y-4">
            <p className="text-sm">
              Se importarán {resultado.creados} nuevos y se actualizarán {resultado.actualizados}{" "}
              existentes.
            </p>
            {resultado.errores.length > 0 && (
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
            )}
          </div>
        )}

        <DialogFooter className="flex justify-between">
          {paso > 0 && (
            <Button variant="outline" onClick={() => setPaso((p) => p - 1)}>
              <ChevronLeftIcon /> Atrás
            </Button>
          )}
          {paso === 0 && (
            <Button onClick={() => setPaso(1)} disabled={!archivo}>
              Siguiente <ChevronRightIcon />
            </Button>
          )}
          {paso === 1 && (
            <Button onClick={handleValidar} disabled={importar.isPending}>
              {importar.isPending ? "Validando…" : "Validar"}
            </Button>
          )}
          {paso === 2 && (
            <Button onClick={handleImportar} disabled={importar.isPending}>
              {importar.isPending ? "Importando…" : "Confirmar importación"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
