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
  cronogramaVistas: (cronogramaId: string) => ["cronograma", cronogramaId, "vistas"] as const,

  // El `formato` va DENTRO de la clave: el preflight de `mspdi` puede traer un
  // bloqueo (`mspdi-fecha-inicio-requerida`) que el de `xlsx` no tiene, así que
  // compartir clave entre formatos mostraría bloqueos ajenos.
  cronogramaExportPreflight: (presupuestoId: string, formato: string) =>
    ["presupuesto", presupuestoId, "export-cronograma", formato] as const,

  // Usuarios (077), plantillas de sistema (078), valores de referencia (079)
  // y logs de actividad (080) ya tienen backend real; sus gates siguen
  // cerrados en `MODULOS_SIN_BACKEND` hasta el 081.
  adminBases: (f?: Record<string, unknown>) => [...qk.adminBasesFamilia(), f ?? {}] as const,
  adminBase: (id: string) => [...qk.adminBasesFamilia(), id] as const,
  adminParametros: () => ["admin", "parametros-sistema"] as const,

  adminUsuariosFamilia: () => ["admin", "usuarios"] as const,
  adminUsuarios: (f?: Record<string, unknown>) => [...qk.adminUsuariosFamilia(), f ?? {}] as const,
  adminUsuario: (id: string) => [...qk.adminUsuariosFamilia(), id] as const,

  // Plantillas APU de sistema (plan 078): mismo molde que usuarios.
  adminPlantillasFamilia: () => ["admin", "plantillas-apu"] as const,
  adminPlantillas: (f?: Record<string, unknown>) =>
    [...qk.adminPlantillasFamilia(), f ?? {}] as const,
  adminPlantilla: (id: string) => [...qk.adminPlantillasFamilia(), id] as const,

  // Valores de referencia (plan 079): mismo molde que plantillas. Sin `q`: el
  // recurso sólo admite `page`/`size`.
  adminValoresFamilia: () => ["admin", "valores-referencia"] as const,
  adminValores: (f?: Record<string, unknown>) => [...qk.adminValoresFamilia(), f ?? {}] as const,
  adminValor: (clave: string) => [...qk.adminValoresFamilia(), clave] as const,

  // Logs de actividad (plan 080): sólo lectura, sin mutaciones que invaliden
  // la familia — se mantiene por simetría con el resto de recursos admin.
  adminLogsFamilia: () => ["admin", "logs"] as const,
  adminLogs: (f?: Record<string, unknown>) => [...qk.adminLogsFamilia(), f ?? {}] as const,

  displayConfig: () => ["display-config"] as const,
} as const;
