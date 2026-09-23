import { Link, useParams } from "react-router-dom";
import { useBasesCentrales } from "../hooks/useBasesCentrales";
import { useBasesPersonales } from "../hooks/useBasesPersonales";
import { destinoBaseCentral, destinoBasePersonal } from "../destino";
import { TablaInsumos } from "../components/TablaInsumos";
import { CargandoTabla } from "@/components/comunes/CargandoTabla";
import { EncabezadoPagina } from "@/components/comunes/EncabezadoPagina";
import { EstadoVacio } from "@/components/comunes/EstadoVacio";
import { InsigniaOrigen } from "@/components/comunes/InsigniaOrigen";
import { Button } from "@/components/ui/button";
import { ChevronLeftIcon } from "lucide-react";

function VolverABases() {
  return (
    <Button variant="ghost" size="sm" asChild className="self-start">
      <Link to="/insumos">
        <ChevronLeftIcon /> Bases de insumos
      </Link>
    </Button>
  );
}

/**
 * Base de sistema en solo lectura. La ficha sale del listado (no hay
 * `GET /bases-centrales/{id}`); los insumos, de `GET /bases-centrales/{id}/insumos`.
 * Editarla es cosa de SUPER_ADMIN en `/admin/bases/:id`.
 */
export function BaseSistemaPage() {
  const { baseId = "" } = useParams();
  const { data: bases, isPending } = useBasesCentrales();
  const base = bases?.find((b) => b.id === baseId);

  if (isPending) return <CargandoTabla />;
  if (!base)
    return (
      <>
        <VolverABases />
        <EstadoVacio
          titulo="Esta base no existe"
          descripcion="No está entre las bases del sistema."
        />
      </>
    );

  return (
    <>
      <VolverABases />
      <EncabezadoPagina
        titulo={base.nombre}
        insignia={<InsigniaOrigen tipo="CENTRAL" />}
        descripcion="Base del sistema: solo lectura. Para usar sus precios, cópiala desde los insumos de tu proyecto."
      />
      <TablaInsumos destino={destinoBaseCentral(base.id)} soloLectura />
    </>
  );
}

/** Base personal del usuario: mismo CRUD e importación que la base del proyecto. */
export function BasePersonalPage() {
  const { baseId = "" } = useParams();
  const { data: bases, isPending } = useBasesPersonales();
  const base = bases?.find((b) => b.id === baseId);

  if (isPending) return <CargandoTabla />;
  if (!base)
    return (
      <>
        <VolverABases />
        <EstadoVacio
          titulo="Esta base no existe"
          descripcion="No está entre tus bases personales."
        />
      </>
    );

  return (
    <>
      <VolverABases />
      <EncabezadoPagina
        titulo={base.nombre}
        insignia={<InsigniaOrigen tipo="PERSONAL" />}
        descripcion="Tu base personal. Los cambios no afectan a los proyectos a los que ya la copiaste."
      />
      <TablaInsumos destino={destinoBasePersonal(base.id)} />
    </>
  );
}
