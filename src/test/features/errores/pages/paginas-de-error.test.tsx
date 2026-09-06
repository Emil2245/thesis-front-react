import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { ErrorPage } from "@/features/errores/pages/ErrorPage";
import { NoEncontradaPage } from "@/features/errores/pages/NoEncontradaPage";
import { SinPermisoPage } from "@/features/errores/pages/SinPermisoPage";
import { renderConProviders } from "@/test/render";

// P-44 / US-04: los tres estados de error tienen que llevar de vuelta a
// /proyectos, y ErrorPage tiene que distinguir 404 de 403 de lo demás.

function renderConError(status: number) {
  const router = createMemoryRouter([
    {
      path: "/",
      element: <div />,
      loader: () => {
        throw new Response("", { status });
      },
      errorElement: <ErrorPage />,
    },
  ]);
  return render(<RouterProvider router={router} />);
}

describe("ErrorPage", () => {
  it("distingue el 404 y ofrece la vuelta a proyectos", async () => {
    renderConError(404);
    expect(await screen.findByRole("heading", { name: "404" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /volver a mis proyectos/i })).toHaveAttribute(
      "href",
      "/proyectos",
    );
  });

  it("distingue el 403", async () => {
    renderConError(403);
    expect(await screen.findByRole("heading", { name: "403" })).toBeInTheDocument();
    expect(screen.getByText(/no tienes permiso/i)).toBeInTheDocument();
  });

  it("ante un error inesperado ofrece reintentar, no una vuelta a proyectos", async () => {
    renderConError(500);
    expect(await screen.findByRole("heading", { name: "Error" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /reintentar/i })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /volver a mis proyectos/i })).toBeNull();
  });
});

describe("NoEncontradaPage", () => {
  it("pinta el 404 con enlace a proyectos", () => {
    renderConProviders(<NoEncontradaPage />);
    expect(screen.getByRole("heading", { name: "404" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /volver a mis proyectos/i })).toHaveAttribute(
      "href",
      "/proyectos",
    );
  });
});

describe("SinPermisoPage", () => {
  it("pinta el 403 con enlace a proyectos", () => {
    renderConProviders(<SinPermisoPage />);
    expect(screen.getByRole("heading", { name: "403" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /volver a mis proyectos/i })).toHaveAttribute(
      "href",
      "/proyectos",
    );
  });
});
