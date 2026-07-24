import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useParametrosSistema, useActualizarParametros } from "../hooks/useParametrosSistema";

export function AdminParametrosPage() {
  const { data, isLoading } = useParametrosSistema();
  const actualizar = useActualizarParametros();

  const hmRef = useRef<HTMLInputElement>(null);
  const ciRef = useRef<HTMLInputElement>(null);
  const ivaRef = useRef<HTMLInputElement>(null);
  const monedaRef = useRef<HTMLInputElement>(null);

  if (isLoading)
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64" />
      </div>
    );

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-xl font-semibold">Parámetros del sistema</h1>
      <Card>
        <CardHeader>
          <CardTitle>Configuración global</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="hm">% Herramienta menor</Label>
            <Input
              id="hm"
              ref={hmRef}
              defaultValue={data?.porcentajeHerramientaMenor ?? "0.05"}
              className="font-mono w-40"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ci">% Costos indirectos</Label>
            <Input
              id="ci"
              ref={ciRef}
              defaultValue={data?.porcentajeIndirecto ?? "0.15"}
              className="font-mono w-40"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="iva">IVA</Label>
            <Input
              id="iva"
              ref={ivaRef}
              defaultValue={data?.iva ?? "0.12"}
              className="font-mono w-40"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="moneda">Moneda</Label>
            <Input
              id="moneda"
              ref={monedaRef}
              defaultValue={data?.moneda ?? "USD"}
              className="w-40"
            />
          </div>
          <Button
            onClick={() => {
              actualizar.mutate({
                porcentajeHerramientaMenor: hmRef.current?.value as never,
                porcentajeIndirecto: ciRef.current?.value as never,
                iva: ivaRef.current?.value as never,
                moneda: monedaRef.current?.value,
              });
            }}
          >
            Guardar
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
