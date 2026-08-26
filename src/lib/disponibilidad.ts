/**
 * Módulos cuyo backend todavía no existe (verificado en ../thesis-back-quarkus:
 * nueve recursos JAX-RS, sin paquetes presupuesto/cronograma/export/plantilla/admin).
 * Cuando el backend implemente uno, basta con quitarlo de este conjunto.
 */
export const MODULOS_SIN_BACKEND = new Set([
  "presupuesto",
  "versiones",
  "documentos",
  "plantillas",
  "admin",
] as const);

export type ModuloSinBackend = typeof MODULOS_SIN_BACKEND extends Set<infer T> ? T : never;

export const MOTIVO_SIN_BACKEND = "Disponible cuando el backend implemente esta operación.";
