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
import { ApiError } from "@/api/problem";
import type { DestinoInsumos } from "../destino";

const PASOS = ["Seleccionar archivo", "Importar"];

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
        `${res.creados} creados, ${res.actualizados} actualizados${res.errores.length ? `, ${res.errores.length} errores` : ""}`,
      );
      if (res.errores.length > 0) {
        setResultado(res);
        setPaso(1);
      } else {
        onClose();
      }
    } catch (err) {
      if (err instanceof ApiError && err.is("csv-invalido")) {
        toast.error(err.problem.detail ?? "El archivo CSV no es válido");
      } else {
        toast.error("Error al importar");
      }
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
            <p className="text-sm text-muted-foreground">
              Selecciona un archivo CSV con columnas: codigo, descripcion, tipo, unidad,
              precioUnitario.
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
              Se importaron {resultado.creados} nuevos y se actualizaron {resultado.actualizados}{" "}
              existentes, con {resultado.errores.length} errores.
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
