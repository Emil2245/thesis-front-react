import { Link, useLocation } from "react-router-dom";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

const NOMBRES: Record<string, string> = {
  proyectos: "Proyectos",
  perfil: "Perfil",
  plantillas: "Plantillas",
  parametros: "Parámetros",
  insumos: "Insumos",
  versiones: "Versiones",
  apus: "APUs",
  presupuesto: "Presupuesto",
  cronograma: "Cronograma",
  documentos: "Documentos",
};

export function Breadcrumbs() {
  const { pathname } = useLocation();
  const segmentos = pathname.split("/").filter(Boolean);

  if (segmentos.length === 0) return null;

  const partes = segmentos.map((seg, i) => {
    const ruta = "/" + segmentos.slice(0, i + 1).join("/");
    const nombre = NOMBRES[seg] ?? seg;
    const esUltimo = i === segmentos.length - 1;
    return { ruta, nombre, esUltimo };
  });

  const soloProyecto = partes.length === 2 && partes[0]?.nombre === "Proyectos";

  return (
    <Breadcrumb>
      <BreadcrumbList>
        {partes.map((p, i) => (
          <BreadcrumbItem key={p.ruta}>
            {i > 0 && <BreadcrumbSeparator />}
            {p.esUltimo && !soloProyecto ? (
              <BreadcrumbPage>{p.nombre}</BreadcrumbPage>
            ) : (
              <BreadcrumbLink asChild>
                <Link to={p.ruta}>{p.nombre}</Link>
              </BreadcrumbLink>
            )}
          </BreadcrumbItem>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
