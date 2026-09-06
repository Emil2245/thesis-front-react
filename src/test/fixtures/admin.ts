import type { ParametrosSistemaResponse, BaseInsumosResponse } from "@/api/contract";

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
