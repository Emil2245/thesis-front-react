import type {
  ParametrosSistemaResponse,
  BaseInsumosResponse,
  UsuarioAdminResponse,
  PlantillaApuAdminResponse,
  ValorReferenciaResponse,
  LogActividadResponse,
} from "@/api/contract";

// Los `as never` se fueron con la política de dinero: el backend serializa
// estos BigDecimal como número JSON (plan 061 + 050).
export const parametrosSistemaFixture: ParametrosSistemaResponse = {
  porcentajeHerramientaMenor: 0.05,
  porcentajeIndirecto: 0.15,
  iva: 0.12,
  moneda: "USD",
  rangoHmMin: 0,
  rangoHmMax: 0.2,
  rangoCiMin: 0,
  rangoCiMax: 1,
  rangoDescuentoMin: 0,
  rangoDescuentoMax: 0.5,
  rangoIvaMin: 0,
  rangoIvaMax: 0.3,
};

// `GET /admin/bases-centrales` devuelve una lista pelada, no una `Page<T>`:
// se sirve tal cual, sin envolver en `pagina()`. La tercera entra archivada
// para que el filtro `?incluirArchivadas` tenga algo que filtrar.
export const basesCentralesFixtureAdmin: BaseInsumosResponse[] = [
  {
    id: "018f8a30-0000-7000-8000-000000000001",
    nombre: "Base Cámara 2026",
    tipo: "CENTRAL",
    archivada: false,
    totalInsumos: 150,
  },
  {
    id: "018f8a30-0000-7000-8000-000000000002",
    nombre: "Base MOP 2025",
    tipo: "CENTRAL",
    archivada: false,
    totalInsumos: 300,
  },
  {
    id: "018f8a30-0000-7000-8000-000000000003",
    nombre: "Base Vieja 2019",
    tipo: "CENTRAL",
    archivada: true,
    totalInsumos: 42,
  },
];

// `GET /admin/usuarios` — `Page<UsuarioAdminResponse>`. Un SUPER_ADMIN, un
// USUARIO activo y un USUARIO inactivo, para tener algo que reactivar sin
// mutar el fixture en el propio test.
export const usuariosAdminFixture: UsuarioAdminResponse[] = [
  {
    id: "018f8a40-0000-7000-8000-000000000101",
    nombre: "Ana de Armas",
    email: "ana.armas@gmail.com",
    rol: "SUPER_ADMIN",
    activo: true,
    emailVerificado: true,
    fechaCreacion: "2026-01-10T12:00:00Z",
  },
  {
    id: "018f8a40-0000-7000-8000-000000000102",
    nombre: "John Doe",
    email: "john.doe@uce.edu.ec",
    rol: "USUARIO",
    activo: true,
    emailVerificado: true,
    fechaCreacion: "2026-02-15T09:30:00Z",
  },
  {
    id: "018f8a40-0000-7000-8000-000000000103",
    nombre: "Usuario Inactivo",
    email: "inactivo@example.com",
    rol: "USUARIO",
    activo: false,
    emailVerificado: false,
    fechaCreacion: "2026-03-01T08:00:00Z",
  },
];

// `GET /admin/plantillas-apu` — `Page<PlantillaApuAdminResponse>`, sólo
// SISTEMA. `usuarioId` es siempre `null` explícito (Patrón C, §5 del plan
// 078): la segunda entra con `descripcionRubro: null` para probar lo mismo en
// ese campo, que el alta no exige.
export const plantillasAdminFixture: PlantillaApuAdminResponse[] = [
  {
    id: "0192f6c4-7c8a-7abc-8000-000000002001",
    nombre: "Retiro de pisos de porcelanato/cerámica (Sistema)",
    tipo: "SISTEMA",
    usuarioId: null,
    descripcionRubro: "Retiro de pisos de porcelanato/cerámica",
    fechaCreacion: "2026-09-10T03:56:41.070085Z",
  },
  {
    id: "0192f6c4-7c8a-7abc-8000-000000002002",
    nombre: "Contrapiso de hormigón simple (Sistema)",
    tipo: "SISTEMA",
    usuarioId: null,
    descripcionRubro: null,
    fechaCreacion: "2026-09-08T10:00:00.000000Z",
  },
];

// `GET /admin/valores-referencia` — `Page<ValorReferenciaResponse>`. Las
// cuatro claves sembradas en el backend real (curl, 2026-09-10). `valor` es
// `string`: un decimal de sólo lectura (ADR 9), nunca `number`.
export const valoresReferenciaFixture: ValorReferenciaResponse[] = [
  {
    clave: "SBU",
    valor: "450.00",
    descripcion: "Salario básico unificado",
    fuente: "MDT 2026",
    actualizado: "2026-09-10T03:56:41.070085Z",
  },
  {
    clave: "APORTE_PATRONAL",
    valor: "12.15",
    descripcion: "Aporte patronal IESS %",
    fuente: "IESS 2023",
    actualizado: "2026-09-10T03:56:41.070085Z",
  },
  {
    clave: "FAS",
    valor: "1.538",
    descripcion: "Fondo de reserva y aportes sociales",
    fuente: "IESS 2023",
    actualizado: "2026-09-10T03:56:41.070085Z",
  },
  {
    clave: "HORAS_OPERACION_ANUAL",
    valor: "1800",
    descripcion: "Horas de operación anual de equipo",
    fuente: "MOP 2025",
    actualizado: "2026-09-10T03:56:41.070085Z",
  },
];

// `GET /admin/logs` — `Page<LogActividadResponse>`. Forma real capturada por
// `curl` el 2026-09-10 (plan 080 §05). La primera entra con actor y
// `entidadId` null explícito (auth no tiene entidad propia); la segunda es un
// evento de sistema sin actor (`usuarioId`/`usuarioNombre` null explícito) con
// `entidadId` presente, para ejercer las dos caras del Patrón C invertido.
export const logsActividadFixture: LogActividadResponse[] = [
  {
    id: "01a08a31-06af-7c01-95a2-4636dbbc66da",
    usuarioId: "0192f6c4-7c8a-7abc-8000-000000001002",
    usuarioNombre: "Ana de Armas",
    evento: "auth.login",
    entidad: "auth",
    entidadId: null,
    detalle: { resultado: "ok" },
    fecha: "2026-09-10T07:21:03.680815Z",
  },
  {
    id: "01a08a2f-9911-7c01-95a2-4636dbbc66d1",
    usuarioId: null,
    usuarioNombre: null,
    evento: "proyecto.creado",
    entidad: "proyecto",
    entidadId: "018f8a30-0000-7000-8000-000000000099",
    detalle: { origen: "plantilla" },
    fecha: "2026-09-09T12:00:00.000000Z",
  },
];
