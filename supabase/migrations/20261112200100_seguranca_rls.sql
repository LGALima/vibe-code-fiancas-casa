-- Segurança por linha (RLS): só membros de um espaço leem e escrevem os dados dele.

-- ---------------------------------------------------------------------------
-- eh_membro(): usada nas políticas.
-- security definer = roda com os privilégios do dono e ignora o RLS de
-- "membros", evitando recursão quando a própria tabela membros a usa.
-- ---------------------------------------------------------------------------

create function public.eh_membro(p_espaco_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.membros m
    where m.espaco_id = p_espaco_id
      and m.user_id = (select auth.uid())
  );
$$;

revoke execute on function public.eh_membro(uuid) from public, anon;
grant execute on function public.eh_membro(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Criar espaço e entrar por convite.
-- Ninguém insere direto em espacos/membros: estas funções fazem isso de forma
-- controlada (quem cria vira membro; quem entra precisa do código).
-- ---------------------------------------------------------------------------

create function public.criar_espaco(p_nome text, p_nome_exibicao text default null)
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

  return v_espaco;
end;
$$;

create function public.entrar_no_espaco(p_codigo text, p_nome_exibicao text default null)
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
  on conflict (espaco_id, user_id) do nothing;

  return v_espaco;
end;
$$;

revoke execute on function public.criar_espaco(text, text) from public, anon;
revoke execute on function public.entrar_no_espaco(text, text) from public, anon;
grant execute on function public.criar_espaco(text, text) to authenticated;
grant execute on function public.entrar_no_espaco(text, text) to authenticated;

-- Função de trigger não deve ser chamável pela API.
revoke execute on function public.lancamentos_antes_de_atualizar() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Liga o RLS em todas as tabelas.
-- ---------------------------------------------------------------------------

alter table public.espacos enable row level security;
alter table public.membros enable row level security;
alter table public.configuracoes enable row level security;
alter table public.ciclos enable row level security;
alter table public.categorias enable row level security;
alter table public.formas_pagamento enable row level security;
alter table public.lancamentos enable row level security;

-- ---------------------------------------------------------------------------
-- espacos: membros veem e renomeiam. Criar só via criar_espaco(); sem exclusão.
-- ---------------------------------------------------------------------------

create policy "membros veem o espaco" on public.espacos
  for select to authenticated
  using (public.eh_membro(id));

create policy "membros editam o espaco" on public.espacos
  for update to authenticated
  using (public.eh_membro(id))
  with check (public.eh_membro(id));

-- ---------------------------------------------------------------------------
-- membros: veem os colegas de espaço; cada um edita o próprio nome ou sai.
-- Entrar só via criar_espaco() / entrar_no_espaco().
-- ---------------------------------------------------------------------------

create policy "membros veem os membros do espaco" on public.membros
  for select to authenticated
  using (public.eh_membro(espaco_id));

create policy "membro edita o proprio nome" on public.membros
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()) and public.eh_membro(espaco_id));

create policy "membro sai do espaco" on public.membros
  for delete to authenticated
  using (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- configuracoes: membros veem e alteram. Criada junto com o espaço.
-- ---------------------------------------------------------------------------

create policy "membros veem as configuracoes" on public.configuracoes
  for select to authenticated
  using (public.eh_membro(espaco_id));

create policy "membros alteram as configuracoes" on public.configuracoes
  for update to authenticated
  using (public.eh_membro(espaco_id))
  with check (public.eh_membro(espaco_id));

-- ---------------------------------------------------------------------------
-- Tabelas de dados: membros fazem tudo dentro do próprio espaço.
-- ---------------------------------------------------------------------------

create policy "membros leem" on public.ciclos
  for select to authenticated using (public.eh_membro(espaco_id));
create policy "membros inserem" on public.ciclos
  for insert to authenticated with check (public.eh_membro(espaco_id));
create policy "membros alteram" on public.ciclos
  for update to authenticated
  using (public.eh_membro(espaco_id)) with check (public.eh_membro(espaco_id));
create policy "membros excluem" on public.ciclos
  for delete to authenticated using (public.eh_membro(espaco_id));

create policy "membros leem" on public.categorias
  for select to authenticated using (public.eh_membro(espaco_id));
create policy "membros inserem" on public.categorias
  for insert to authenticated with check (public.eh_membro(espaco_id));
create policy "membros alteram" on public.categorias
  for update to authenticated
  using (public.eh_membro(espaco_id)) with check (public.eh_membro(espaco_id));
create policy "membros excluem" on public.categorias
  for delete to authenticated using (public.eh_membro(espaco_id));

create policy "membros leem" on public.formas_pagamento
  for select to authenticated using (public.eh_membro(espaco_id));
create policy "membros inserem" on public.formas_pagamento
  for insert to authenticated with check (public.eh_membro(espaco_id));
create policy "membros alteram" on public.formas_pagamento
  for update to authenticated
  using (public.eh_membro(espaco_id)) with check (public.eh_membro(espaco_id));
create policy "membros excluem" on public.formas_pagamento
  for delete to authenticated using (public.eh_membro(espaco_id));

create policy "membros leem" on public.lancamentos
  for select to authenticated using (public.eh_membro(espaco_id));
-- Quem insere fica registrado como criado_por; não dá para lançar em nome do outro.
create policy "membros inserem" on public.lancamentos
  for insert to authenticated
  with check (public.eh_membro(espaco_id) and criado_por = (select auth.uid()));
create policy "membros alteram" on public.lancamentos
  for update to authenticated
  using (public.eh_membro(espaco_id)) with check (public.eh_membro(espaco_id));
create policy "membros excluem" on public.lancamentos
  for delete to authenticated using (public.eh_membro(espaco_id));
