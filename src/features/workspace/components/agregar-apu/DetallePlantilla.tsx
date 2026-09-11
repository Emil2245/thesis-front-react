import type { PlantillaApuDetalleResponse, SeccionTipo } from "@/api/contract";

const SECCIONES: SeccionTipo[] = ["EQUIPO", "MANO_OBRA", "MATERIAL", "TRANSPORTE"];

const TITULOS_SECCION: Record<SeccionTipo, string> = {
  EQUIPO: "Equipos (M)",
  MANO_OBRA: "Mano de obra (N)",
  MATERIAL: "Materiales (O)",
  TRANSPORTE: "Transporte (P)",
};

interface DetallePlantillaProps {
  detalle?: PlantillaApuDetalleResponse;
  cargando: boolean;
  error: boolean;
  hayActiva: boolean;
}

export function DetallePlantilla({ detalle, cargando, error, hayActiva }: DetallePlantillaProps) {
  return (
    <section
      aria-label="Detalle de plantilla"
      aria-live="polite"
      aria-busy={cargando}
      className="min-h-48 overflow-y-auto rounded-lg border p-4 md:max-h-[26rem]"
    >
      {!hayActiva ? (
        <p className="grid min-h-40 place-items-center text-center text-sm text-muted-foreground">
          Selecciona una fila para revisar su detalle.
        </p>
      ) : cargando ? (
        <p className="grid min-h-40 place-items-center text-sm text-muted-foreground">
          Cargando detalle…
        </p>
      ) : error ? (
        <p
          role="alert"
          className="grid min-h-40 place-items-center text-center text-sm text-destructive"
        >
          No se pudo cargar el detalle de la plantilla.
        </p>
      ) : detalle ? (
        <div className="space-y-4">
          <header className="space-y-1">
            <h3 className="text-base font-semibold">{detalle.nombre}</h3>
            <p className="text-xs text-muted-foreground">
              {detalle.tipo === "SISTEMA" ? "Sistema" : "Personal"}
              {detalle.unidad ? ` · ${detalle.unidad}` : ""}
            </p>
            {detalle.descripcionRubro ? <p>{detalle.descripcionRubro}</p> : null}
          </header>

          {SECCIONES.map((tipo) => {
            const seccion = detalle.snapshotSecciones.secciones.find(
              (candidata) => candidata.tipo === tipo,
            );
            const lineas = seccion?.lineas ?? [];
            return (
              <section key={tipo} aria-labelledby={`seccion-${tipo}`}>
                <h4 id={`seccion-${tipo}`} className="mb-2 text-sm font-semibold">
                  {TITULOS_SECCION[tipo]}
                </h4>
                {lineas.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Sin filas</p>
                ) : (
                  <ul className="space-y-2">
                    {lineas.map((linea, indice) => (
                      <li
                        key={`${linea.insumoCodigo ?? "hm"}-${indice}`}
                        className="rounded-md bg-muted/60 p-2"
                      >
                        <span className="block font-mono text-xs font-medium">
                          {linea.esHerramientaMenor
                            ? "Herramienta menor"
                            : (linea.insumoCodigo ?? "Sin código")}
                        </span>
                        <span className="mt-1 block text-xs text-muted-foreground">
                          {linea.cantidad !== undefined
                            ? `Cantidad: ${String(linea.cantidad)}`
                            : ""}
                          {linea.cantidad !== undefined && linea.rendimiento !== undefined
                            ? " · "
                            : ""}
                          {linea.rendimiento !== undefined
                            ? `Rendimiento: ${String(linea.rendimiento)}`
                            : ""}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            );
          })}
        </div>
      ) : null}
    </section>
  );
}
