import { useRouteError, isRouteErrorResponse, Link } from "react-router-dom";

export function ErrorPage() {
  const error = useRouteError();

  if (isRouteErrorResponse(error)) {
    if (error.status === 404) {
      return (
        <div className="flex min-h-svh flex-col items-center justify-center gap-4 text-center">
          <h1 className="text-4xl font-bold text-foreground">404</h1>
          <p className="text-muted-foreground">No encontramos esta página.</p>
          <Link to="/proyectos" className="text-sm text-primary underline">
            Volver a mis proyectos
          </Link>
        </div>
      );
    }
    if (error.status === 403) {
      return (
        <div className="flex min-h-svh flex-col items-center justify-center gap-4 text-center">
          <h1 className="text-4xl font-bold text-foreground">403</h1>
          <p className="text-muted-foreground">No tienes permiso para acceder a esta página.</p>
          <Link to="/proyectos" className="text-sm text-primary underline">
            Volver a mis proyectos
          </Link>
        </div>
      );
    }
  }

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-4 text-center">
      <h1 className="text-4xl font-bold text-foreground">Error</h1>
      <p className="text-muted-foreground">Ocurrió un error inesperado. Intenta de nuevo.</p>
      <button className="text-sm text-primary underline" onClick={() => window.location.reload()}>
        Reintentar
      </button>
    </div>
  );
}
