import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { escolherEspacoAtivo, type EspacoResumo } from "@/lib/espacos";

export type { EspacoResumo } from "@/lib/espacos";

export type EspacoAtivo = {
  id: string;
  nome: string;
  codigoConvite: string;
  /** Id do usuário logado. */
  userId: string;
};

export type MeusEspacos = {
  userId: string;
  /** Todos os espaços de que a pessoa é membro, do mais antigo para o mais novo. */
  espacos: (EspacoResumo & { codigoConvite: string })[];
  /** Espaço em uso agora (null se a pessoa ainda não tem nenhum). */
  ativoId: string | null;
};

/**
 * Espaços do usuário logado e qual está em uso. Devolve null sem login.
 * Lê cookies: chame dentro de um <Suspense>.
 */
export const carregarMeusEspacos = cache(async (): Promise<MeusEspacos | null> => {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  const userId = auth?.claims?.sub;
  if (!userId) return null;

  const [{ data: preferencia }, { data: vinculos, error }] = await Promise.all([
    supabase
      .from("preferencias_usuario")
      .select("espaco_ativo_id")
      .eq("user_id", userId)
      .maybeSingle(),
    supabase
      .from("membros")
      .select("criado_em, nome_exibicao, espacos(id, nome, codigo_convite)")
      .eq("user_id", userId)
      .order("criado_em", { ascending: true }),
  ]);

  if (error) throw new Error(`Não foi possível carregar o espaço: ${error.message}`);

  const espacos = (vinculos ?? []).flatMap((v) =>
    v.espacos
      ? [
          {
            id: v.espacos.id,
            nome: v.espacos.nome,
            codigoConvite: v.espacos.codigo_convite,
            nomeExibicao: v.nome_exibicao,
          },
        ]
      : [],
  );

  return {
    userId,
    espacos,
    ativoId: escolherEspacoAtivo(espacos, preferencia?.espaco_ativo_id)?.id ?? null,
  };
});

/**
 * Espaço em que o usuário logado está trabalhando agora.
 * Usa a preferência salva; se ela estiver vazia ou apontar para um espaço do
 * qual a pessoa saiu, cai no espaço mais antigo dela. Devolve null quando o
 * usuário ainda não faz parte de nenhum espaço (vai para /boas-vindas).
 *
 * Lê cookies: chame dentro de um <Suspense>.
 */
export const obterEspacoAtivo = cache(async (): Promise<EspacoAtivo | null> => {
  const meus = await carregarMeusEspacos();
  const ativo = meus?.espacos.find((e) => e.id === meus.ativoId);
  if (!meus || !ativo) return null;
  return {
    id: ativo.id,
    nome: ativo.nome,
    codigoConvite: ativo.codigoConvite,
    userId: meus.userId,
  };
});
