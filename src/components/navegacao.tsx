"use client";

import Link, { useLinkStatus } from "next/link";
import { usePathname } from "next/navigation";
import {
  ChartColumn,
  House,
  ListChecks,
  Loader2,
  PlusCircle,
  RefreshCw,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

type Item = { href: string; rotulo: string; Icone: LucideIcon };

const ITENS: Item[] = [
  { href: "/", rotulo: "Início", Icone: House },
  { href: "/lancar", rotulo: "Lançar", Icone: PlusCircle },
  { href: "/analises", rotulo: "Análises", Icone: ChartColumn },
  { href: "/ciclos", rotulo: "Ciclos", Icone: RefreshCw },
  { href: "/cadastros", rotulo: "Cadastros", Icone: ListChecks },
];

function estaAtivo(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

/** Ícone do item; gira enquanto a tela escolhida carrega. */
function IconeItem({ Icone, ativo, className }: { Icone: LucideIcon; ativo: boolean; className: string }) {
  const { pending } = useLinkStatus();
  if (pending) {
    return (
      <>
        <Loader2 className={cn(className, "animate-spin")} aria-hidden />
        <span className="sr-only">Carregando</span>
      </>
    );
  }
  return <Icone className={className} strokeWidth={ativo ? 2.4 : 1.8} aria-hidden />;
}

/** Celular: barra fixa embaixo (some a partir de 768px). */
export function BarraInferior() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Navegação principal"
      className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur supports-[backdrop-filter]:bg-background/80 md:hidden"
    >
      <ul className="mx-auto grid max-w-md grid-cols-5">
        {ITENS.map(({ href, rotulo, Icone }) => {
          const ativo = estaAtivo(pathname, href);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={ativo ? "page" : undefined}
                className={cn(
                  "flex h-16 flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors",
                  ativo ? "text-primary" : "text-muted-foreground hover:text-foreground",
                )}
              >
                <IconeItem Icone={Icone} ativo={ativo} className="size-5" />
                {rotulo}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/** Computador: lista vertical na barra lateral. */
export function LinksLaterais() {
  const pathname = usePathname();

  return (
    <nav aria-label="Navegação principal">
      <ul className="flex flex-col gap-1">
        {ITENS.map(({ href, rotulo, Icone }) => {
          const ativo = estaAtivo(pathname, href);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={ativo ? "page" : undefined}
                className={cn(
                  "flex h-10 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                  ativo
                    ? "bg-muted text-foreground"
                    : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                )}
              >
                <IconeItem Icone={Icone} ativo={ativo} className="size-4" />
                {rotulo}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
