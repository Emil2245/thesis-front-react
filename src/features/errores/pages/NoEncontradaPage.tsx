import { Link } from "react-router-dom";

export function NoEncontradaPage() {
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
