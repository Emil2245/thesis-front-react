import { describe, expect, it, beforeEach } from "vitest";
import { leerRefreshGuardado, useSesionStore } from "../sesion";

describe("useSesionStore", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    useSesionStore.setState({ usuario: null, refreshToken: null, cargando: true });
  });

  it("iniciar guarda refresh en localStorage con recordar=true", () => {
    const { iniciar } = useSesionStore.getState();
    iniciar(
      { id: 1, nombre: "Ana", email: "ana@ejemplo.ec", rol: "USUARIO", emailVerificado: true },
      "refresh-1",
      true,
    );
    expect(localStorage.getItem("apu.refresh")).toBe("refresh-1");
    expect(useSesionStore.getState().usuario?.nombre).toBe("Ana");
  });

  it("iniciar guarda refresh en sessionStorage sin recordar", () => {
    const { iniciar } = useSesionStore.getState();
    iniciar(
      { id: 1, nombre: "Ana", email: "ana@ejemplo.ec", rol: "USUARIO", emailVerificado: true },
      "refresh-2",
      false,
    );
    expect(sessionStorage.getItem("apu.refresh")).toBe("refresh-2");
  });

  it("cerrar limpia ambos storages y el estado", () => {
    localStorage.setItem("apu.refresh", "x");
    sessionStorage.setItem("apu.refresh", "y");
    useSesionStore.setState({
      usuario: { id: 1, nombre: "A", email: "a@a", rol: "USUARIO", emailVerificado: true },
      refreshToken: "x",
      cargando: false,
    });

    useSesionStore.getState().cerrar();

    expect(localStorage.getItem("apu.refresh")).toBeNull();
    expect(sessionStorage.getItem("apu.refresh")).toBeNull();
    expect(useSesionStore.getState().usuario).toBeNull();
  });

  it("leerRefreshGuardado busca en ambos storages", () => {
    localStorage.setItem("apu.refresh", "local-r");
    expect(leerRefreshGuardado()).toBe("local-r");

    localStorage.removeItem("apu.refresh");
    sessionStorage.setItem("apu.refresh", "session-r");
    expect(leerRefreshGuardado()).toBe("session-r");
  });
});
