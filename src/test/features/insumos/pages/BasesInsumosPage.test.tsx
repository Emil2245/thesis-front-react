import { describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import { Route, Routes } from "react-router-dom";
import { renderConProviders } from "@/test/render";
import { espiar, ultima } from "@/test/espia";
import { BasesInsumosPage } from "@/features/insumos/pages/BasesInsumosPage";
import { BasePersonalPage, BaseSistemaPage } from "@/features/insumos/pages/BaseInsumosPage";
import { DialogoCopiarBase } from "@/features/insumos/components/DialogoCopiarBase";
import {
  basesCentralesFixture,
  basesPersonalesFixture,
  insumosFixture,
} from "@/test/fixtures/insumos";

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const personal = basesPersonalesFixture[0];
const central = basesCentralesFixture[0];

// bugs-pendientes §5 — sección global de insumos. Lo que se fija es lo que
// puede romper datos: a qué base escribe cada pantalla y que la de sistema no
// ofrezca escribir.
describe("sección global de insumos", () => {
  it("lista bases del sistema y, en su pestaña, las personales", async () => {
    const { user } = renderConProviders(<BasesInsumosPage />);

    expect(await screen.findByText(central.nombre)).toBeInTheDocument();
    await user.click(screen.getByRole("tab", { name: "Personales" }));
    expect(await screen.findByText(personal.nombre)).toBeInTheDocument();
  });

  it("crea una base personal con POST /bases-personales y sólo el nombre", async () => {
    const peticiones = espiar();
    const { user } = renderConProviders(<BasesInsumosPage />);

    await user.click(screen.getByRole("button", { name: /Nueva base personal/ }));
    await user.type(screen.getByLabelText(/Nombre/), "Precios Cuenca");
    await user.click(screen.getByRole("button", { name: "Crear base" }));

    await waitFor(() => {
      expect(ultima(peticiones, "POST", "/bases-personales")?.cuerpo).toEqual({
        nombre: "Precios Cuenca",
      });
    });
  });

  it("la base del sistema se lee de /bases-centrales/{id}/insumos y no ofrece escribir", async () => {
    const peticiones = espiar();
    renderConProviders(
      <Routes>
        <Route path="/insumos/sistema/:baseId" element={<BaseSistemaPage />} />
      </Routes>,
      { ruta: `/insumos/sistema/${central.id}` },
    );

    expect(await screen.findByText(insumosFixture[0].descripcion)).toBeInTheDocument();
    expect(ultima(peticiones, "GET", `/bases-centrales/${central.id}/insumos`)).toBeDefined();
    expect(screen.queryByRole("button", { name: "Nuevo" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Importar CSV/ })).not.toBeInTheDocument();
  });

  it("da de alta en la base personal contra /bases-personales/{id}/insumos", async () => {
    const peticiones = espiar();
    const { user } = renderConProviders(
      <Routes>
        <Route path="/insumos/personales/:baseId" element={<BasePersonalPage />} />
      </Routes>,
      { ruta: `/insumos/personales/${personal.id}` },
    );

    await screen.findByText(insumosFixture[0].descripcion);
    await user.click(screen.getByRole("button", { name: "Nuevo" }));
    await user.type(screen.getByLabelText(/Código/i), "M-9");
    await user.type(screen.getByLabelText(/Descripción/i), "Pintura blanca");
    await user.type(screen.getByPlaceholderText(/unidad personalizada/i), "gl");
    await user.type(screen.getByLabelText(/Precio unitario/i), "12.5");
    await user.click(screen.getByRole("button", { name: "Crear insumo" }));

    await waitFor(() => {
      expect(ultima(peticiones, "POST", `/bases-personales/${personal.id}/insumos`)?.ruta).toBe(
        `/api/v1/bases-personales/${personal.id}/insumos`,
      );
    });
  });

  // «Copiar base» sigue siendo la puerta para poblar el proyecto: una base
  // personal tiene que viajar como `PERSONAL`, no como `CENTRAL` (sería 404).
  it("copiar una base personal al proyecto manda fuenteTipo PERSONAL", async () => {
    const peticiones = espiar();
    const proyectoId = "01927f4e-1a2b-7c3d-8e4f-000000000001";
    const { user } = renderConProviders(
      <DialogoCopiarBase abierto onClose={() => {}} proyectoId={proyectoId} />,
    );

    await user.click(screen.getByRole("combobox", { name: "Base de origen" }));
    await user.click(await screen.findByRole("option", { name: new RegExp(personal.nombre) }));
    await user.click(screen.getByRole("button", { name: "Copiar" }));

    await waitFor(() => {
      expect(ultima(peticiones, "POST", `/proyectos/${proyectoId}/insumos/copiar`)?.cuerpo).toEqual(
        { fuenteTipo: "PERSONAL", baseId: personal.id },
      );
    });
  });
});
