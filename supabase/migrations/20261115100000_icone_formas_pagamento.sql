-- Ícone nas formas de pagamento (Pix, cartão, dinheiro, TED, cripto…).
--
-- A chave fica salva em formas_pagamento.icone; o app traduz para o desenho
-- (lista em src/lib/cadastros.ts, ICONES_FORMA). Quando o ícone não é
-- informado, um gatilho sugere um pelo nome: vale para as formas que já
-- existem (preenchidas abaixo) e para os cadastros padrão de espaço novo.

-- ---------------------------------------------------------------------------
-- Sugestão pelo nome (pura; usada pelo gatilho e pelo preenchimento inicial).
-- ---------------------------------------------------------------------------

create function privado.icone_sugerido_forma(p_nome text, p_eh_credito boolean)
returns text
language sql
immutable
set search_path = ''
as $$
  select case
    when n ~ 'pix' then 'pix'
    when n ~ 'cripto|bitcoin|\mbtc\M|usdt|ethereum' then 'bitcoin'
    when n ~ 'boleto' then 'barcode'
    when n ~ 'd[eé]bito autom' then 'repeat'
    when p_eh_credito or n ~ 'cr[eé]dito' then 'credit-card'
    when n ~ 'd[eé]bito' then 'wallet-cards'
    when n ~ 'cart[aã]o' then 'credit-card'
    when n ~ 'dinheiro|esp[eé]cie' then 'banknote'
    when n ~ '\mted\M|\mdoc\M|transfer' then 'arrow-left-right'
    when n ~ 'vale.?refei|\mvr\M' then 'utensils'
    when n ~ 'vale.?alim|\mva\M' then 'shopping-basket'
    when n ~ 'poupan' then 'piggy-bank'
    when n ~ 'cashback|pontos|milhas' then 'coins'
    when n ~ 'carteira digital|mercado ?pago|picpay|paypal|apple ?pay|google ?pay|samsung ?pay' then 'smartphone'
    else 'wallet'
  end
  from (select lower(coalesce(p_nome, '')) as n) as x;
$$;

-- ---------------------------------------------------------------------------
-- Coluna, preenchimento das formas existentes e obrigatoriedade.
-- ---------------------------------------------------------------------------

alter table public.formas_pagamento add column icone text;

update public.formas_pagamento
  set icone = privado.icone_sugerido_forma(nome, eh_credito);

alter table public.formas_pagamento
  alter column icone set not null,
  add constraint formas_pagamento_icone_valido
    check (icone ~ '^[a-z0-9-]{1,40}$');

-- ---------------------------------------------------------------------------
-- Gatilho: sem ícone informado, usa a sugestão pelo nome.
-- ---------------------------------------------------------------------------

create function privado.formas_pagamento_sugerir_icone()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.icone is null then
    new.icone := privado.icone_sugerido_forma(new.nome, new.eh_credito);
  end if;
  return new;
end;
$$;

create trigger formas_pagamento_sugerir_icone
  before insert on public.formas_pagamento
  for each row execute function privado.formas_pagamento_sugerir_icone();

revoke execute on function privado.icone_sugerido_forma(text, boolean) from public, anon, authenticated;
revoke execute on function privado.formas_pagamento_sugerir_icone() from public, anon, authenticated;
