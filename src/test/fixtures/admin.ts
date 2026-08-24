import type {
  UsuarioAdminResponse,
  ParametrosSistemaResponse,
  ValorReferenciaResponse,
  LogActividadResponse,
  BaseInsumosResponse,
} from "@/api/contract";

export const usuariosAdminFixture: UsuarioAdminResponse[] = [
  {
    id: 1,
    nombre: "Admin Principal",
    email: "admin@test.com",
    rol: "SUPER_ADMIN",
    activo: true,
    emailVerificado: true,
    fechaCreacion: "2026-01-01T00:00:00",
  },
  {
    id: 2,
    nombre: "Usuario Normal",
    email: "user@test.com",
    rol: "USUARIO",
    activo: true,
    emailVerificado: true,
    fechaCreacion: "2026-02-15T00:00:00",
  },
  {
    id: 3,
    nombre: "Inactivo",
    email: "inactivo@test.com",
    rol: "USUARIO",
    activo: false,
    emailVerificado: false,
    fechaCreacion: "2026-03-01T00:00:00",
  },
];

export const parametrosSistemaFixture: ParametrosSistemaResponse = {
  porcentajeHerramientaMenor: "0.050000" as never,
  porcentajeIndirecto: "0.150000" as never,
  iva: "0.120000" as never,
  moneda: "USD",
};

export const valoresReferenciaFixture: ValorReferenciaResponse[] = [
  {
    clave: "HM_PCT",
    valor: "5.00",
    descripcion: "Porcentaje herramienta menor",
    fuente: "sistema",
  },
  { clave: "IVA", valor: "12.00", descripcion: "IVA", fuente: "sistema" },
  {
    clave: "CI_MAX",
    valor: "25.00",
    descripcion: "Porcentaje máximo de costos indirectos",
    fuente: "sistema",
  },
];

export const logsFixture: LogActividadResponse[] = [
  {
    id: 1,
    usuarioId: 1,
    usuarioNombre: "Admin Principal",
    evento: "USUARIO_INICIO_SESION",
    detalle: {},
    fecha: "2026-07-20T10:00:00",
  },
  {
    id: 2,
    usuarioId: 2,
    usuarioNombre: "Usuario Normal",
    evento: "PROYECTO_CREADO",
    detalle: { proyectoId: 1 },
    fecha: "2026-07-20T11:00:00",
  },
  {
    id: 3,
    usuarioId: 1,
    usuarioNombre: "Admin Principal",
    evento: "PARAMETROS_ACTUALIZADOS",
    detalle: {},
    fecha: "2026-07-21T08:00:00",
  },
];

export const basesCentralesFixtureAdmin: BaseInsumosResponse[] = [
  { id: 1, nombre: "Base Cámara 2026", tipo: "CENTRAL", archivada: false, totalInsumos: 150 },
  { id: 2, nombre: "Base MOP 2025", tipo: "CENTRAL", archivada: false, totalInsumos: 300 },
];

export const plantillasSistemaFixture = [
  {
    id: 1,
    nombre: "APU Tipo A",
    descripcion: "Plantilla base para movimientos de tierra",
    tipo: "SISTEMA" as const,
    fechaCreacion: "2026-04-01T00:00:00",
  },
  {
    id: 2,
    nombre: "APU Tipo B",
    descripcion: "Plantilla base para estructuras",
    tipo: "SISTEMA" as const,
    fechaCreacion: "2026-04-15T00:00:00",
  },
];
