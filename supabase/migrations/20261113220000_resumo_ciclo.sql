-- Totais de cada ciclo (docs/planejamento.md → "Totais do ciclo"):
-- - Previsto  = soma de (valor real, se existir; senão a estimativa);
-- - Realizado = soma apenas dos valores reais;
-- - Saldo     = ganhos − gastos, nas duas versões.
--
-- security_invoker: a view roda com as permissões de quem consulta, então o
-- RLS de ciclos e lancamentos continua valendo (cada um só vê a própria casa).
-- Ciclos sem lançamentos aparecem com tudo zerado.

create view public.resumo_ciclo
with (security_invoker = true)
as
select
  c.id as ciclo_id,
  c.espaco_id,
  c.nome,
  c.data_inicio,
  c.data_fim,
  coalesce(sum(coalesce(l.valor_real, l.estimativa)) filter (where l.tipo = 'ganho'), 0)::numeric(12, 2)
    as ganhos_previsto,
  coalesce(sum(l.valor_real) filter (where l.tipo = 'ganho'), 0)::numeric(12, 2)
    as ganhos_realizado,
  coalesce(sum(coalesce(l.valor_real, l.estimativa)) filter (where l.tipo = 'gasto'), 0)::numeric(12, 2)
    as gastos_previsto,
  coalesce(sum(l.valor_real) filter (where l.tipo = 'gasto'), 0)::numeric(12, 2)
    as gastos_realizado,
  (
    coalesce(sum(coalesce(l.valor_real, l.estimativa)) filter (where l.tipo = 'ganho'), 0)
    - coalesce(sum(coalesce(l.valor_real, l.estimativa)) filter (where l.tipo = 'gasto'), 0)
  )::numeric(12, 2) as saldo_previsto,
  (
    coalesce(sum(l.valor_real) filter (where l.tipo = 'ganho'), 0)
    - coalesce(sum(l.valor_real) filter (where l.tipo = 'gasto'), 0)
  )::numeric(12, 2) as saldo_realizado,
  count(l.id)::integer as qtd_lancamentos,
  (count(l.id) filter (where l.valor_real is null))::integer as qtd_previstos
from public.ciclos c
left join public.lancamentos l
  on l.ciclo_id = c.id
 and l.espaco_id = c.espaco_id
group by c.id;

revoke all on public.resumo_ciclo from anon;
grant select on public.resumo_ciclo to authenticated;
