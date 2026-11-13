-- Criar o próximo ciclo a partir de um ciclo (docs/planejamento.md →
-- "Criar o próximo ciclo a partir do atual"):
-- 1. início = fim do ciclo atual + 1 dia; fim = véspera do mesmo dia no mês
--    seguinte; nome = mês/ano do início;
-- 2. copia todo lançamento recorrente como previsto (valor real vazio), com a
--    data avançada em 1 mês;
-- 3. estimativa da cópia = último valor real (opção) ou a estimativa anterior;
-- 4. parcelados: parcela atual + 1, mesmo grupo; a última parcela não é copiada.
--
-- A prévia e a criação usam o MESMO planejamento (privado.planejar_proximo_ciclo),
-- então o que a prévia mostra é exatamente o que será criado.

-- Funções internas ficam num schema que a API não expõe.
create schema if not exists privado;
revoke all on schema privado from public, anon, authenticated;

create function privado.nome_do_ciclo(p_inicio date)
returns text
language sql
immutable
set search_path = ''
as $$
  select (array['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho',
                'Agosto','Setembro','Outubro','Novembro','Dezembro'])[extract(month from p_inicio)::int]
         || '/' || extract(year from p_inicio)::int;
$$;

-- Véspera do mesmo dia no mês seguinte. Mês sem esse dia usa o último dia
-- (31/01 + 1 mês = 28/02, então o fim é 27/02).
create function privado.fim_do_ciclo(p_inicio date)
returns date
language sql
immutable
set search_path = ''
as $$
  select (p_inicio + interval '1 month')::date - 1;
$$;

-- Garante que quem chama é membro do espaço do ciclo; devolve o ciclo.
create function privado.ciclo_do_membro(p_ciclo_id uuid)
returns public.ciclos
language plpgsql
stable
set search_path = ''
as $$
declare
  v_ciclo public.ciclos;
begin
  select * into v_ciclo from public.ciclos where id = p_ciclo_id;
  if v_ciclo.id is null or not public.eh_membro(v_ciclo.espaco_id) then
    raise exception 'Ciclo não encontrado.' using errcode = 'P0002';
  end if;
  return v_ciclo;
end;
$$;

-- O que o próximo ciclo vai receber. situacao:
--   'recorrente'        → copiado (não parcelado);
--   'parcela'           → copiado com parcela_atual + 1;
--   'parcela_encerrada' → era a última parcela: NÃO é copiado (só aparece na prévia).
create function privado.planejar_proximo_ciclo(p_ciclo_id uuid, p_usar_ultimo_real boolean)
returns table (
  origem_id uuid,
  situacao text,
  tipo text,
  descricao text,
  estimativa numeric(12, 2),
  categoria_id uuid,
  forma_pagamento_id uuid,
  data date,
  parcela_atual integer,
  total_parcelas integer,
  grupo_id uuid,
  observacao text,
  criado_por uuid
)
language sql
stable
set search_path = ''
as $$
  with atual as (
    select c.id, c.espaco_id, c.data_fim + 1 as novo_inicio
    from public.ciclos c
    where c.id = p_ciclo_id
  ),
  novo as (
    select a.*, privado.fim_do_ciclo(a.novo_inicio) as novo_fim from atual a
  )
  select
    l.id,
    case
      when l.total_parcelas is null then 'recorrente'
      when l.parcela_atual >= l.total_parcelas then 'parcela_encerrada'
      else 'parcela'
    end,
    l.tipo,
    l.descricao,
    case
      when p_usar_ultimo_real and l.valor_real is not null then l.valor_real
      else coalesce(l.estimativa, l.valor_real)
    end,
    l.categoria_id,
    l.forma_pagamento_id,
    -- data + 1 mês, sem sair do novo ciclo (ciclos com datas fora do padrão)
    greatest(n.novo_inicio, least(n.novo_fim, (l.data + interval '1 month')::date)),
    case
      when l.total_parcelas is null then null
      when l.parcela_atual >= l.total_parcelas then l.parcela_atual
      else l.parcela_atual + 1
    end,
    l.total_parcelas,
    l.grupo_id,
    l.observacao,
    l.criado_por
  from public.lancamentos l
  join novo n on l.ciclo_id = n.id and l.espaco_id = n.espaco_id
  where l.recorrente
  order by l.data, l.criado_em, l.id;
$$;

-- Motivo para não poder criar o próximo ciclo (null = pode).
create function privado.conflito_proximo_ciclo(p_ciclo public.ciclos)
returns text
language sql
stable
set search_path = ''
as $$
  select case
    when exists (
      select 1 from public.ciclos c
      where c.espaco_id = p_ciclo.espaco_id and c.data_inicio = p_ciclo.data_fim + 1
    ) then 'Já existe um ciclo começando em ' || to_char(p_ciclo.data_fim + 1, 'DD/MM/YYYY') || '.'
    when exists (
      select 1 from public.ciclos c
      where c.espaco_id = p_ciclo.espaco_id
        and c.data_inicio <= privado.fim_do_ciclo(p_ciclo.data_fim + 1)
        and c.data_fim >= p_ciclo.data_fim + 1
    ) then 'Já existe um ciclo nesse período (' ||
      (select c.nome from public.ciclos c
       where c.espaco_id = p_ciclo.espaco_id
         and c.data_inicio <= privado.fim_do_ciclo(p_ciclo.data_fim + 1)
         and c.data_fim >= p_ciclo.data_fim + 1
       order by c.data_inicio limit 1) || ').'
    else null
  end;
$$;

-- ---------------------------------------------------------------------------
-- API
-- ---------------------------------------------------------------------------

-- Prévia: o que seria criado, sem gravar nada.
create function public.previa_proximo_ciclo(p_ciclo_id uuid, p_usar_ultimo_real boolean default false)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_ciclo public.ciclos := privado.ciclo_do_membro(p_ciclo_id);
  v_inicio date := v_ciclo.data_fim + 1;
begin
  return (
    select jsonb_build_object(
      'nome', privado.nome_do_ciclo(v_inicio),
      'data_inicio', v_inicio,
      'data_fim', privado.fim_do_ciclo(v_inicio),
      'conflito', privado.conflito_proximo_ciclo(v_ciclo),
      'recorrentes', count(*) filter (where p.situacao = 'recorrente'),
      'parcelas', count(*) filter (where p.situacao = 'parcela'),
      'parcelas_encerradas', count(*) filter (where p.situacao = 'parcela_encerrada'),
      'itens', coalesce(jsonb_agg(to_jsonb(p) order by p.data, p.descricao), '[]'::jsonb)
    )
    from privado.planejar_proximo_ciclo(p_ciclo_id, p_usar_ultimo_real) p
  );
end;
$$;

-- Cria o ciclo e as cópias numa única transação. Devolve o id do novo ciclo.
-- security definer: as cópias mantêm quem lançou o original (criado_por), o
-- que o RLS de inserção não permitiria; por isso a checagem de membro é feita
-- aqui dentro (privado.ciclo_do_membro).
create function public.criar_proximo_ciclo(p_ciclo_id uuid, p_usar_ultimo_real boolean default false)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_ciclo public.ciclos := privado.ciclo_do_membro(p_ciclo_id);
  v_inicio date := v_ciclo.data_fim + 1;
  v_conflito text := privado.conflito_proximo_ciclo(v_ciclo);
  v_novo uuid;
begin
  if v_conflito is not null then
    raise exception '%', v_conflito using errcode = 'P0001';
  end if;

  insert into public.ciclos (espaco_id, nome, data_inicio, data_fim, ciclo_origem_id)
  values (v_ciclo.espaco_id, privado.nome_do_ciclo(v_inicio), v_inicio,
          privado.fim_do_ciclo(v_inicio), v_ciclo.id)
  returning id into v_novo;

  insert into public.lancamentos (
    espaco_id, ciclo_id, tipo, descricao, recorrente, estimativa, valor_real,
    categoria_id, forma_pagamento_id, data, parcela_atual, total_parcelas,
    grupo_id, observacao, criado_por
  )
  select v_ciclo.espaco_id, v_novo, p.tipo, p.descricao, true, p.estimativa, null,
         p.categoria_id, p.forma_pagamento_id, p.data, p.parcela_atual, p.total_parcelas,
         p.grupo_id, p.observacao, p.criado_por
  from privado.planejar_proximo_ciclo(p_ciclo_id, p_usar_ultimo_real) p
  where p.situacao <> 'parcela_encerrada';

  return v_novo;
end;
$$;

revoke execute on function public.previa_proximo_ciclo(uuid, boolean) from public, anon;
revoke execute on function public.criar_proximo_ciclo(uuid, boolean) from public, anon;
grant execute on function public.previa_proximo_ciclo(uuid, boolean) to authenticated;
grant execute on function public.criar_proximo_ciclo(uuid, boolean) to authenticated;
