import { create } from "zustand";
import type { UsuarioResponse } from "@/api/contract";

const CLAVE_REFRESH = "apu.refresh";

interface EstadoSesion {
  usuario: UsuarioResponse | null;
  refreshToken: string | null;
  cargando: boolean;
  iniciar: (u: UsuarioResponse, refresh: string | null, recordar: boolean) => void;
  cerrar: () => void;
  setCargando: (v: boolean) => void;
}

export const useSesionStore = create<EstadoSesion>((set) => ({
  usuario: null,
  refreshToken: null,
  cargando: true,
  iniciar: (usuario, refreshToken, recordar) => {
    if (refreshToken) {
      (recordar ? localStorage : sessionStorage).setItem(CLAVE_REFRESH, refreshToken);
    }
    set({ usuario, refreshToken, cargando: false });
  },
  cerrar: () => {
    localStorage.removeItem(CLAVE_REFRESH);
    sessionStorage.removeItem(CLAVE_REFRESH);
    set({ usuario: null, refreshToken: null, cargando: false });
  },
  setCargando: (cargando) => set({ cargando }),
}));

export const leerRefreshGuardado = (): string | null =>
  localStorage.getItem(CLAVE_REFRESH) ?? sessionStorage.getItem(CLAVE_REFRESH);

export const esSuperAdmin = (u: UsuarioResponse | null) => u?.rol === "SUPER_ADMIN";
