/**
 * Aceita só caminhos internos ("/ciclos"), para evitar redirecionamento
 * para outro site via ?next=https://... ou ?next=//...
 */
export function destinoSeguro(next: string | null | undefined): string {
  if (
    !next ||
    !next.startsWith("/") ||
    next.startsWith("//") ||
    next.startsWith("/\\")
  ) {
    return "/";
  }
  return next;
}

/**
 * Depois do login, a pessoa escolhe o espaço e só então segue para `next`.
 */
export function depoisDoLogin(next: string | null | undefined): string {
  const destino = destinoSeguro(next);
  return destino === "/" ? "/espacos" : `/espacos?next=${encodeURIComponent(destino)}`;
}
