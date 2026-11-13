-- Agregações da tela Análises (feitas no banco, não no navegador).
-- Valor "previsto" de um lançamento = real, se houver; senão a estimativa.
-- Valor "realizado" = só o real (0 quando ainda não tem).
-- Mesma regra da view resumo_ciclo, então os totais batem com os cartões do Início.
--
-- security invoker (padrão): o RLS de quem chama vale; outra casa recebe null.
-- p_pessoa: null = todos; senão só o que essa pessoa lançou (criado_por).

create function public.analise_ciclo(p_ciclo_id uuid, p_pessoa uuid default null)
returns jsonb
language sql
stable
set search_path = ''
as $$
  with c as (
    select * from public.ciclos where id = p_ciclo_id
  ),
  l as (
    select l.*,
           coalesce(l.valor_real, l.estimativa) as v_previsto,
           coalesce(l.valor_real, 0) as v_realizado
    from public.lancamentos l
    join c on l.ciclo_id = c.id and l.espaco_id = c.espaco_id
    where p_pessoa is null or l.criado_por = p_pessoa
  ),
  dias as (
    select d::date as dia
    from c, generate_series(c.data_inicio, c.data_fim, interval '1 day') d
  ),
  por_dia as (
    select
      dias.dia,
      coalesce(sum(l.v_previsto) filter (where l.tipo = 'gasto'), 0) as gastos_previsto,
      coalesce(sum(l.v_realizado) filter (where l.tipo = 'gasto'), 0) as gastos_realizado,
      coalesce(sum(l.v_previsto) filter (where l.tipo = 'ganho'), 0) as ganhos_previsto,
      coalesce(sum(l.v_realizado) filter (where l.tipo = 'ganho'), 0) as ganhos_realizado
    from dias
    left join l on l.data = dias.dia
    group by dias.dia
  ),
  por_dia_acumulado as (
    select por_dia.*,
           sum(gastos_previsto) over (order by dia) as gastos_previsto_acumulado,
           sum(gastos_realizado) over (order by dia) as gastos_realizado_acumulado
    from por_dia
  )
  select case when not exists (select 1 from c) then null else jsonb_build_object(
    'ciclo', (select jsonb_build_object('id', id, 'nome', nome, 'data_inicio', data_inicio, 'data_fim', data_fim) from c),
    'totais', (
      select jsonb_build_object(
        'ganhos_previsto', coalesce(sum(v_previsto) filter (where tipo = 'ganho'), 0)::numeric(12, 2),
        'ganhos_realizado', coalesce(sum(v_realizado) filter (where tipo = 'ganho'), 0)::numeric(12, 2),
        'gastos_previsto', coalesce(sum(v_previsto) filter (where tipo = 'gasto'), 0)::numeric(12, 2),
        'gastos_realizado', coalesce(sum(v_realizado) filter (where tipo = 'gasto'), 0)::numeric(12, 2),
        'qtd_lancamentos', count(*)
      )
      from l
    ),
    'por_categoria', (
      select coalesce(jsonb_agg(x order by x.tipo, x.previsto desc, x.nome), '[]'::jsonb)
      from (
        select l.tipo, cat.id as categoria_id, cat.nome, cat.cor, cat.icone,
               sum(l.v_previsto)::numeric(12, 2) as previsto,
               sum(l.v_realizado)::numeric(12, 2) as realizado,
               count(*) as qtd
        from l join public.categorias cat on cat.id = l.categoria_id
        group by l.tipo, cat.id
      ) x
    ),
    'por_forma', (
      select coalesce(jsonb_agg(x order by x.tipo, x.previsto desc, x.nome), '[]'::jsonb)
      from (
        select l.tipo, f.id as forma_id, f.nome, f.eh_credito,
               sum(l.v_previsto)::numeric(12, 2) as previsto,
               sum(l.v_realizado)::numeric(12, 2) as realizado,
               count(*) as qtd
        from l join public.formas_pagamento f on f.id = l.forma_pagamento_id
        group by l.tipo, f.id
      ) x
    ),
    'por_dia', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'dia', dia,
        'gastos_previsto', gastos_previsto::numeric(12, 2),
        'gastos_realizado', gastos_realizado::numeric(12, 2),
        'ganhos_previsto', ganhos_previsto::numeric(12, 2),
        'ganhos_realizado', ganhos_realizado::numeric(12, 2),
        'gastos_previsto_acumulado', gastos_previsto_acumulado::numeric(12, 2),
        'gastos_realizado_acumulado', gastos_realizado_acumulado::numeric(12, 2)
      ) order by dia), '[]'::jsonb)
      from por_dia_acumulado
    )
  ) end;
$$;

-- Últimos N ciclos do espaço (do mais antigo para o mais recente), com totais.
create function public.evolucao_ciclos(
  p_espaco_id uuid,
  p_pessoa uuid default null,
  p_limite integer default 12
)
returns jsonb
language sql
stable
set search_path = ''
as $$
  with ultimos as (
    select c.*
    from public.ciclos c
    where c.espaco_id = p_espaco_id
    order by c.data_inicio desc
    limit greatest(p_limite, 1)
  ),
  totais as (
    select u.id, u.nome, u.data_inicio, u.data_fim,
      coalesce(sum(coalesce(l.valor_real, l.estimativa)) filter (where l.tipo = 'ganho'), 0) as gp,
      coalesce(sum(l.valor_real) filter (where l.tipo = 'ganho'), 0) as gr,
      coalesce(sum(coalesce(l.valor_real, l.estimativa)) filter (where l.tipo = 'gasto'), 0) as sp,
      coalesce(sum(l.valor_real) filter (where l.tipo = 'gasto'), 0) as sr
    from ultimos u
    left join public.lancamentos l
      on l.ciclo_id = u.id and l.espaco_id = u.espaco_id
     and (p_pessoa is null or l.criado_por = p_pessoa)
    group by u.id, u.nome, u.data_inicio, u.data_fim
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'ciclo_id', id,
    'nome', nome,
    'data_inicio', data_inicio,
    'data_fim', data_fim,
    'ganhos_previsto', gp::numeric(12, 2),
    'ganhos_realizado', gr::numeric(12, 2),
    'gastos_previsto', sp::numeric(12, 2),
    'gastos_realizado', sr::numeric(12, 2),
    'saldo_previsto', (gp - sp)::numeric(12, 2),
    'saldo_realizado', (gr - sr)::numeric(12, 2)
  ) order by data_inicio), '[]'::jsonb)
  from totais;
$$;

revoke execute on function public.analise_ciclo(uuid, uuid) from public, anon;
revoke execute on function public.evolucao_ciclos(uuid, uuid, integer) from public, anon;
grant execute on function public.analise_ciclo(uuid, uuid) to authenticated;
grant execute on function public.evolucao_ciclos(uuid, uuid, integer) to authenticated;
