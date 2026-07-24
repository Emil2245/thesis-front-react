import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useSesionStore, esSuperAdmin } from "@/features/auth/sesion";
import { PantallaCargando } from "@/components/comunes/PantallaCargando";

export function RutaPrivada() {
  const { usuario, cargando } = useSesionStore();
  const location = useLocation();

  if (cargando) return <PantallaCargando />;
  if (!usuario) {
    const retorno = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/login?retorno=${retorno}`} replace />;
  }
  return <Outlet />;
}

export function RutaAdmin() {
  const { usuario, cargando } = useSesionStore();
  if (cargando) return <PantallaCargando />;
  if (!usuario) return <Navigate to="/login" replace />;
  if (!esSuperAdmin(usuario)) return <Navigate to="/403" replace />;
  return <Outlet />;
}
