/** Minúsculas e sem acento: "Água" e "agua" viram a mesma coisa. */
export function normalizar(texto: string): string {
  return texto.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().trim();
}

/**
 * A descrição combina com a busca? Cada palavra digitada precisa aparecer
 * (em qualquer ordem), sem diferenciar maiúsculas nem acentos.
 * "conta luz" acha "Conta de Luz"; busca vazia acha tudo.
 */
export function combinaComBusca(descricao: string, busca: string): boolean {
  const termos = normalizar(busca).split(/\s+/).filter(Boolean);
  if (termos.length === 0) return true;
  const alvo = normalizar(descricao);
  return termos.every((t) => alvo.includes(t));
}
