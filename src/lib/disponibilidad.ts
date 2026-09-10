/**
 * Módulos que esta UI todavía no puede usar contra el backend real. Verificado
 * en ../thesis-back-quarkus @ origin/main: 30 recursos JAX-RS, con presupuesto,
 * cronograma, plantillas de APU, plantillas de proyecto y admin de bases
 * centrales presentes. Quitar uno de este conjunto es lo único que hace falta
 * para encenderlo.
 *
 * Vacío desde el plan 081: las últimas cuatro claves («admin-usuarios»,
 * «admin-plantillas», «admin-valores», «admin-logs») cerraban el gate de las
 * pantallas de administración construidas por los planes 077–080. Sus cuatro
 * backends (`UsuarioAdminResource`, `PlantillaApuAdminResource`,
 * `ValorReferenciaAdminResource`, `LogActividadResource`) ya existen y las
 * cuatro `AdminXPageActiva` ya los consumían; sólo faltaba retirar la clave.
 * El tipo y el `Set` se conservan vacíos —no se borran— porque el patrón de
 * degradación por página (plan 050) sigue documentado en `AGENTS.md` y volverá
 * a hacer falta la próxima vez que un módulo se adelante a su backend.
 */
export const MODULOS_SIN_BACKEND = new Set([] as const);

export type ModuloSinBackend = typeof MODULOS_SIN_BACKEND extends Set<infer T> ? T : never;

export const MOTIVO_SIN_BACKEND = "Disponible cuando el backend implemente esta operación.";
