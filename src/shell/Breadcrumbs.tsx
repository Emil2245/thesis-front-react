import { Fragment } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { useProyecto } from "@/features/proyectos/hooks/useProyectos";
import { useProyectoActivoId } from "./contexto";
import { SelectorProyecto } from "./SelectorProyecto";

const NOMBRES: Record<string, string> = {
  proyectos: "Proyectos",
  perfil: "Perfil",
  plantillas: "Plantillas",
  "plantillas-proyecto": "Plantillas de proyecto",
  parametros: "Parámetros",
  insumos: "Insumos",
  versiones: "Versiones",
  apus: "APUs",
  presupuesto: "Presupuesto",
  cronograma: "Cronograma",
  workspace: "Workspace",
  documentos: "Documentos",
  admin: "Administración",
  usuarios: "Usuarios",
  bases: "Bases",
  valores: "Valores ref.",
  logs: "Logs",
};

const esNumerico = (s: string) => /^\d+$/.test(s);

export function Breadcrumbs() {
  const { pathname } = useLocation();
  const proyectoId = useProyectoActivoId();
  const { data: proyecto } = useProyecto(proyectoId);

  const segmentos = pathname.split("/").filter(Boolean);
  if (segmentos.length === 0) return null;

  const dentroDeProyecto = segmentos[0] === "proyectos" && proyectoId != null;

  // Los ids sueltos (`/apus/12`) no dicen nada al usuario: el encabezado de la
  // página ya identifica el registro por su código.
  const resto = (dentroDeProyecto ? segmentos.slice(2) : segmentos).filter((s) => !esNumerico(s));

  const partes = resto.map((seg, i) => {
    const prefijo = dentroDeProyecto ? `/proyectos/${proyectoId}` : "";
    const ruta = prefijo + "/" + resto.slice(0, i + 1).join("/");
    return { ruta, nombre: NOMBRES[seg] ?? seg, esUltimo: i === resto.length - 1 };
  });

  return (
    <Breadcrumb className="min-w-0">
      <BreadcrumbList className="flex-nowrap">
        {dentroDeProyecto && (
          <>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link to="/proyectos">Proyectos</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem className="min-w-0">
              {proyecto ? (
                <SelectorProyecto nombre={proyecto.nombreProyecto} />
              ) : (
                <BreadcrumbPage>Proyecto</BreadcrumbPage>
              )}
            </BreadcrumbItem>
          </>
        )}
        {partes.map((p, i) => (
          // El separador es hermano del ítem: anidarlo produce <li> dentro de <li>.
          <Fragment key={p.ruta}>
            {(i > 0 || dentroDeProyecto) && <BreadcrumbSeparator />}
            <BreadcrumbItem>
              {p.esUltimo ? (
                <BreadcrumbPage>{p.nombre}</BreadcrumbPage>
              ) : (
                <BreadcrumbLink asChild>
                  <Link to={p.ruta}>{p.nombre}</Link>
                </BreadcrumbLink>
              )}
            </BreadcrumbItem>
          </Fragment>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
