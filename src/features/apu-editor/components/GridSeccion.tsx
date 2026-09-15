import type { SeccionTipo } from "@/api/contract";
import type { SeccionEditor } from "../hooks/useApuEditor";
import { FilaDetalle } from "./FilaDetalle";
import { TarjetaTabla } from "@/components/comunes/TarjetaTabla";
import { Button } from "@/components/ui/button";
import { formatearMoneda } from "@/lib/decimal";
import { PlusIcon } from "lucide-react";

interface GridSeccionProps {
  seccion: SeccionEditor;
  onEditarCelda: (
    detalleId: string,
    campo: "cantidad" | "rendimiento" | "precioOverride",
    valor: string,
  ) => Promise<void>;
  onRestaurarHerencia: (detalleId: string) => Promise<void>;
  onEliminarFila: (detalleId: string) => Promise<void>;
  onReordenarFila: (detalleId: string, nuevoOrden: number) => Promise<void>;
  /** Plan 074 §2: abre el selector de insumo restringido al tipo de la sección. */
  onAgregarInsumo: (seccionTipo: SeccionTipo) => void;
}

export function GridSeccion({
  seccion,
  onEditarCelda,
  onRestaurarHerencia,
  onEliminarFila,
  onReordenarFila,
  onAgregarInsumo,
}: GridSeccionProps) {
  const vacia = seccion.filas.length === 0;

  return (
    <TarjetaTabla
      titulo={
        <span className="flex items-center gap-2">
          <span
            aria-hidden
            className="inline-flex size-4.5 items-center justify-center rounded-sm bg-muted text-[11px] font-semibold text-muted-foreground"
          >
            {seccion.bloque}
          </span>
          {seccion.etiqueta}
        </span>
      }
      accion={
        <div className="flex items-center gap-3">
          <span className="num text-sm text-muted-foreground">
            Subtotal {formatearMoneda(seccion.subtotal)}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onAgregarInsumo(seccion.tipo)}
            aria-label={`Agregar insumo a ${seccion.etiqueta}`}
          >
            <PlusIcon data-icon="inline-start" /> Agregar insumo
          </Button>
        </div>
      }
    >
      {vacia ? (
        <p className="px-4 py-6 text-center text-sm text-muted-foreground">
          Aún no has añadido insumos a esta sección.
        </p>
      ) : (
        <div className="w-full overflow-x-auto">
          <table className="w-full text-xs">
            <caption className="sr-only">Detalle de {seccion.etiqueta}</caption>
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th scope="col" className="h-8 px-2.5 font-medium">
                  Insumo
                </th>
                <th scope="col" className="h-8 w-14 px-2.5 font-medium">
                  U
                </th>
                <th scope="col" className="num h-8 w-24 px-2.5 font-medium">
                  Cantidad
                </th>
                {seccion.muestraRendimiento && (
                  <th scope="col" className="num h-8 w-28 px-2.5 font-medium">
                    Rendimiento
                  </th>
                )}
                {seccion.muestraRendimiento && (
                  <th scope="col" className="num h-8 w-28 px-2.5 font-medium">
                    Costo/hora
                  </th>
                )}
                {!seccion.muestraRendimiento && (
                  <th scope="col" className="num h-8 w-32 px-2.5 font-medium">
                    Precio
                  </th>
                )}
                <th scope="col" className="num h-8 w-28 px-2.5 font-medium">
                  Costo
                </th>
                <th scope="col" className="h-8 w-10 px-2.5">
                  <span className="sr-only">Acciones</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {seccion.filas.map((fila, indice) => (
                <FilaDetalle
                  key={fila.detalle.id}
                  fila={fila}
                  muestraRendimiento={seccion.muestraRendimiento}
                  onEditarCelda={onEditarCelda}
                  onRestaurarHerencia={onRestaurarHerencia}
                  onEliminarFila={onEliminarFila}
                  onReordenarFila={onReordenarFila}
                  seccionTipo={seccion.tipo}
                  indice={indice}
                  totalFilas={seccion.filas.length}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </TarjetaTabla>
  );
}
