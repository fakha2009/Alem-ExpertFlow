export function EmptyState({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-lg border border-dashed bg-surface-elevated/45 px-6 py-12 text-center">
      <div className="mx-auto mb-4 h-1 w-12 rounded-full bg-primary/45" />
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">{text}</p>
    </div>
  );
}
