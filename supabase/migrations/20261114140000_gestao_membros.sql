-- Gestão de membros do espaço:
-- - cada espaço tem um dono (quem criou; se ele sair, o membro mais antigo);
-- - qualquer membro gera um novo código de convite (o antigo para de valer);
-- - só o dono remove um membro, e o código muda junto para a pessoa removida
--   não voltar com o código antigo.

-- ---------------------------------------------------------------------------
-- Papel no espaço
-- ---------------------------------------------------------------------------

alter table public.membros
  add column papel text not null default 'membro'
  check (papel in ('dono', 'membro'));

-- Espaços que já existem: o membro mais antigo vira dono.
update public.membros m
set papel = 'dono'
from (
  select distinct on (espaco_id) espaco_id, user_id
  from public.membros
  order by espaco_id, criado_em, user_id
) primeiro
where m.espaco_id = primeiro.espaco_id
  and m.user_id = primeiro.user_id;

create unique index membros_um_dono_idx on public.membros (espaco_id) where papel = 'dono';

-- Pela API, o membro só altera o próprio nome (o papel não).
revoke update on public.membros from anon, authenticated;
grant update (nome_exibicao) on public.membros to authenticated;

-- Quem entra num espaço sem dono vira dono; senão, membro. O papel enviado é
-- ignorado (só as funções criar_espaco/entrar_no_espaco inserem aqui).
create function privado.membros_definir_papel()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.papel := case
    when exists (
      select 1 from public.membros m
      where m.espaco_id = new.espaco_id and m.papel = 'dono'
    ) then 'membro'
    else 'dono'
  end;
  return new;
end;
$$;

create trigger membros_definir_papel
  before insert on public.membros
  for each row execute function privado.membros_definir_papel();

-- Se o dono sai, o membro mais antigo que ficou passa a ser o dono.
create function privado.membros_promover_dono()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.papel = 'dono' then
    update public.membros m
    set papel = 'dono'
    where (m.espaco_id, m.user_id) = (
      select r.espaco_id, r.user_id
      from public.membros r
      where r.espaco_id = old.espaco_id
      order by r.criado_em, r.user_id
      limit 1
    );
  end if;
  return null;
end;
$$;

create trigger membros_promover_dono
  after delete on public.membros
  for each row execute function privado.membros_promover_dono();

-- ---------------------------------------------------------------------------
-- Novo código de convite
-- ---------------------------------------------------------------------------

create function privado.trocar_codigo_convite(p_espaco_id uuid)
returns text
language plpgsql
set search_path = ''
as $$
declare
  v_codigo text;
begin
  loop
    v_codigo := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
    begin
      update public.espacos set codigo_convite = v_codigo where id = p_espaco_id;
      return v_codigo;
    exception when unique_violation then
      -- Colidiu com o código de outro espaço: sorteia de novo.
    end;
  end loop;
end;
$$;

create function public.gerar_novo_codigo_convite(p_espaco_id uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.eh_membro(p_espaco_id) then
    raise exception 'Espaço não encontrado.' using errcode = 'P0002';
  end if;
  return privado.trocar_codigo_convite(p_espaco_id);
end;
$$;

-- ---------------------------------------------------------------------------
-- Remover membro
-- ---------------------------------------------------------------------------

create function public.remover_membro(p_espaco_id uuid, p_user_id uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
begin
  if not exists (
    select 1 from public.membros m
    where m.espaco_id = p_espaco_id and m.user_id = v_user and m.papel = 'dono'
  ) then
    raise exception 'Só o dono do espaço pode remover membros.' using errcode = '42501';
  end if;

  if p_user_id = v_user then
    raise exception 'O dono não pode remover a si mesmo.' using errcode = 'P0001';
  end if;

  delete from public.membros m
  where m.espaco_id = p_espaco_id and m.user_id = p_user_id;
  if not found then
    raise exception 'Membro não encontrado.' using errcode = 'P0002';
  end if;

  -- Se este era o espaço em uso da pessoa, o app passa para outro dela.
  update public.preferencias_usuario p
  set espaco_ativo_id = null, atualizado_em = now()
  where p.user_id = p_user_id and p.espaco_ativo_id = p_espaco_id;

  -- Código novo: quem saiu não volta com o código que já conhecia.
  return privado.trocar_codigo_convite(p_espaco_id);
end;
$$;

-- ---------------------------------------------------------------------------
-- Permissões
-- ---------------------------------------------------------------------------

revoke execute on function privado.membros_definir_papel() from public, anon, authenticated;
revoke execute on function privado.membros_promover_dono() from public, anon, authenticated;
revoke execute on function privado.trocar_codigo_convite(uuid) from public, anon, authenticated;

revoke execute on function public.gerar_novo_codigo_convite(uuid) from public, anon;
revoke execute on function public.remover_membro(uuid, uuid) from public, anon;
grant execute on function public.gerar_novo_codigo_convite(uuid) to authenticated;
grant execute on function public.remover_membro(uuid, uuid) to authenticated;
