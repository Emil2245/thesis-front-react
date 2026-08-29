import { describe, expect, it } from "vitest";
import { renderConProviders } from "@/test/render";
import { screen, waitFor } from "@testing-library/react";
import { AdminBasesPage } from "@/features/admin/pages/AdminBasesPage";

describe("AdminBasesPage", () => {
  it("explica que el módulo todavía no está disponible, sin pedir las bases al backend", async () => {
    // El backend no tiene /admin/bases (plan 027). MSW está configurado con
    // onUnhandledRequest: "error": si esta pantalla llamara al hook real, el
    // test fallaría por la petición no mockeada.
    renderConProviders(<AdminBasesPage />);

    expect(screen.getByText("Bases de insumos")).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText(/todavía no está disponible/i)).toBeInTheDocument();
    });
  });
});
