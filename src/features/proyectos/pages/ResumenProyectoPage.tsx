import { useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useProyecto, useEliminarProyecto } from "../hooks/useProyectos";
import { TabFirmantes } from "../components/TabFirmantes";
import { ChipEstado } from "@/components/comunes/ChipEstado";
import { CargandoTabla } from "@/components/comunes/CargandoTabla";
import { ConfirmarDestructivo } from "@/components/comunes/ConfirmarDestructivo";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { TriangleAlertIcon, PencilIcon, CopyIcon, Trash2Icon, PercentIcon } from "lucide-react";
import { DialogoDescuentoGlobal } from "../components/DialogoDescuentoGlobal";

export function ResumenProyectoPage() {
  const { id } = useParams();
  const proyectoId = Number(id);
  const navigate = useNavigate();
  const { data: proyecto, isPending } = useProyecto(proyectoId);
  const [descuentoAbierto, setDescuentoAbierto] = useState(false);
  const eliminar = useEliminarProyecto();

  if (isPending) return <CargandoTabla />;
  if (!proyecto) return <p className="text-muted-foreground">Proyecto no encontrado</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold">{proyecto.nombreProyecto}</h1>
            <ChipEstado estado={proyecto.estado} />
          </div>
          <p className="text-sm text-muted-foreground">{proyecto.codigo}</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(`/proyectos/${proyectoId}?editar=true`)}
          >
            <PencilIcon /> Editar
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(`/proyectos/${proyectoId}?duplicar=true`)}
          >
            <CopyIcon /> Duplicar
          </Button>
          <Button variant="outline" size="sm" onClick={() => setDescuentoAbierto(true)}>
            <PercentIcon /> Descuento global
          </Button>
          <ConfirmarDestructivo
            titulo="Eliminar proyecto"
            descripcion={`¿Eliminar "${proyecto.nombreProyecto}"? Esta acción no se puede deshacer.`}
            textoConfirmar="Eliminar"
            onConfirmar={() => {
              eliminar.mutate(proyectoId);
              navigate("/proyectos");
            }}
          >
            <Button variant="destructive" size="sm">
              <Trash2Icon /> Eliminar
            </Button>
          </ConfirmarDestructivo>
        </div>
      </div>

      {(proyecto.alertas?.length ?? 0) > 0 && (
        <Alert variant="destructive">
          <TriangleAlertIcon />
          <AlertTitle>Alertas</AlertTitle>
          <AlertDescription>
            {proyecto.alertas?.includes("CI_NO_CONFIGURADO") && (
              <span>
                Porcentaje de indirectos no configurado.{" "}
                <Link to={`/proyectos/${proyectoId}/parametros`} className="underline">
                  Configurar ahora
                </Link>
              </span>
            )}
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Totales</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold">—</p>
          <p className="text-xs text-muted-foreground">Selecciona una versión para ver totales</p>
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-2">
        <Button variant="outline" asChild>
          <Link to={`/proyectos/${proyectoId}/insumos`}>Insumos</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link to={`/proyectos/${proyectoId}/apus`}>APUs</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link to={`/proyectos/${proyectoId}/presupuesto`}>Presupuesto</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link to={`/proyectos/${proyectoId}/cronograma`}>Cronograma</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link to={`/proyectos/${proyectoId}/documentos`}>Documentos</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link to={`/proyectos/${proyectoId}/parametros`}>Parámetros</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link to={`/proyectos/${proyectoId}/versiones`}>Versiones</Link>
        </Button>
      </div>

      <TabFirmantes proyectoId={proyectoId} />

      <DialogoDescuentoGlobal
        abierto={descuentoAbierto}
        onClose={() => setDescuentoAbierto(false)}
        proyectoId={proyectoId}
      />
    </div>
  );
}
