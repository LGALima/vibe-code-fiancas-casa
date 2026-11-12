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
