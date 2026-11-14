# Planejamento — App de Finanças Pessoais

Nov 12, 2026 · @Lucas Assis

## Visão geral

O app junta suas duas planilhas em uma só tela: cada lançamento nasce como **projeção** (estimativa) e vira **realizado** quando você informa o valor real. Assim a planilha de projeção e a do mês atual passam a ser duas visões do mesmo dado, sem digitar nada duas vezes.

O conceito central é o **Ciclo**: o "fechamento de mês" que a pessoa escolher, para ver se o dinheiro sobrou ou faltou. Ele não precisa seguir o calendário: começa no dia configurado e vai até a véspera do próximo ciclo. (No uso original do casal, o ciclo começa quando entra a 2ª parte do salário, dias 3 a 6; a interface não menciona salário.) Exemplo do ciclo Dezembro/2026:

| Data | Evento | Ciclo |
| --- | --- | --- |
| 03 a 06/12 | Salário — 2ª parte, com impostos (abre o ciclo) | Dezembro |
| 16/12 | Salário — 1ª parte, sem impostos | Dezembro |
| Ao longo do ciclo | Gastos no débito, Pix e crédito — o crédito conta como pago até o fim do ciclo | Dezembro |
| 03 a 06/01 | Salário — 2ª parte, abre o próximo ciclo | Janeiro/2027 |

Sugestão: guardar nas configurações o **dia padrão de início** como 3 (o primeiro dia possível da 2ª parte do salário), para que a 2ª parte do salário sempre abra o ciclo, e deixar as datas de cada ciclo editáveis. Os dois salários entram como dois ganhos recorrentes separados.

Três números ficam sempre no topo da tela: **Total de ganhos**, **Total de gastos** e **Saldo líquido** — cada um em duas versões, *previsto* e *realizado*.

## Funcionalidades

Gastos e ganhos usam o **mesmo cadastro** (um "Lançamento" com um campo Tipo). Isso simplifica o código, os gráficos e as regras de recorrência e parcelas.

| Campo | Tipo de dado | Obrigatório | Comportamento |
| --- | --- | --- | --- |
| Tipo | Gasto / Ganho | Sim | Define o sinal no saldo e a cor na tela |
| Descrição | Texto | Sim | Ex.: "Conta de água", "Salário", "Ração" |
| Recorrente | Sim / Não | Sim | Ao criar o próximo ciclo, o lançamento é copiado como projeção |
| Estimativa | Valor (R$) | Não | Valor esperado; editável durante o ciclo |
| Valor real | Valor (R$) | Só se não houver estimativa | Vazio = ainda pendente, exibido em destaque |
| Categoria | Lista cadastrada | Sim | Lazer, Essencial, Cachorro, Streaming, Educação, Empréstimo, Salário, Extra, Reembolso… |
| Forma de pagamento | Lista cadastrada | Sim | Débito, Pix, Crédito, Dinheiro, Transferência… |
| Data | Data | Sim | Data da compra ou do recebimento |
| Parcelado | Sim / Não | Sim | Liga os dois campos abaixo e força recorrência |
| Total de parcelas | Número | Se parcelado | Ex.: 10 |
| Parcela atual | Número | Se parcelado | Começa em 1 e sobe a cada ciclo |
| Observação | Texto | Não | Ex.: "emprestei para o João" |

**Cadastros auxiliares**

- **Categorias**: nome, tipo (gasto, ganho ou ambos), cor e ícone — a cor é reaproveitada em todos os gráficos.
- **Formas de pagamento**: nome e se é crédito (para mostrar o peso do crédito nos gráficos).
- **Configurações**: dia padrão de início do ciclo e moeda.

**Ações principais**

- Criar ciclo (vazio ou a partir do anterior).
- Adicionar lançamento rápido: valor, descrição e categoria em até 3 toques, o resto com valores padrão.
- "Confirmar valor": transforma uma estimativa em realizado com um toque (preenche o real com a estimativa ou deixa digitar).
- Duplicar, editar e excluir lançamentos; filtrar por tipo, categoria, forma de pagamento e status.

## Regras de negócio

**Status de cada lançamento** (calculado, não digitado):

| Status | Quando | Como aparece |
| --- | --- | --- |
| Previsto | Tem estimativa e não tem valor real | Texto em itálico, cor apagada, ícone de relógio |
| Realizado | Tem estimativa e valor real | Normal, com a diferença ao lado (ex.: "−R$ 10 vs. previsto" em verde) |
| Não planejado | Tem valor real e não tem estimativa | Normal, com uma etiqueta "extra" |

**Totais do ciclo**

- *Previsto* = soma de (valor real, se existir; senão a estimativa). É o seu "guia" de como o ciclo vai fechar.
- *Realizado* = soma apenas dos valores reais. É o que de fato já aconteceu.
- *Saldo líquido* = ganhos − gastos, nas duas versões.

**Criar o próximo ciclo a partir do atual**

1. Calcular as datas: início = fim do ciclo atual + 1 dia; fim = véspera do mesmo dia no mês seguinte.
2. Copiar todo lançamento marcado como recorrente, com valor real vazio e data avançada em 1 mês.
3. Na cópia, a estimativa pode ser a estimativa anterior ou o último valor real — deixar isso como opção na tela de criação.
4. Parcelados: copiar com parcela atual + 1. Se a parcela atual já era a última, não copiar.
5. Mostrar uma prévia ("12 recorrentes, 3 parcelas, 1 parcela encerrada") antes de confirmar.

**Pontos de atenção**

- *Cartão de crédito*: o que for lançado no crédito conta no ciclo em que a compra foi feita, considerando que será pago até o fim desse ciclo. O app não controla fechamento nem vencimento da fatura. Compras parceladas no crédito seguem a regra das parcelas: uma por ciclo.
- *Dinheiro emprestado*: ao lançar o gasto "Empréstimo", o app pode criar junto um ganho previsto "Pagamento de terceiro" (parcelado ou não), ligado ao gasto. Assim dá para ver quanto ainda falta receber.
- *Parcelas*: guardar um identificador do grupo de parcelas para editar "esta e as próximas" de uma vez.

## Modelo de dados

Cinco tabelas bastam. Todas têm `user_id`, mais um espaco\_id: você e sua esposa participam do mesmo espaço e veem os mesmos dados, e cada lançamento registra quem o criou (detalhes no fim desta seção).

| Tabela | Para que serve | Campos principais |
| --- | --- | --- |
| ciclos | O seu "mês" | nome, data\_inicio, data\_fim, ciclo\_origem\_id |
| lancamentos | Gastos e ganhos | ciclo\_id, tipo, descricao, recorrente, estimativa, valor\_real, categoria\_id, forma\_pagamento\_id, data, parcela\_atual, total\_parcelas, grupo\_id, vinculado\_id |
| categorias | Cadastro de categorias | nome, tipo, cor, icone, ativa |
| formas\_pagamento | Cadastro de formas de pagamento | nome, eh\_credito, ativa |
| configuracoes | Preferências | dia\_inicio\_ciclo, moeda |

Esquema pronto para colar no editor SQL do banco (PostgreSQL):

```sql
create table ciclos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  nome text not null,
  data_inicio date not null,
  data_fim date not null,
  ciclo_origem_id uuid references ciclos(id)
);

create table categorias (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  nome text not null,
  tipo text not null check (tipo in ('gasto','ganho','ambos')),
  cor text,
  icone text,
  ativa boolean default true
);

create table formas_pagamento (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  nome text not null,
  eh_credito boolean default false,
  ativa boolean default true
);

create table lancamentos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  ciclo_id uuid not null references ciclos(id) on delete cascade,
  tipo text not null check (tipo in ('gasto','ganho')),
  descricao text not null,
  recorrente boolean default false,
  estimativa numeric(12,2),
  valor_real numeric(12,2),
  categoria_id uuid references categorias(id),
  forma_pagamento_id uuid references formas_pagamento(id),
  data date not null,
  parcela_atual int,
  total_parcelas int,
  grupo_id uuid,          -- liga as parcelas de uma mesma compra
  vinculado_id uuid,      -- liga empréstimo (gasto) ao reembolso (ganho)
  observacao text,
  check (estimativa is not null or valor_real is not null)
);

-- Segurança: cada usuário só vê as próprias linhas (repetir para as 4 tabelas)
alter table lancamentos enable row level security;
create policy "dono" on lancamentos
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
```

O `check` final aplica a sua regra: valor real obrigatório quando não há estimativa. Valores em `numeric` (nunca `float`) evitam erros de centavos.

**Uso compartilhado (você e sua esposa)**

Um **espaço** é a "casa": os dois têm login próprio, entram no mesmo espaço e enxergam os mesmos ciclos, lançamentos e cadastros. A segurança passa a checar se a pessoa é membro do espaço, e não se ela é dona da linha. Ajustes no esquema acima:

```sql
create table espacos (
  id uuid primary key default gen_random_uuid(),
  nome text not null                -- ex.: "Nossa casa"
);

create table membros (
  espaco_id uuid references espacos(id) on delete cascade,
  user_id uuid not null,
  nome_exibicao text,               -- ex.: "Eu", "Esposa"
  primary key (espaco_id, user_id)
);

-- Em ciclos, categorias, formas_pagamento e lancamentos:
alter table lancamentos add column espaco_id uuid not null references espacos(id);
alter table lancamentos rename column user_id to criado_por;  -- quem lançou

-- Política: só membros do espaço leem e escrevem
create policy "membros do espaco" on lancamentos for all
  using (espaco_id in (select espaco_id from membros where user_id = auth.uid()))
  with check (espaco_id in (select espaco_id from membros where user_id = auth.uid()));
```

Com `criado_por`, dá para filtrar e fazer gráficos por pessoa ("quanto cada um gastou no ciclo"), além das visões por categoria, dia e forma de pagamento.

## Telas e dashboard

Cinco telas cobrem tudo; o app deve ser pensado primeiro para o celular, porque a maioria dos lançamentos acontece na hora da compra.

1. **Ciclo atual (início)**: seletor de ciclo no topo, três cartões grandes (Ganhos, Gastos, Saldo) com previsto x realizado e uma barra de progresso de quanto do previsto já foi gasto. Abaixo, a lista de lançamentos agrupada por dia, com os previstos pendentes em destaque.
2. **Novo / editar lançamento**: alternar Gasto/Ganho no topo, teclado numérico já aberto no valor, categorias como botões coloridos, interruptores para Recorrente e Parcelado.
3. **Análises**: os gráficos abaixo, com filtro de ciclo e de tipo.
4. **Ciclos**: lista de ciclos, botão "Criar próximo ciclo" com a prévia da regra de recorrência.
5. **Cadastros**: categorias, formas de pagamento e configurações.

**Gráficos e o formato indicado para cada um**

| Gráfico | Formato recomendado | Por quê |
| --- | --- | --- |
| Gastos por categoria | Barras horizontais ordenadas, previsto x realizado lado a lado | Compara categorias e mostra onde estourou; mais legível que pizza com 8+ categorias |
| Ganhos por categoria | Barras horizontais | Normalmente poucas categorias; ver o peso do salário x extras |
| Gastos por dia | Barras por dia + linha do acumulado | O acumulado mostra o ritmo do ciclo contra o previsto |
| Ganhos por dia | Barras por dia | Mostra quando o dinheiro entra |
| Gastos por forma de pagamento | Barra única empilhada em 100% ou rosca | Poucas fatias (Débito, Pix, Crédito); destaca o peso do crédito |
| Ganhos por forma de pagamento | Barra empilhada em 100% | Mesma lógica |
| Extra: evolução entre ciclos | Linhas de ganhos, gastos e saldo por ciclo | Mostra se você está melhorando mês a mês |

Use sempre a mesma cor por categoria em todos os gráficos (vem do cadastro) e verde/vermelho apenas para o saldo.

## Stack, hospedagem e banco de dados

Recomendação: **app web em Next.js hospedado na Vercel, com dados no Supabase** (PostgreSQL + login prontos). Para uso pessoal, o custo é R$ 0.

| Camada | Ferramenta | Custo | Por que |
| --- | --- | --- | --- |
| Front-end | [Next.js](https://nextjs.org) + TypeScript | Grátis | Padrão de mercado, roda direto na Vercel |
| Visual | [Tailwind CSS](https://tailwindcss.com) + [shadcn/ui](https://ui.shadcn.com) | Grátis | Componentes prontos (formulários, tabelas, diálogos) com bom visual |
| Gráficos | [Recharts](https://recharts.org) | Grátis | Barras, linhas e rosca em React com pouco código |
| Formulários | React Hook Form + Zod | Grátis | Validações como "valor real obrigatório sem estimativa" |
| Banco + login | [Supabase](https://supabase.com/pricing) | Grátis (plano Free) | PostgreSQL, autenticação e segurança por linha inclusos |
| Hospedagem | [Vercel](https://vercel.com/docs/plans/hobby) | Grátis (plano Hobby) | Deploy automático a cada `git push`, HTTPS incluso |
| Código | GitHub | Grátis | Versionamento e ligação com a Vercel |
| Celular | PWA (manifesto + ícone) | Grátis | "Instalar" o site na tela inicial sem publicar em loja |

**Limites dos planos gratuitos que importam para você**

- Supabase Free: 500 MB de banco, 50 mil usuários ativos por mês e até 2 projetos ativos. Mesmo com centenas de lançamentos por mês, você levaria muitos anos para chegar a 500 MB.
- O projeto gratuito do Supabase é pausado após 1 semana sem uso. Usando o app toda semana isso não acontece; se pausar, dá para reativar pelo painel.
- Backups automáticos não estão inclusos no Free. Inclua no app um botão "Exportar CSV" e faça uma cópia mensal. O plano Pro custa a partir de US$ 25/mês, se um dia quiser backups diários.
- Vercel Hobby: gratuito e restrito a uso pessoal e não comercial — exatamente o seu caso. Se virar produto pago, o Pro custa US$ 20/usuário/mês.

**Alternativas, se preferir outro caminho**

| Opção | Quando escolher |
| --- | --- |
| Firebase (Google) | Se preferir banco de documentos em vez de SQL; agregações para gráficos são mais trabalhosas |
| Neon (PostgreSQL) + Auth.js | Se quiser só o banco e montar o login por conta própria |
| Somente local (IndexedDB no navegador) | Zero servidor e total privacidade, mas sem sincronizar entre celular e computador |
| Flutter ou React Native | Se quiser app nativo nas lojas; mais complexo para o primeiro projeto |

Sobre segurança: são dados financeiros pessoais, então ative a segurança por linha (RLS) em todas as tabelas, nunca exponha a chave `service_role` no front-end e não guarde números de cartão ou conta — o app só precisa do nome da forma de pagamento.

## Roteiro de construção

Construa em quatro fases e comece a usar o app já no fim da Fase 2, em paralelo com o Excel, para validar os números.

**Fase 0 — Preparação**

- [ ] Criar contas no GitHub, Vercel e Supabase
- [ ] Criar o projeto Next.js (`npx create-next-app@latest`) e publicar o "Olá mundo" na Vercel
- [ ] Criar o projeto no Supabase e rodar o esquema da seção Modelo de dados
- [ ] Configurar login por e-mail (link mágico) do Supabase, criar o espaço compartilhado e convidar sua esposa

**Fase 1 — Cadastros e ciclo**

- [ ] Telas de categorias e formas de pagamento, já com as suas categorias atuais
- [ ] Criar ciclo manualmente (nome, início, fim)
- [ ] Cadastrar, editar e excluir lançamentos com todos os campos
- [ ] Lista do ciclo com status Previsto / Realizado / Não planejado

**Fase 2 — Totais e próximo ciclo (MVP utilizável)**

- [ ] Cartões de Ganhos, Gastos e Saldo, previsto x realizado
- [ ] Botão "Criar próximo ciclo" com recorrentes e parcelas
- [ ] Importar o Excel atual (CSV) para não perder o histórico
- [ ] Exportar CSV (seu backup)

**Fase 3 — Análises**

- [ ] Os seis gráficos da seção Telas e dashboard
- [ ] Filtros por ciclo, tipo, categoria e forma de pagamento
- [ ] Evolução entre ciclos

**Fase 4 — Polimento**

- [ ] PWA instalável no celular e modo escuro
- [ ] Vínculo empréstimo → reembolso
- [ ] Ideias da próxima seção que fizerem sentido

## Skills, insights e ideias futuras

**O que estudar, na ordem em que você vai precisar**

| Skill | Para quê no app | Onde aprender |
| --- | --- | --- |
| HTML, CSS e JavaScript básico | Base de tudo | [MDN Web Docs](https://developer.mozilla.org/pt-BR/) |
| TypeScript | Evitar erros em valores e datas | [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html) |
| React + Next.js | Telas, formulários e navegação | [Next.js Learn](https://nextjs.org/learn) (curso gratuito que já usa banco e deploy na Vercel) |
| SQL e PostgreSQL | Totais por categoria, dia e forma de pagamento | [Supabase Docs](https://supabase.com/docs) |
| Git e GitHub | Versionar e publicar | [GitHub Docs](https://docs.github.com/pt) |
| Visualização de dados | Gráficos claros | [Documentação do Recharts](https://recharts.org) |

**Ferramentas que aceleram a construção**

- **Claude Code**: escreve e altera o código do projeto a partir das regras deste documento — você pode colar uma seção (ex.: "Criar o próximo ciclo") e pedir a implementação.
- **VS Code**: editor de código gratuito.
- **Painel do Supabase**: editor de tabelas parecido com planilha, útil para conferir dados enquanto desenvolve.
- **Figma** (opcional): desenhar as telas antes de programar.

**Insights para o app ficar melhor que o Excel**

- O maior ganho é a velocidade de lançar: se registrar um gasto levar mais de 10 segundos, você volta para a planilha. Priorize o formulário rápido.
- Mostre a diferença previsto x realizado por categoria: é aí que aparecem os vazamentos (ex.: lazer sempre 30% acima).
- Um número só resume o ciclo: "quanto ainda posso gastar até o próximo salário" = saldo previsto ÷ dias restantes do ciclo.
- Mantenha as categorias enxutas (8 a 12). Muitas categorias deixam os gráficos ilegíveis.

**Ideias para depois do MVP**

- Orçamento por categoria com alerta ao passar de 80%.
- Visão da fatura do cartão: soma do crédito no ciclo e parcelas futuras já comprometidas.
- Lembretes de contas a vencer (notificação do PWA).
- Importar extrato do banco em CSV ou OFX para sugerir lançamentos.
- Metas de economia (ex.: reserva de emergência) com progresso por ciclo.
- Divisão por pessoa: quanto cada um ganhou e gastou no ciclo, e quem deve quanto a quem.

## Fontes

- [Supabase — preços e limites do plano Free](https://supabase.com/pricing)
- [Vercel — plano Hobby](https://vercel.com/docs/plans/hobby-plan)

Preços e limites consultados em novembro de 2026; confira antes de assinar qualquer plano pago.
