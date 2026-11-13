import type { LucideIcon } from "lucide-react";

type Props = {
  titulo: string;
  descricao: string;
  Icone: LucideIcon;
};

/** Placeholder das telas que ainda serão construídas. */
export function PaginaVazia({ titulo, descricao, Icone }: Props) {
  return (
    <section className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold tracking-tight">{titulo}</h1>
      <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed px-6 py-12 text-center">
        <Icone className="size-8 text-muted-foreground" aria-hidden />
        <p className="text-sm text-muted-foreground">{descricao}</p>
      </div>
    </section>
  );
}
