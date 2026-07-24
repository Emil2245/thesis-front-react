interface PlaceholderProps {
  pantalla: string;
}

export function Placeholder({ pantalla }: PlaceholderProps) {
  return (
    <div className="flex min-h-48 items-center justify-center rounded-lg border border-dashed border-muted-foreground/30 p-8">
      <p className="text-sm text-muted-foreground">
        Pantalla <code>{pantalla}</code> — pendiente
      </p>
    </div>
  );
}
