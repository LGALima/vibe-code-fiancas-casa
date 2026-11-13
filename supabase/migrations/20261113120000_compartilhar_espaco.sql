-- Compartilhar o espaço entre o casal:
-- - espaço ativo de cada usuário (um usuário pode ter mais de um espaço);
-- - categorias e formas de pagamento padrão ao criar o espaço;
-- - criar_espaco() e entrar_no_espaco() passam a marcar o espaço como ativo.

-- ---------------------------------------------------------------------------
-- Preferências por usuário (não é tabela de dados do espaço: é da pessoa).
-- ---------------------------------------------------------------------------

create table public.preferencias_usuario (
  user_id uuid primary key default auth.uid()
    references auth.users (id) on delete cascade,
  espaco_ativo_id uuid references public.espacos (id) on delete set null,
  atualizado_em timestamptz not null default now()
);

alter table public.preferencias_usuario enable row level security;

create policy "usuario le as proprias preferencias" on public.preferencias_usuario
  for select to authenticated
  using (user_id = (select auth.uid()));

-- Só dá para marcar como ativo um espaço do qual se é membro.
create policy "usuario cria as proprias preferencias" on public.preferencias_usuario
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and (espaco_ativo_id is null or public.eh_membro(espaco_ativo_id))
  );

create policy "usuario altera as proprias preferencias" on public.preferencias_usuario
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and (espaco_ativo_id is null or public.eh_membro(espaco_ativo_id))
  );

-- ---------------------------------------------------------------------------
-- Cadastros padrão de um espaço novo.
-- ---------------------------------------------------------------------------

create function public.inserir_cadastros_padrao(p_espaco_id uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.categorias (espaco_id, nome, tipo, cor, icone) values
    (p_espaco_id, 'Essencial',            'gasto', '#2563EB', 'house'),
    (p_espaco_id, 'Lazer',                'gasto', '#DB2777', 'party-popper'),
    (p_espaco_id, 'Cachorro',             'gasto', '#D97706', 'dog'),
    (p_espaco_id, 'Streaming',            'gasto', '#7C3AED', 'tv'),
    (p_espaco_id, 'Educação',             'gasto', '#0891B2', 'graduation-cap'),
    (p_espaco_id, 'Empréstimo',           'gasto', '#DC2626', 'hand-coins'),
    (p_espaco_id, 'Salário',              'ganho', '#16A34A', 'briefcase'),
    (p_espaco_id, 'Extra',                'ganho', '#65A30D', 'sparkles'),
    (p_espaco_id, 'Pagamento de terceiro','ganho', '#0D9488', 'handshake');

  insert into public.formas_pagamento (espaco_id, nome, eh_credito) values
    (p_espaco_id, 'Débito',   false),
    (p_espaco_id, 'Pix',      false),
    (p_espaco_id, 'Crédito',  true),
    (p_espaco_id, 'Dinheiro', false);
$$;

-- Uso interno: só criar_espaco() chama.
revoke execute on function public.inserir_cadastros_padrao(uuid)
  from public, anon, authenticated;

-- Marca o espaço como ativo para o usuário logado (uso interno das funções abaixo).
create function public.marcar_espaco_ativo(p_espaco_id uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.preferencias_usuario (user_id, espaco_ativo_id)
  values (auth.uid(), p_espaco_id)
  on conflict (user_id) do update
    set espaco_ativo_id = excluded.espaco_ativo_id,
        atualizado_em = now();
$$;

revoke execute on function public.marcar_espaco_ativo(uuid)
  from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- criar_espaco / entrar_no_espaco: mesma assinatura, agora com cadastros
-- padrão e espaço ativo.
-- ---------------------------------------------------------------------------

create or replace function public.criar_espaco(p_nome text, p_nome_exibicao text default null)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_espaco uuid;
begin
  if v_user is null then
    raise exception 'É preciso estar logado para criar um espaço.'
      using errcode = '42501';
  end if;

  insert into public.espacos (nome) values (btrim(p_nome))
  returning id into v_espaco;

  insert into public.membros (espaco_id, user_id, nome_exibicao)
  values (v_espaco, v_user, nullif(btrim(p_nome_exibicao), ''));

  insert into public.configuracoes (espaco_id) values (v_espaco);

  perform public.inserir_cadastros_padrao(v_espaco);
  perform public.marcar_espaco_ativo(v_espaco);

  return v_espaco;
end;
$$;

create or replace function public.entrar_no_espaco(p_codigo text, p_nome_exibicao text default null)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_espaco uuid;
begin
  if v_user is null then
    raise exception 'É preciso estar logado para entrar em um espaço.'
      using errcode = '42501';
  end if;

  select e.id into v_espaco
  from public.espacos e
  where e.codigo_convite = upper(btrim(p_codigo));

  if v_espaco is null then
    raise exception 'Código de convite inválido.' using errcode = 'P0002';
  end if;

  insert into public.membros (espaco_id, user_id, nome_exibicao)
  values (v_espaco, v_user, nullif(btrim(p_nome_exibicao), ''))
  on conflict (espaco_id, user_id) do update
    set nome_exibicao = coalesce(excluded.nome_exibicao, public.membros.nome_exibicao);

  perform public.marcar_espaco_ativo(v_espaco);

  return v_espaco;
end;
$$;
