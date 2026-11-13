import { createElement, type CSSProperties } from "react";
import { iconeDaCategoria } from "@/lib/cadastros";

/** Ícone salvo na categoria (nome do lucide), com "Tag" como reserva. */
export function IconeCategoria({
  nome,
  className,
  style,
}: {
  nome: string | null | undefined;
  className?: string;
  style?: CSSProperties;
}) {
  return createElement(iconeDaCategoria(nome), { className, style, "aria-hidden": true });
}
