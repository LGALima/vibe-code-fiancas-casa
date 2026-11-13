/** Regras puras dos espaços (servem no servidor, no navegador e nos testes). */

export type EspacoResumo = {
  id: string;
  nome: string;
  /** Como a pessoa aparece neste espaço (pode ser vazio). */
  nomeExibicao: string | null;
};

/**
 * O espaço em uso: o da preferência salva, se a pessoa ainda for membro dele;
 * senão o mais antigo (o primeiro da lista).
 */
export function escolherEspacoAtivo<E extends { id: string }>(
  espacos: readonly E[],
  preferidoId: string | null | undefined,
): E | null {
  return espacos.find((e) => e.id === preferidoId) ?? espacos[0] ?? null;
}

/**
 * Nome que a pessoa usou por último, para já vir preenchido ao criar ou entrar
 * em outro espaço.
 */
export function nomeExibicaoSugerido(espacos: readonly EspacoResumo[]): string {
  for (let i = espacos.length - 1; i >= 0; i--) {
    const nome = espacos[i].nomeExibicao?.trim();
    if (nome) return nome;
  }
  return "";
}
