import { qk } from "@/api/queryKeys";

/**
 * Sobre qué base trabaja el CRUD de insumos. El catálogo de un proyecto, una
 * base personal y una base central comparten DTOs, validación y servicios en el
 * backend —`BasesPersonalesResource` y `AdminBaseCentralResource` reusan
 * `InsumoCrudService` e `ImportacionInsumoService`— así que en el frontend
 * comparten también los componentes: `TablaInsumos`, `DialogoInsumo` y
 * `AsistenteImportCsv` reciben un destino en vez de un `proyectoId`, y no se
 * duplican.
 *
 * `rutaImport` va aparte a propósito: la ruta del proyecto y la personal
 * terminan en `/importar` y la de admin en `/import`. Derivarla de un prefijo
 * común mandaría la importación de admin a un 404. `rutaLista` también: la
 * lectura de una base central es `/bases-centrales/{id}/insumos` (cualquier
 * usuario) y la escritura `/admin/bases-centrales/{id}/insumos` (SUPER_ADMIN).
 */
export type DestinoInsumos = {
  /** Colección de insumos: alta en POST, `{ruta}/{id}` en PUT y DELETE. */
  ruta: string;
  /** Endpoint de importación CSV multipart. */
  rutaImport: string;
  /** `GET` paginado con los filtros `tipo`, `q`, `desactualizados` y `page`. */
  rutaLista: string;
  /** Query key del listado para unos filtros dados. */
  claveLista: (filtros?: Record<string, unknown>) => readonly unknown[];
  /** Query keys a invalidar cuando el destino cambia (listado y contadores). */
  invalidar: readonly (readonly unknown[])[];
};

export const destinoProyecto = (proyectoId: string): DestinoInsumos => ({
  ruta: `/proyectos/${proyectoId}/insumos`,
  rutaImport: `/proyectos/${proyectoId}/insumos/importar`,
  rutaLista: `/proyectos/${proyectoId}/insumos`,
  claveLista: (filtros) => qk.insumos(proyectoId, filtros),
  invalidar: [qk.insumos(proyectoId)],
});

export const destinoBasePersonal = (baseId: string): DestinoInsumos => ({
  ruta: `/bases-personales/${baseId}/insumos`,
  rutaImport: `/bases-personales/${baseId}/insumos/importar`,
  rutaLista: `/bases-personales/${baseId}/insumos`,
  claveLista: (filtros) => qk.insumosBasePersonal(baseId, filtros),
  // `totalInsumos` del listado de bases también cambia.
  invalidar: [qk.insumosBasePersonal(baseId), qk.basesPersonales()],
});

export const destinoBaseCentral = (baseId: string): DestinoInsumos => ({
  ruta: `/admin/bases-centrales/${baseId}/insumos`,
  rutaImport: `/admin/bases-centrales/${baseId}/insumos/import`,
  rutaLista: `/bases-centrales/${baseId}/insumos`,
  claveLista: (filtros) => qk.insumosBaseCentral(baseId, filtros),
  // Además del listado cambia el `totalInsumos` de los dos listados de bases.
  invalidar: [qk.insumosBaseCentral(baseId), qk.adminBasesFamilia(), qk.basesCentrales()],
});
