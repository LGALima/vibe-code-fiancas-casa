"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ChartColumn,
  House,
  ListChecks,
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
  return href === "/"
    ? pathname === "/"
    : pathname === href || pathname.startsWith(`${href}/`);
}

export function BarraInferior() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Navegação principal"
      className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur supports-[backdrop-filter]:bg-background/80"
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
                  ativo
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Icone
                  className="size-5"
                  strokeWidth={ativo ? 2.4 : 1.8}
                  aria-hidden
                />
                {rotulo}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
