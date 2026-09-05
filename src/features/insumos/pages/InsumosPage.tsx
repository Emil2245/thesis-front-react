import { useParams } from "react-router-dom";
import { useSesionStore } from "@/features/auth/sesion";
import { CargandoTabla } from "@/components/comunes/CargandoTabla";
import { EncabezadoPagina } from "@/components/comunes/EncabezadoPagina";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TablaInsumos } from "../components/TablaInsumos";
import { VistaBasesCentrales } from "../components/VistaBasesCentrales";

export function InsumosPage() {
  const { id } = useParams();
  const proyectoId = id ?? "";
  const cargando = useSesionStore((s) => s.cargando);

  if (cargando) return <CargandoTabla />;

  return (
    <>
      <EncabezadoPagina titulo="Insumos" />
      <Tabs defaultValue="proyecto">
        <TabsList>
          <TabsTrigger value="proyecto">Insumos del proyecto</TabsTrigger>
          <TabsTrigger value="bases">Bases centrales</TabsTrigger>
        </TabsList>
        <TabsContent value="proyecto">
          <TablaInsumos proyectoId={proyectoId} />
        </TabsContent>
        <TabsContent value="bases">
          <VistaBasesCentrales />
        </TabsContent>
      </Tabs>
    </>
  );
}
