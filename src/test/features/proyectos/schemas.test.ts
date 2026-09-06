import { describe, expect, it } from "vitest";
import {
  parametrosSchema,
  descuentoSchema,
  firmanteSchema,
  proyectoSchema,
  crearParametrosSchema,
  crearDescuentoSchema,
} from "@/features/proyectos/schemas";

// Plan 059 §10: en main, ProyectoCrearRequest tiene @NotNull en anio,
// plazoEjecucion y plazoUnidad, y @NotBlank en nombreProyecto y
// direccionInstitucional. El formulario los daba por opcionales, así que dejaba
// enviar un cuerpo que el backend rechaza.
describe("proyectoSchema", () => {
  const completo = {
    nombreProyecto: "Obra de alcantarillado",
    anio: 2026,
    plazoEjecucion: 12,
    plazoUnidad: "MES" as const,
    direccionInstitucional: "Dirección de Obras Públicas",
  };

  it("acepta un proyecto con todos los campos obligatorios", () => {
    expect(proyectoSchema.safeParse(completo).success).toBe(true);
  });

  it.each(["anio", "plazoEjecucion", "plazoUnidad", "direccionInstitucional"] as const)(
    "rechaza un proyecto sin %s",
    (campo) => {
      const { [campo]: _omitido, ...parcial } = completo;
      expect(proyectoSchema.safeParse(parcial).success).toBe(false);
    },
  );

  it("rechaza direccionInstitucional en blanco", () => {
    expect(proyectoSchema.safeParse({ ...completo, direccionInstitucional: "" }).success).toBe(
      false,
    );
  });
});

describe("parametrosSchema", () => {
  it("rechaza %HM > 20", () => {
    const r = parametrosSchema.safeParse({
      porcentajeHerramientaMenor: 21,
      porcentajeIndirecto: 10,
      iva: 12,
      moneda: "USD",
      mostrarSeccionesVacias: false,
      sufijosSeccionActivos: false,
      mostrarSubtotalesSeccion: false,
      mostrarSubtotalesPie: false,
      mostrarNombreProyectoHeader: false,
      enumerarApus: false,
      modoCodigoRubro: "AUTOGENERADO",
    });
    expect(r.success).toBe(false);
  });

  it("acepta %HM = 20", () => {
    const r = parametrosSchema.safeParse({
      porcentajeHerramientaMenor: 20,
      porcentajeIndirecto: 10,
      iva: 12,
      moneda: "USD",
      mostrarSeccionesVacias: false,
      sufijosSeccionActivos: false,
      mostrarSubtotalesSeccion: false,
      mostrarSubtotalesPie: false,
      mostrarNombreProyectoHeader: false,
      enumerarApus: false,
      modoCodigoRubro: "AUTOGENERADO",
    });
    expect(r.success).toBe(true);
  });

  it("rechaza %HM = -1", () => {
    const r = parametrosSchema.safeParse({
      porcentajeHerramientaMenor: -1,
      porcentajeIndirecto: 10,
      iva: 12,
      moneda: "USD",
      mostrarSeccionesVacias: false,
      sufijosSeccionActivos: false,
      mostrarSubtotalesSeccion: false,
      mostrarSubtotalesPie: false,
      mostrarNombreProyectoHeader: false,
      enumerarApus: false,
      modoCodigoRubro: "AUTOGENERADO",
    });
    expect(r.success).toBe(false);
  });

  it("rechaza %CI = 101", () => {
    const r = parametrosSchema.safeParse({
      porcentajeHerramientaMenor: 5,
      porcentajeIndirecto: 101,
      iva: 12,
      moneda: "USD",
      mostrarSeccionesVacias: false,
      sufijosSeccionActivos: false,
      mostrarSubtotalesSeccion: false,
      mostrarSubtotalesPie: false,
      mostrarNombreProyectoHeader: false,
      enumerarApus: false,
      modoCodigoRubro: "AUTOGENERADO",
    });
    expect(r.success).toBe(false);
  });

  it("rechaza IVA = 31", () => {
    const r = parametrosSchema.safeParse({
      porcentajeHerramientaMenor: 5,
      porcentajeIndirecto: 10,
      iva: 31,
      moneda: "USD",
      mostrarSeccionesVacias: false,
      sufijosSeccionActivos: false,
      mostrarSubtotalesSeccion: false,
      mostrarSubtotalesPie: false,
      mostrarNombreProyectoHeader: false,
      enumerarApus: false,
      modoCodigoRubro: "AUTOGENERADO",
    });
    expect(r.success).toBe(false);
  });

  it("convierte 5 %HM a fracción numérica 0.05", () => {
    const r = parametrosSchema.safeParse({
      porcentajeHerramientaMenor: 5,
      porcentajeIndirecto: 10,
      iva: 12,
      moneda: "USD",
      mostrarSeccionesVacias: false,
      sufijosSeccionActivos: false,
      mostrarSubtotalesSeccion: false,
      mostrarSubtotalesPie: false,
      mostrarNombreProyectoHeader: false,
      enumerarApus: false,
      modoCodigoRubro: "AUTOGENERADO",
    });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.porcentajeHerramientaMenor).toBe(0.05);
    }
  });
});

describe("descuentoSchema", () => {
  it("rechaza 51 %", () => {
    const r = descuentoSchema.safeParse({ porcentaje: 51 });
    expect(r.success).toBe(false);
  });

  it("acepta 50 %", () => {
    const r = descuentoSchema.safeParse({ porcentaje: 50 });
    expect(r.success).toBe(true);
  });

  it("acepta 0 % (reversión)", () => {
    const r = descuentoSchema.safeParse({ porcentaje: 0 });
    expect(r.success).toBe(true);
  });
});

describe("crearParametrosSchema con rangos custom", () => {
  const schema = crearParametrosSchema({ hmMax: 10, ciMax: 50, ivaMax: 15, descuentoMax: 25 });
  const base = {
    porcentajeIndirecto: 5,
    iva: 10,
    moneda: "USD",
    mostrarSeccionesVacias: false,
    sufijosSeccionActivos: false,
    mostrarSubtotalesSeccion: false,
    mostrarSubtotalesPie: false,
    mostrarNombreProyectoHeader: false,
    enumerarApus: false,
    modoCodigoRubro: "AUTOGENERADO" as const,
  };

  it("rechaza %HM > hmMax custom", () => {
    expect(schema.safeParse({ ...base, porcentajeHerramientaMenor: 11 }).success).toBe(false);
  });

  it("acepta %HM = hmMax custom", () => {
    expect(schema.safeParse({ ...base, porcentajeHerramientaMenor: 10 }).success).toBe(true);
  });
});

describe("crearDescuentoSchema con max custom", () => {
  const schema = crearDescuentoSchema(25);

  it("rechaza > max custom", () => {
    expect(schema.safeParse({ porcentaje: 26 }).success).toBe(false);
  });

  it("acepta = max custom", () => {
    expect(schema.safeParse({ porcentaje: 25 }).success).toBe(true);
  });
});

describe("firmanteSchema", () => {
  it("rechaza nombre vacío", () => {
    const r = firmanteSchema.safeParse({
      nombre: "",
      cargo: "Director",
      rol: "CONSOLIDADO",
      orden: 1,
    });
    expect(r.success).toBe(false);
  });

  it("acepta datos válidos", () => {
    const r = firmanteSchema.safeParse({
      nombre: "Ing. Juan",
      cargo: "Director",
      rol: "APROBADO",
      orden: 2,
    });
    expect(r.success).toBe(true);
  });
});
