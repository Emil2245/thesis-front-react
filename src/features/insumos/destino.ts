import { qk } from "@/api/queryKeys";

/**
 * A dónde escribe el CRUD de insumos. El catálogo de un proyecto y una base
 * central comparten DTOs, validación y servicios en el backend —
 * `AdminBaseCentralResource` reusa `InsumoCrudService` e
 * `ImportacionInsumoService` — así que en el frontend comparten también los
 * componentes: `DialogoInsumo` y `AsistenteImportCsv` reciben un destino en vez
 * de un `proyectoId`, y no se duplican.
 *
 * `import` va aparte a propósito: la ruta del proyecto termina en `/importar`
 * y la de admin en `/import`. Derivarla de un prefijo común mandaría la
 * importación de admin a un 404.
 */
export type DestinoInsumos = {
  /** Colección de insumos: alta en POST, `{ruta}/{id}` en PUT y DELETE. */
  ruta: string;
  /** Endpoint de importación CSV multipart. */
  rutaImport: string;
  /** Query key a invalidar cuando el destino cambia. */
  clave: readonly unknown[];
};

export const destinoProyecto = (proyectoId: string): DestinoInsumos => ({
  ruta: `/proyectos/${proyectoId}/insumos`,
  rutaImport: `/proyectos/${proyectoId}/insumos/importar`,
  clave: qk.insumos(proyectoId),
});

export const destinoBaseCentral = (baseId: string): DestinoInsumos => ({
  ruta: `/admin/bases-centrales/${baseId}/insumos`,
  rutaImport: `/admin/bases-centrales/${baseId}/insumos/import`,
  // No hay listado de insumos de una base central que invalidar; lo que sí
  // cambia es el `totalInsumos` del listado de bases.
  clave: qk.adminBasesFamilia(),
});
