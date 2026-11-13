-- Ciclos editáveis: quando um ciclo é criado ou tem as datas alteradas, os
-- lançamentos do espaço são redistribuídos para o ciclo certo (a data define
-- o ciclo). Se algum lançamento ficaria sem ciclo, a alteração é recusada.
--
-- Excluir um ciclo já apaga os lançamentos dele: a chave estrangeira
-- lancamentos (espaco_id, ciclo_id) → ciclos é "on delete cascade".

-- Ciclo que contém a data (se houver sobreposição, o que começou por último).
create function public.ciclo_da_data(p_espaco_id uuid, p_data date)
returns uuid
language sql
stable
set search_path = ''
as $$
  select c.id
  from public.ciclos c
  where c.espaco_id = p_espaco_id
    and p_data between c.data_inicio and c.data_fim
  order by c.data_inicio desc
  limit 1;
$$;

revoke execute on function public.ciclo_da_data(uuid, date) from public, anon;
grant execute on function public.ciclo_da_data(uuid, date) to authenticated;

create function public.ciclos_redistribuir_lancamentos()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_qtd integer;
  v_primeira date;
begin
  if tg_op = 'UPDATE'
     and new.data_inicio = old.data_inicio
     and new.data_fim = old.data_fim
     and new.espaco_id = old.espaco_id then
    return null;
  end if;

  -- Afetados: os que estavam neste ciclo e os que caem no novo período.
  select count(*), min(l.data) into v_qtd, v_primeira
  from public.lancamentos l
  where l.espaco_id = new.espaco_id
    and (l.ciclo_id = new.id or l.data between new.data_inicio and new.data_fim)
    and public.ciclo_da_data(l.espaco_id, l.data) is null;

  if v_qtd > 0 then
    raise exception '% lançamento(s) ficariam sem ciclo (o primeiro em %). Ajuste as datas para cobri-los.',
      v_qtd, to_char(v_primeira, 'DD/MM/YYYY')
      using errcode = 'P0001';
  end if;

  update public.lancamentos l
  set ciclo_id = public.ciclo_da_data(l.espaco_id, l.data)
  where l.espaco_id = new.espaco_id
    and (l.ciclo_id = new.id or l.data between new.data_inicio and new.data_fim)
    and l.ciclo_id is distinct from public.ciclo_da_data(l.espaco_id, l.data);

  return null;
end;
$$;

revoke execute on function public.ciclos_redistribuir_lancamentos() from public, anon, authenticated;

create trigger ciclos_redistribuir_lancamentos
  after insert or update of data_inicio, data_fim, espaco_id on public.ciclos
  for each row execute function public.ciclos_redistribuir_lancamentos();
