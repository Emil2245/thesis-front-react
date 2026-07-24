import { RouterProvider } from "react-router-dom";
import { router } from "@/routes/index";
import { useBootstrapSesion } from "@/features/auth/hooks/useSesion";

export function Root() {
  useBootstrapSesion();
  return <RouterProvider router={router} />;
}
