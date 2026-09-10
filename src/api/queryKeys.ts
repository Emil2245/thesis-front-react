export const qk = {
  perfil: () => ["perfil"] as const,

  proyectos: (filtros?: Record<string, unknown>) => ["proyectos", filtros ?? {}] as const,
  proyecto: (id: string) => ["proyecto", id] as const,
  plantillasProyecto: () => ["plantillas-proyecto"] as const,
  parametrosProyecto: (id: string) => ["proyecto", id, "parametros"] as const,
  firmantes: (id: string) => ["proyecto", id, "firmantes"] as const,

  insumos: (proyectoId: string, filtros?: Record<string, unknown>) =>
    ["proyecto", proyectoId, "insumos", filtros ?? {}] as const,
  insumoUso: (proyectoId: string, insumoId: string) =>
    ["proyecto", proyectoId, "insumos", insumoId, "uso"] as const,
  basesCentrales: () => ["bases-centrales"] as const,
  adminBasesFamilia: () => ["admin", "bases-centrales"] as const,

  apus: (presupuestoId: string, filtros?: Record<string, unknown>) =>
    ["presupuesto", presupuestoId, "apus", filtros ?? {}] as const,
  apu: (apuId: string) => ["apu", apuId] as const,
  apuWorkspace: (presupuestoId: string, apuId: string) =>
    ["presupuesto", presupuestoId, "apu", apuId] as const,
  apuCalculo: (apuId: string) => ["apu", apuId, "calculo"] as const,
  apuEspecificacion: (apuId: string) => ["apu", apuId, "especificacion-tecnica"] as const,
  apuEspecificacionWorkspace: (presupuestoId: string, apuId: string) =>
    ["presupuesto", presupuestoId, "apu", apuId, "especificacion-tecnica"] as const,
  plantillas: (filtros?: Record<string, unknown>) => ["plantillas-apu", filtros ?? {}] as const,

  presupuesto: (presupuestoId: string) => ["presupuesto", presupuestoId] as const,
  presupuestoResumen: (id: string) => ["presupuesto", id, "resumen"] as const,
  presupuestoValidacion: (id: string) => ["presupuesto", id, "validacion"] as const,
  versiones: (proyectoId: string) => ["proyecto", proyectoId, "presupuestos"] as const,

  cronograma: (presupuestoId: string) => ["presupuesto", presupuestoId, "cronograma"] as const,

  // El `formato` va DENTRO de la clave: el preflight de `mspdi` puede traer un
  // bloqueo (`mspdi-fecha-inicio-requerida`) que el de `xlsx` no tiene, así que
  // compartir clave entre formatos mostraría bloqueos ajenos.
  cronogramaExportPreflight: (presupuestoId: string, formato: string) =>
    ["presupuesto", presupuestoId, "export-cronograma", formato] as const,

  // Solo quedan las dos con backend real (plan 050): usuarios, plantillas de
  // sistema, valores de referencia y logs no existen en origin/main.
  adminBases: (f?: Record<string, unknown>) => [...qk.adminBasesFamilia(), f ?? {}] as const,
  adminBase: (id: string) => [...qk.adminBasesFamilia(), id] as const,
  adminParametros: () => ["admin", "parametros-sistema"] as const,

  displayConfig: () => ["display-config"] as const,
} as const;
