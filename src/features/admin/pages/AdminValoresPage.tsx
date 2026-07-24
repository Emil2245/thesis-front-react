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

export function AdminValoresPage() {
  const { data, isLoading } = useValoresReferencia();
  const actualizar = useActualizarValor();
  const inputsRef = useRef<Record<string, HTMLInputElement | null>>({});

  if (isLoading)
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64" />
      </div>
    );

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-xl font-semibold">Valores de referencia</h1>
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
    </div>
  );
}
