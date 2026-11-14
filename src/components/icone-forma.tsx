import { createElement, type CSSProperties } from "react";
import { iconeDaForma } from "@/lib/cadastros";

/** Ícone salvo na forma de pagamento, com "Wallet" como reserva. */
export function IconeForma({
  nome,
  className,
  style,
}: {
  nome: string | null | undefined;
  className?: string;
  style?: CSSProperties;
}) {
  return createElement(iconeDaForma(nome), { className, style, "aria-hidden": true });
}
