import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

export type EspacoAtivo = {
  id: string;
  nome: string;
  codigoConvite: string;
  /** Id do usuário logado. */
  userId: string;
};

/**
 * Espaço em que o usuário logado está trabalhando agora.
 * Usa a preferência salva; se ela estiver vazia ou apontar para um espaço do
 * qual a pessoa saiu, cai no espaço mais antigo dela. Devolve null quando o
 * usuário ainda não faz parte de nenhum espaço (vai para /boas-vindas).
 *
 * Lê cookies: chame dentro de um <Suspense>.
 */
export const obterEspacoAtivo = cache(async (): Promise<EspacoAtivo | null> => {
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
      .select("criado_em, espacos(id, nome, codigo_convite)")
      .eq("user_id", userId)
      .order("criado_em", { ascending: true }),
  ]);

  if (error) throw new Error(`Não foi possível carregar o espaço: ${error.message}`);

  const espacos = (vinculos ?? []).flatMap((v) => (v.espacos ? [v.espacos] : []));
  const escolhido =
    espacos.find((e) => e.id === preferencia?.espaco_ativo_id) ?? espacos[0];
  if (!escolhido) return null;

  return {
    id: escolhido.id,
    nome: escolhido.nome,
    codigoConvite: escolhido.codigo_convite,
    userId,
  };
});
