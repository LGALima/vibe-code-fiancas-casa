import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { TipoLancamento } from "@/lib/dominio/status";

export type Ciclo = {
  id: string;
  nome: string;
  data_inicio: string;
  data_fim: string;
};

export type CategoriaOpcao = {
  id: string;
  nome: string;
  tipo: "gasto" | "ganho" | "ambos";
  cor: string | null;
  icone: string | null;
  ativa: boolean;
};

export type FormaOpcao = {
  id: string;
  nome: string;
  ehCredito: boolean;
  ativa: boolean;
};

export type Membro = { userId: string; nome: string };

export type Lancamento = {
  id: string;
  ciclo_id: string;
  tipo: TipoLancamento;
  descricao: string;
  recorrente: boolean;
  estimativa: number | null;
  valor_real: number | null;
  categoria_id: string;
  forma_pagamento_id: string;
  data: string;
  parcela_atual: number | null;
  total_parcelas: number | null;
  grupo_id: string | null;
  observacao: string | null;
  criado_por: string | null;
  criado_em: string;
};

function falhar(o_que: string, erro: { message: string } | null): never {
  throw new Error(`Não foi possível carregar ${o_que}: ${erro?.message ?? "erro desconhecido"}`);
}

/** Ciclos do espaço, do mais recente para o mais antigo. */
export const carregarCiclos = cache(async (espacoId: string): Promise<Ciclo[]> => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("ciclos")
    .select("id, nome, data_inicio, data_fim")
    .eq("espaco_id", espacoId)
    .order("data_inicio", { ascending: false });
  if (error) falhar("os ciclos", error);
  return data;
});

/** Categorias e formas de pagamento (inclusive as desativadas, para exibir o histórico). */
export const carregarCadastros = cache(async (espacoId: string) => {
  const supabase = await createClient();
  const [categorias, formas, configuracoes] = await Promise.all([
    supabase
      .from("categorias")
      .select("id, nome, tipo, cor, icone, ativa")
      .eq("espaco_id", espacoId)
      .order("nome"),
    supabase
      .from("formas_pagamento")
      .select("id, nome, eh_credito, ativa")
      .eq("espaco_id", espacoId)
      .order("nome"),
    supabase
      .from("configuracoes")
      .select("dia_inicio_ciclo")
      .eq("espaco_id", espacoId)
      .maybeSingle(),
  ]);
  if (categorias.error) falhar("as categorias", categorias.error);
  if (formas.error) falhar("as formas de pagamento", formas.error);
  if (configuracoes.error) falhar("as configurações", configuracoes.error);

  return {
    categorias: categorias.data.map(
      (c): CategoriaOpcao => ({ ...c, tipo: c.tipo as CategoriaOpcao["tipo"] }),
    ),
    formas: formas.data.map(
      (f): FormaOpcao => ({ id: f.id, nome: f.nome, ehCredito: f.eh_credito, ativa: f.ativa }),
    ),
    diaInicioCiclo: configuracoes.data?.dia_inicio_ciclo ?? 3,
  };
});

export const carregarMembros = cache(async (espacoId: string): Promise<Membro[]> => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("membros")
    .select("user_id, nome_exibicao, criado_em")
    .eq("espaco_id", espacoId)
    .order("criado_em");
  if (error) falhar("os membros", error);
  return data.map((m) => ({ userId: m.user_id, nome: m.nome_exibicao ?? "Sem nome" }));
});

const COLUNAS_LANCAMENTO =
  "id, ciclo_id, tipo, descricao, recorrente, estimativa, valor_real, categoria_id, forma_pagamento_id, data, parcela_atual, total_parcelas, grupo_id, observacao, criado_por, criado_em";

export async function carregarLancamentosDoCiclo(
  espacoId: string,
  cicloId: string,
): Promise<Lancamento[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("lancamentos")
    .select(COLUNAS_LANCAMENTO)
    .eq("espaco_id", espacoId)
    .eq("ciclo_id", cicloId)
    .order("data", { ascending: false })
    .order("criado_em", { ascending: false });
  if (error) falhar("os lançamentos", error);
  return data.map((l) => ({ ...l, tipo: l.tipo as TipoLancamento }));
}

export async function carregarLancamento(
  espacoId: string,
  id: string,
): Promise<Lancamento | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("lancamentos")
    .select(COLUNAS_LANCAMENTO)
    .eq("espaco_id", espacoId)
    .eq("id", id)
    .maybeSingle();
  if (error) falhar("o lançamento", error);
  return data ? { ...data, tipo: data.tipo as TipoLancamento } : null;
}
