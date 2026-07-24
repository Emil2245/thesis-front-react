import { useEffect } from "react";
import { post } from "@/api/request";
import { setAccessToken, setOnSesionExpirada, setRefrescador } from "@/api/client";
import type { TokenResponse } from "@/api/contract";
import { leerRefreshGuardado, useSesionStore } from "../sesion";

export function useBootstrapSesion() {
  useEffect(() => {
    const { iniciar, cerrar, setCargando } = useSesionStore.getState();

    setRefrescador(async () => {
      const refreshToken = useSesionStore.getState().refreshToken ?? leerRefreshGuardado();
      if (!refreshToken) return null;
      try {
        const r = await post<TokenResponse>("/auth/refresh", { refreshToken });
        iniciar(r.usuario, r.refreshToken ?? refreshToken, !!localStorage.getItem("apu.refresh"));
        return r.accessToken;
      } catch {
        cerrar();
        return null;
      }
    });

    setOnSesionExpirada(() => {
      cerrar();
      setAccessToken(null);
    });

    const guardado = leerRefreshGuardado();
    if (!guardado) {
      setCargando(false);
      return;
    }
    void (async () => {
      try {
        const r = await post<TokenResponse>("/auth/refresh", { refreshToken: guardado });
        setAccessToken(r.accessToken);
        iniciar(r.usuario, r.refreshToken ?? guardado, !!localStorage.getItem("apu.refresh"));
      } catch {
        cerrar();
      } finally {
        setCargando(false);
      }
    })();
  }, []);
}
