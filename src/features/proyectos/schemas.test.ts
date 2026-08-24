import { describe, expect, it } from "vitest";
import { parametrosSchema, descuentoSchema, firmanteSchema } from "./schemas";

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
