import { useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { useValoresReferencia, useActualizarValor } from "../hooks/useValoresReferencia";
import { EncabezadoPagina } from "@/components/comunes/EncabezadoPagina";
import { ModuloNoDisponible } from "@/components/comunes/ModuloNoDisponible";

// El backend no tiene /admin/valores-referencia todavía (plan 027). Para
// reactivar: borra este bloque, quita "admin" de MODULOS_SIN_BACKEND (si ya
// no aplica al resto del grupo) y exporta AdminValoresPageActiva como
// AdminValoresPage.
export function AdminValoresPage() {
  return (
    <>
      <EncabezadoPagina titulo="Valores de referencia" />
      <ModuloNoDisponible
        modulo="Los valores de referencia"
        descripcion="El servidor todavía no expone los valores de referencia del sistema. La pantalla está construida y se activará cuando el endpoint exista."
      />
    </>
  );
}

export function AdminValoresPageActiva() {
  const { data, isLoading } = useValoresReferencia();
  const actualizar = useActualizarValor();
  const inputsRef = useRef<Record<string, HTMLInputElement | null>>({});

  if (isLoading)
    return (
      <>
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64" />
      </>
    );

  return (
    <>
      <EncabezadoPagina titulo="Valores de referencia" />
      <Card>
        <CardHeader>
          <CardTitle>Parámetros configurables</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Clave</TableHead>
                <TableHead>Descripción</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Fuente</TableHead>
                <TableHead className="w-24">Acción</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data?.map((v) => (
                <TableRow key={v.clave}>
                  <TableCell className="font-mono text-xs">{v.clave}</TableCell>
                  <TableCell className="text-sm">{v.descripcion}</TableCell>
                  <TableCell>
                    <Input
                      ref={(el) => {
                        inputsRef.current[v.clave] = el;
                      }}
                      defaultValue={v.valor}
                      className="font-mono w-24 h-8 text-right"
                    />
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{v.fuente}</TableCell>
                  <TableCell>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        const val = inputsRef.current[v.clave]?.value ?? v.valor;
                        actualizar.mutate({
                          clave: v.clave,
                          body: { valor: val, descripcion: v.descripcion, fuente: v.fuente },
                        });
                      }}
                    >
                      Actualizar
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  );
}
