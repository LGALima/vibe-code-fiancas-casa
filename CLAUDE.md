# Finanças da Casa

App web para controle de finanças pessoais de um casal. Especificação completa em docs/planejamento.md — leia antes de cada tarefa.

## Stack
- Next.js (App Router) + TypeScript estrito
- Tailwind CSS + shadcn/ui
- Supabase (PostgreSQL, Auth, RLS) via @supabase/ssr
- Recharts para gráficos
- React Hook Form + Zod para formulários
- Hospedagem: Vercel

## Regras
- Interface, textos e mensagens em português do Brasil; valores em R$ (pt-BR), datas dd/mm/aaaa.
- Nomes de tabelas e colunas em português, sem acento, snake_case.
- Dinheiro sempre numeric(12,2) no banco; nunca float. No front, formatar com Intl.NumberFormat('pt-BR').
- Toda mudança de banco é um arquivo em supabase/migrations/ — nunca alterar o banco direto.
- Todas as tabelas de dados têm espaco_id e RLS liberando apenas membros do espaço.
- Nunca usar a chave service_role no código do navegador.
- Mobile first: toda tela deve funcionar bem em 375px de largura.
- Cada etapa termina com: lint e build sem erros, testes passando, PR aberto com resumo do que mudou e como testar.

## Conceitos do domínio
- Ciclo: o "fechamento de mês" que a pessoa escolher, para ver se o dinheiro sobrou ou faltou; começa no dia configurado (padrão 3) e vai até a véspera do próximo. Não mencionar salário na interface.
- Lançamento: gasto ou ganho; tem estimativa e/ou valor real (ao menos um).
- Status calculado: Previsto (só estimativa), Realizado (os dois), Não planejado (só real).
- Crédito conta no ciclo em que a compra foi feita; não há controle de fatura (regra interna, sem texto sobre fatura na interface).
- Espaço: a casa; os dois usuários são membros e veem os mesmos dados.