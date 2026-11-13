-- Esquema inicial do Finanças da Casa.
-- Modelo consolidado de docs/planejamento.md ("Modelo de dados" + "Uso compartilhado"):
-- toda tabela de dados pertence a um espaço (a casa) e só membros do espaço a enxergam.
-- A segurança (RLS) está na migração seguinte.

-- ---------------------------------------------------------------------------
-- Espaços e membros
-- ---------------------------------------------------------------------------

create table public.espacos (
  id uuid primary key default gen_random_uuid(),
  nome text not null check (length(btrim(nome)) > 0),
  -- Código curto que o outro membro digita para entrar no espaço.
  codigo_convite text not null unique
    default upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8))
    check (codigo_convite ~ '^[A-Z0-9]{6,32}$'),
  criado_em timestamptz not null default now()
);

create table public.membros (
  espaco_id uuid not null references public.espacos (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  nome_exibicao text,
  criado_em timestamptz not null default now(),
  primary key (espaco_id, user_id)
);

-- eh_membro() procura por user_id: precisa deste índice.
create index membros_user_id_idx on public.membros (user_id);

create table public.configuracoes (
  espaco_id uuid primary key references public.espacos (id) on delete cascade,
  dia_inicio_ciclo integer not null default 3
    check (dia_inicio_ciclo between 1 and 28),
  moeda text not null default 'BRL' check (moeda ~ '^[A-Z]{3}$')
);

-- ---------------------------------------------------------------------------
-- Cadastros
-- ---------------------------------------------------------------------------

create table public.ciclos (
  id uuid primary key default gen_random_uuid(),
  espaco_id uuid not null references public.espacos (id) on delete cascade,
  nome text not null check (length(btrim(nome)) > 0),
  data_inicio date not null,
  data_fim date not null,
  ciclo_origem_id uuid,
  criado_em timestamptz not null default now(),
  check (data_fim >= data_inicio),
  -- Alvo das chaves estrangeiras compostas: garante que referências
  -- apontem para linhas do mesmo espaço.
  unique (espaco_id, id),
  foreign key (espaco_id, ciclo_origem_id)
    references public.ciclos (espaco_id, id)
    on delete set null (ciclo_origem_id)
);

create index ciclos_espaco_inicio_idx on public.ciclos (espaco_id, data_inicio desc);

create table public.categorias (
  id uuid primary key default gen_random_uuid(),
  espaco_id uuid not null references public.espacos (id) on delete cascade,
  nome text not null check (length(btrim(nome)) > 0),
  tipo text not null check (tipo in ('gasto', 'ganho', 'ambos')),
  cor text check (cor ~ '^#[0-9A-Fa-f]{6}$'),
  icone text,
  ativa boolean not null default true,
  unique (espaco_id, id)
);

create unique index categorias_espaco_nome_idx
  on public.categorias (espaco_id, lower(nome));

create table public.formas_pagamento (
  id uuid primary key default gen_random_uuid(),
  espaco_id uuid not null references public.espacos (id) on delete cascade,
  nome text not null check (length(btrim(nome)) > 0),
  eh_credito boolean not null default false,
  ativa boolean not null default true,
  unique (espaco_id, id)
);

create unique index formas_pagamento_espaco_nome_idx
  on public.formas_pagamento (espaco_id, lower(nome));

-- ---------------------------------------------------------------------------
-- Lançamentos (gastos e ganhos)
-- ---------------------------------------------------------------------------

create table public.lancamentos (
  id uuid primary key default gen_random_uuid(),
  espaco_id uuid not null references public.espacos (id) on delete cascade,
  ciclo_id uuid not null,
  tipo text not null check (tipo in ('gasto', 'ganho')),
  descricao text not null check (length(btrim(descricao)) > 0),
  recorrente boolean not null default false,
  -- Dinheiro sempre numeric(12,2), positivo; o sinal vem do tipo.
  estimativa numeric(12, 2) check (estimativa >= 0),
  valor_real numeric(12, 2) check (valor_real >= 0),
  categoria_id uuid not null,
  forma_pagamento_id uuid not null,
  data date not null,
  parcela_atual integer,
  total_parcelas integer,
  grupo_id uuid,       -- liga as parcelas de uma mesma compra
  vinculado_id uuid,   -- liga empréstimo (gasto) ao reembolso (ganho)
  observacao text,
  criado_por uuid default auth.uid() references auth.users (id) on delete set null,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),

  constraint lancamentos_estimativa_ou_real
    check (estimativa is not null or valor_real is not null),
  constraint lancamentos_parcelas
    check (
      -- Os dois vazios (não parcelado) ou os dois preenchidos e coerentes.
      -- O "is not null" explícito importa: um check que dá NULL é aceito.
      (parcela_atual is null and total_parcelas is null)
      or (
        parcela_atual is not null
        and total_parcelas is not null
        and parcela_atual between 1 and total_parcelas
      )
    ),

  unique (espaco_id, id),
  foreign key (espaco_id, ciclo_id)
    references public.ciclos (espaco_id, id) on delete cascade,
  foreign key (espaco_id, categoria_id)
    references public.categorias (espaco_id, id),
  foreign key (espaco_id, forma_pagamento_id)
    references public.formas_pagamento (espaco_id, id),
  foreign key (espaco_id, vinculado_id)
    references public.lancamentos (espaco_id, id)
    on delete set null (vinculado_id)
);

create index lancamentos_espaco_ciclo_idx on public.lancamentos (espaco_id, ciclo_id);
create index lancamentos_ciclo_data_idx on public.lancamentos (ciclo_id, data);
create index lancamentos_grupo_idx on public.lancamentos (grupo_id) where grupo_id is not null;
create index lancamentos_categoria_idx on public.lancamentos (categoria_id);
create index lancamentos_forma_pagamento_idx on public.lancamentos (forma_pagamento_id);

-- Impede trocar o autor de um lançamento e mantém atualizado_em em dia.
-- (Virar nulo é permitido: é o que acontece quando a conta do autor é excluída.)
create function public.lancamentos_antes_de_atualizar()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.criado_por is not null then
    new.criado_por := old.criado_por;
  end if;
  new.criado_em := old.criado_em;
  new.atualizado_em := now();
  return new;
end;
$$;

create trigger lancamentos_antes_de_atualizar
  before update on public.lancamentos
  for each row execute function public.lancamentos_antes_de_atualizar();
