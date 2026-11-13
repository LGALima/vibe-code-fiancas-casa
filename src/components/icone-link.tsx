"use client";

import type { ReactNode } from "react";
import { useLinkStatus } from "next/link";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Para usar dentro de um <Link>: troca o ícone (filho) por um que gira
 * enquanto a tela de destino carrega. Sem filho, só aparece no carregamento.
 */
export function IconeLink({ children, className }: { children?: ReactNode; className?: string }) {
  const { pending } = useLinkStatus();
  if (pending) {
    return (
      <>
        <Loader2 data-spinner="" className={cn(className, "animate-spin")} aria-hidden />
        <span className="sr-only">Carregando</span>
      </>
    );
  }
  return children ?? null;
}
