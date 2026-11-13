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

## Scripts

| Comando         | O que faz                      |
| --------------- | ------------------------------ |
| `npm run dev`   | Servidor de desenvolvimento    |
| `npm run build` | Build de produção              |
| `npm run start` | Roda o build de produção       |
| `npm run lint`  | ESLint                         |

## Estrutura

- `src/proxy.ts`: renova a sessão do Supabase a cada requisição e manda para `/login` quem não está logado. No Next 16, o antigo `middleware.ts` passou a se chamar `proxy.ts`.
- `src/lib/supabase/`: clientes do Supabase para o navegador (`client.ts`) e para o servidor (`server.ts`).
- `src/app/login`: entrar e criar conta com e-mail e senha.
- `src/app/recuperar-senha`, `src/app/redefinir-senha`: pedir o link de recuperação e criar a nova senha.
- `src/app/auth/callback`: retorno dos links enviados por e-mail (confirmação de cadastro e recuperação de senha).
- `src/app/(app)/`: telas logadas (Início, Lançar, Análises, Ciclos, Cadastros) com a barra inferior.
