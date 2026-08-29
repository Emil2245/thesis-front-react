export const qk = {
  perfil: () => ["perfil"] as const,

  proyectos: (filtros?: Record<string, unknown>) => ["proyectos", filtros ?? {}] as const,
  proyecto: (id: number) => ["proyecto", id] as const,
  parametrosProyecto: (id: number) => ["proyecto", id, "parametros"] as const,
  firmantes: (id: number) => ["proyecto", id, "firmantes"] as const,

  insumos: (proyectoId: number, filtros?: Record<string, unknown>) =>
    ["proyecto", proyectoId, "insumos", filtros ?? {}] as const,
  insumoUso: (proyectoId: number, insumoId: number) =>
    ["proyecto", proyectoId, "insumos", insumoId, "uso"] as const,
  basesCentrales: () => ["bases-centrales"] as const,

  apus: (presupuestoId: number, filtros?: Record<string, unknown>) =>
    ["presupuesto", presupuestoId, "apus", filtros ?? {}] as const,
  apu: (apuId: number) => ["apu", apuId] as const,
  apuCalculo: (apuId: number) => ["apu", apuId, "calculo"] as const,
  plantillas: (filtros?: Record<string, unknown>) => ["plantillas-apu", filtros ?? {}] as const,

  presupuesto: (presupuestoId: number) => ["presupuesto", presupuestoId] as const,
  presupuestoResumen: (id: number) => ["presupuesto", id, "resumen"] as const,
  presupuestoValidacion: (id: number) => ["presupuesto", id, "validacion"] as const,
  versiones: (proyectoId: number) => ["proyecto", proyectoId, "presupuestos"] as const,

  cronograma: (presupuestoId: number) => ["presupuesto", presupuestoId, "cronograma"] as const,

  adminUsuarios: (f?: Record<string, unknown>) => ["admin", "usuarios", f ?? {}] as const,
  adminBases: (f?: Record<string, unknown>) => ["admin", "bases", f ?? {}] as const,
  adminPlantillas: () => ["admin", "plantillas"] as const,
  adminParametros: () => ["admin", "parametros-sistema"] as const,
  adminValores: () => ["admin", "valores-referencia"] as const,
  adminLogs: (f?: Record<string, unknown>) => ["admin", "logs", f ?? {}] as const,

  displayConfig: () => ["display-config"] as const,
} as const;
