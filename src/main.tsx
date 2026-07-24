import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "react-router-dom";
import { queryClient } from "@/api/queryClient";
import { router } from "@/routes/index";
import { useBootstrapSesion } from "@/features/auth/hooks/useSesion";
import "./index.css";

function Root() {
  useBootstrapSesion();
  return <RouterProvider router={router} />;
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <Root />
    </QueryClientProvider>
  </StrictMode>,
);
