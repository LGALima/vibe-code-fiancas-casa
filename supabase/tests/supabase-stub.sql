-- Imitação mínima do que o Supabase já traz pronto, para rodar as migrações
-- num Postgres limpo (PGlite) nos testes. NÃO é uma migração: o Supabase real
-- já tem tudo isto.

create role anon nologin;
create role authenticated nologin;
create role service_role nologin bypassrls;

create schema auth;

create table auth.users (
  id uuid primary key,
  email text
);

-- Igual ao auth.uid() do Supabase: lê o "sub" do JWT da requisição.
create function auth.uid()
returns uuid
language sql
stable
as $$
  select nullif(
    coalesce(
      current_setting('request.jwt.claim.sub', true),
      current_setting('request.jwt.claims', true)::jsonb ->> 'sub'
    ),
    ''
  )::uuid
$$;

grant usage on schema auth to anon, authenticated, service_role;
grant execute on function auth.uid() to anon, authenticated, service_role;

grant usage on schema public to anon, authenticated, service_role;

-- Como no Supabase: tabelas novas em public ficam acessíveis à API
-- (quem decide o que cada um vê é o RLS).
alter default privileges in schema public
  grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public
  grant all on sequences to anon, authenticated, service_role;
alter default privileges in schema public
  grant execute on functions to anon, authenticated, service_role;
