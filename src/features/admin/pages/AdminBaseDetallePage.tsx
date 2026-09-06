import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EncabezadoPagina } from "@/components/comunes/EncabezadoPagina";
import { EstadoVacio } from "@/components/comunes/EstadoVacio";
import { DialogoInsumo } from "@/features/insumos/components/DialogoInsumo";
import { AsistenteImportCsv } from "@/features/insumos/components/AsistenteImportCsv";
import { destinoBaseCentral } from "@/features/insumos/destino";
import { useAdminBases } from "../hooks/useAdminBases";
import { ChevronLeftIcon, PlusIcon, UploadIcon } from "lucide-react";

/**
 * S-39 — detalle de una base central.
 *
 * `AdminBaseCentralResource` expone cuatro endpoints de insumos y los cuatro
 * son de **escritura**: POST, PUT, DELETE e import CSV. No hay
 * `GET /admin/bases-centrales/{id}/insumos`, ni equivalente en
 * `BaseInsumosResource`, ni forma de filtrar el selector por base — verificado
 * contra origin/main @ c337950. Sin lectura no hay tabla que pintar, y editar o
 * borrar un insumo exige primero poder listarlo, así que esta pantalla ofrece
 * lo que el backend sí soporta (alta e importación masiva, que es el flujo real
 * de mantenimiento F-05) y dice en voz alta lo que falta en vez de fingir una
 * tabla vacía.
 *
 * Cuando exista el listado, la tabla es `TablaInsumos` con este mismo destino.
 */
export function AdminBaseDetallePage() {
  const { id = "" } = useParams();
  const [creando, setCreando] = useState(false);
  const [importando, setImportando] = useState(false);

  // No hay `GET /admin/bases-centrales/{id}`: la ficha sale del listado, que ya
  // está en caché al llegar desde S-38.
  const { data: bases, isPending } = useAdminBases({ incluirArchivadas: true });
  const base = bases?.find((b) => b.id === id);
  const destino = destinoBaseCentral(id);

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
      <EncabezadoPagina
        titulo={base.nombre}
        acciones={
          <>
            <Button variant="outline" onClick={() => setImportando(true)}>
              <UploadIcon data-icon="inline-start" /> Importar CSV
            </Button>
            <Button onClick={() => setCreando(true)}>
              <PlusIcon data-icon="inline-start" /> Nuevo insumo
            </Button>
          </>
        }
      />

      <Button variant="ghost" size="sm" asChild className="mb-4">
        <Link to="/admin/bases">
          <ChevronLeftIcon /> Bases de insumos
        </Link>
      </Button>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Contenido de la base
            {base.archivada && <Badge variant="outline">Archivada</Badge>}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-sm">
            <span className="font-mono">{base.totalInsumos}</span> insumos en esta base.
          </p>
          <p className="text-sm text-muted-foreground">
            El servidor no expone todavía el listado de los insumos de una base central: se pueden
            añadir e importar, pero no consultarlos ni editarlos uno a uno desde aquí.
          </p>
        </CardContent>
      </Card>

      {creando && <DialogoInsumo abierto onClose={() => setCreando(false)} destino={destino} />}
      {importando && (
        <AsistenteImportCsv abierto onClose={() => setImportando(false)} destino={destino} />
      )}
    </>
  );
}
