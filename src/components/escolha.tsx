"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type Opcao<T extends string> = {
  valor: T;
  rotulo: string;
  conteudo?: ReactNode;
};

type Props<T extends string> = {
  rotulo: string;
  opcoes: readonly Opcao<T>[];
  valor: T | undefined;
  onChange: (valor: T) => void;
  erro?: string;
  /** "botoes": rótulos lado a lado. "grade": quadradinhos (cores, ícones). */
  variante?: "botoes" | "grade";
  className?: string;
};

/** Grupo de opções exclusivas (role="radiogroup"), navegável por teclado. */
export function Escolha<T extends string>({
  rotulo,
  opcoes,
  valor,
  onChange,
  erro,
  variante = "botoes",
  className,
}: Props<T>) {
  function mover(atual: number, delta: number) {
    const proximo = (atual + delta + opcoes.length) % opcoes.length;
    onChange(opcoes[proximo].valor);
    requestAnimationFrame(() => {
      document
        .querySelector<HTMLButtonElement>(
          `[data-escolha="${rotulo}"][data-valor="${opcoes[proximo].valor}"]`,
        )
        ?.focus();
    });
  }

  const selecionado = opcoes.findIndex((o) => o.valor === valor);

  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-2 text-sm font-medium">{rotulo}</legend>
      <div
        role="radiogroup"
        aria-label={rotulo}
        aria-invalid={erro ? true : undefined}
        className={cn(
          variante === "botoes"
            ? "grid auto-cols-fr grid-flow-col gap-1 rounded-lg bg-muted p-1"
            : "grid grid-cols-6 gap-2 sm:grid-cols-8",
          className,
        )}
      >
        {opcoes.map((o, i) => {
          const ativo = o.valor === valor;
          return (
            <button
              key={o.valor}
              type="button"
              role="radio"
              aria-checked={ativo}
              aria-label={o.conteudo ? o.rotulo : undefined}
              title={o.conteudo ? o.rotulo : undefined}
              data-escolha={rotulo}
              data-valor={o.valor}
              tabIndex={ativo || (selecionado === -1 && i === 0) ? 0 : -1}
              onClick={() => onChange(o.valor)}
              onKeyDown={(e) => {
                if (e.key === "ArrowRight" || e.key === "ArrowDown") {
                  e.preventDefault();
                  mover(i, 1);
                } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
                  e.preventDefault();
                  mover(i, -1);
                }
              }}
              className={cn(
                "outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                variante === "botoes"
                  ? cn(
                      "h-9 rounded-md text-sm font-medium transition-colors",
                      ativo
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground",
                    )
                  : cn(
                      "flex aspect-square items-center justify-center rounded-lg border transition-colors",
                      ativo
                        ? "border-foreground ring-2 ring-foreground/20"
                        : "border-border hover:bg-muted",
                    ),
              )}
            >
              {o.conteudo ?? o.rotulo}
            </button>
          );
        })}
      </div>
      {erro && <p className="text-sm text-destructive">{erro}</p>}
    </fieldset>
  );
}
