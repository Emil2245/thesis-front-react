import { describe, expect, it, beforeEach } from "vitest";
import { renderConProviders } from "@/test/render";
import { screen } from "@testing-library/react";
import { Route, Routes } from "react-router-dom";
import { RutaPrivada, RutaAdmin } from "./Guards";
import { useSesionStore } from "@/features/auth/sesion";
import { usuarioFixture, adminFixture } from "@/test/fixtures/auth";

describe("RutaPrivada", () => {
  beforeEach(() => {
    useSesionStore.setState({ usuario: null, cargando: false });
  });

  it("redirige a /login con retorno cuando no hay sesión", () => {
    renderConProviders(
      <Routes>
        <Route element={<RutaPrivada />}>
          <Route path="/proyectos" element={<p>dashboard</p>} />
        </Route>
        <Route path="/login" element={<p>login page</p>} />
      </Routes>,
      { ruta: "/proyectos?page=1" },
    );
    expect(screen.getByText("login page")).toBeInTheDocument();
  });

  it("muestra PantallaCargando mientras carga", () => {
    useSesionStore.setState({ cargando: true, usuario: null });
    renderConProviders(
      <Routes>
        <Route element={<RutaPrivada />}>
          <Route path="/" element={<p>dashboard</p>} />
        </Route>
      </Routes>,
      { ruta: "/" },
    );
    expect(screen.getByText(/cargando/i)).toBeInTheDocument();
  });

  it("renderiza contenido cuando hay sesión", () => {
    useSesionStore.setState({ usuario: usuarioFixture, cargando: false });
    renderConProviders(
      <Routes>
        <Route element={<RutaPrivada />}>
          <Route path="/" element={<p>dashboard</p>} />
        </Route>
      </Routes>,
      { ruta: "/" },
    );
    expect(screen.getByText("dashboard")).toBeInTheDocument();
  });
});

describe("RutaAdmin", () => {
  beforeEach(() => {
    useSesionStore.setState({ usuario: null, cargando: false });
  });

  it("redirige a /403 para USUARIO", () => {
    useSesionStore.setState({ usuario: usuarioFixture, cargando: false });
    renderConProviders(
      <Routes>
        <Route element={<RutaAdmin />}>
          <Route path="/admin/usuarios" element={<p>admin panel</p>} />
        </Route>
        <Route path="/403" element={<p>sin permiso</p>} />
        <Route path="/login" element={<p>login page</p>} />
      </Routes>,
      { ruta: "/admin/usuarios" },
    );
    expect(screen.getByText("sin permiso")).toBeInTheDocument();
  });

  it("renderiza contenido para SUPER_ADMIN", () => {
    useSesionStore.setState({ usuario: adminFixture, cargando: false });
    renderConProviders(
      <Routes>
        <Route element={<RutaAdmin />}>
          <Route path="/admin/usuarios" element={<p>admin panel</p>} />
        </Route>
      </Routes>,
      { ruta: "/admin/usuarios" },
    );
    expect(screen.getByText("admin panel")).toBeInTheDocument();
  });
});
