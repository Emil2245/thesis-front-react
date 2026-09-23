import { Link, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EncabezadoPagina } from "@/components/comunes/EncabezadoPagina";
import { EstadoVacio } from "@/components/comunes/EstadoVacio";
import { TablaInsumos } from "@/features/insumos/components/TablaInsumos";
import { destinoBaseCentral } from "@/features/insumos/destino";
import { useAdminBase } from "../hooks/useAdminBases";
import { ChevronLeftIcon } from "lucide-react";

/**
 * S-39 — detalle de una base central.
 *
 * La lectura sale de `GET /bases-centrales/{id}/insumos` (plan 044 del
 * backend, cualquier usuario autenticado) y la escritura de los cuatro
 * endpoints de `AdminBaseCentralResource` (SUPER_ADMIN). `destinoBaseCentral`
 * junta las dos rutas, así que la tabla es la misma `TablaInsumos` del
 * proyecto: alta, edición, borrado e importación CSV.
 */
export function AdminBaseDetallePage() {
  const { id = "" } = useParams();

  // No hay `GET /admin/bases-centrales/{id}`: la ficha sale del listado, que ya
  // está en caché al llegar desde S-38.
  const { data: base, isPending } = useAdminBase(id);

  if (isPending)
    return (
      <>
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64" />
      </>
    );

  if (!base)
    return (
      <>
        <EncabezadoPagina titulo="Base de insumos" />
        <EstadoVacio
          titulo="Esta base no existe"
          descripcion="La base central que buscas no está en el listado de administración."
        />
      </>
    );

  return (
    <>
      <Button variant="ghost" size="sm" asChild className="self-start">
        <Link to="/admin/bases">
          <ChevronLeftIcon /> Bases de insumos
        </Link>
      </Button>

      <EncabezadoPagina
        titulo={base.nombre}
        insignia={base.archivada ? <Badge variant="outline">Archivada</Badge> : undefined}
        meta={<span>{base.totalInsumos} insumos</span>}
      />

      <TablaInsumos destino={destinoBaseCentral(id)} />
    </>
  );
}
