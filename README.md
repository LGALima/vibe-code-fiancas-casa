# Finanças da Casa

App web para o casal controlar ganhos, gastos e ciclos financeiros. Next.js (App Router) + Supabase. A especificação está em [docs/planejamento.md](docs/planejamento.md).

## Rodar localmente

Requisitos: Node.js 20 ou mais novo e um projeto no [Supabase](https://supabase.com).

1. Instale as dependências:

   ```bash
   npm install
   ```

2. Copie `.env.example` para `.env.local` e preencha:
   - `NEXT_PUBLIC_SUPABASE_URL`: a **Project URL**, em *Project Settings → Data API*.
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`: a **Publishable key** (`sb_publishable_...`), em *Project Settings → API Keys*.

   Nunca use a **secret key** (`sb_secret_...`) nem a `service_role` no app.

3. No painel do Supabase, em *Authentication → URL Configuration*:
   - **Site URL**: `http://localhost:3000`
   - **Redirect URLs**: adicione `http://localhost:3000/auth/callback`

4. O login é por **e-mail e senha**, que já vem ativo no Supabase. O cadastro envia um e-mail de confirmação, e "Esqueci minha senha" envia um link para criar uma nova. O serviço de e-mail incluso no Supabase só entrega para membros da equipe da organização e tem limite baixo de envios por hora. Para uso real, configure um SMTP próprio em *Authentication → Emails → SMTP Settings*.

5. Suba o servidor e abra http://localhost:3000:

   ```bash
   npm run dev
   ```

## Banco de dados

O banco fica todo em `supabase/migrations/`. Nunca altere o banco direto pelo painel: crie um arquivo novo de migração.

**Aplicar no Supabase.** Escolha um dos dois caminhos:
- **Pelo painel:** abra o *SQL Editor* e rode os arquivos de `supabase/migrations/` em ordem, um de cada vez.
- **Pelo CLI:** rode `npx supabase login`, depois `npx supabase link --project-ref <id-do-projeto>` e, por fim, `npx supabase db push`.

**Testar sem Supabase.** `npm test` sobe um Postgres em memória ([PGlite](https://pglite.dev)), aplica todas as migrações do zero e roda os testes de isolamento de `supabase/tests/`. Os testes provam que quem não é membro de um espaço não lê nem altera nada dele. Não precisa de Docker.

**Tipos.** Depois de mudar uma migração, rode `npm run db:types` para regenerar `src/types/database.ts`.

**Criar e compartilhar o espaço.** Ninguém insere direto em `espacos` ou `membros`; tudo passa por duas funções:
- `criar_espaco(nome)`: cria a casa, torna você membro e cria as configurações.
- `entrar_no_espaco(codigo)`: o outro membro entra usando o `codigo_convite` da casa.

## Scripts

| Comando         | O que faz                      |
| --------------- | ------------------------------ |
| `npm run dev`   | Servidor de desenvolvimento    |
| `npm run build` | Build de produção              |
| `npm run start` | Roda o build de produção       |
| `npm run lint`  | ESLint                         |
| `npm test`      | Migrações do zero + testes de isolamento do banco |
| `npm run db:types` | Regera `src/types/database.ts` |

## Estrutura

- `src/proxy.ts`: renova a sessão do Supabase a cada requisição e manda para `/login` quem não está logado. No Next 16, o antigo `middleware.ts` passou a se chamar `proxy.ts`.
- `src/lib/supabase/`: clientes do Supabase para o navegador (`client.ts`) e para o servidor (`server.ts`).
- `src/app/login`: entrar e criar conta com e-mail e senha.
- `src/app/recuperar-senha`, `src/app/redefinir-senha`: pedir o link de recuperação e criar a nova senha.
- `src/app/auth/callback`: retorno dos links enviados por e-mail (confirmação de cadastro e recuperação de senha).
- `src/app/(app)/`: telas logadas (Início, Lançar, Análises, Ciclos, Cadastros) com a barra inferior.
