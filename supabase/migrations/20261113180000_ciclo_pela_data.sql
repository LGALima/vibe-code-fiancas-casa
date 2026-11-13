-- A data do lançamento define o ciclo.
-- Ao inserir ou mudar data/espaço, o banco procura o ciclo do espaço que
-- contém a data (se houver sobreposição, o que começou por último) e grava
-- em ciclo_id, ignorando o valor enviado. Sem ciclo para a data, recusa.

create function public.lancamentos_definir_ciclo()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_ciclo uuid;
begin
  if tg_op = 'UPDATE'
     and new.data = old.data
     and new.espaco_id = old.espaco_id
     and new.ciclo_id = old.ciclo_id then
    return new;
  end if;

  select c.id into v_ciclo
  from public.ciclos c
  where c.espaco_id = new.espaco_id
    and new.data between c.data_inicio and c.data_fim
  order by c.data_inicio desc
  limit 1;

  if v_ciclo is null then
    raise exception 'Não há ciclo que contenha a data %.', to_char(new.data, 'DD/MM/YYYY')
      using errcode = 'P0001', hint = 'Crie o ciclo na tela Ciclos.';
  end if;

  new.ciclo_id := v_ciclo;
  return new;
end;
$$;

revoke execute on function public.lancamentos_definir_ciclo() from public, anon, authenticated;

create trigger lancamentos_definir_ciclo
  before insert or update of data, espaco_id, ciclo_id on public.lancamentos
  for each row execute function public.lancamentos_definir_ciclo();

-- A lista do ciclo filtra por espaço e ordena por data.
create index ciclos_espaco_periodo_idx on public.ciclos (espaco_id, data_inicio, data_fim);
