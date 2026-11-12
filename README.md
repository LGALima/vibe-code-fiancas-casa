# Finanças da Casa

App web para o casal controlar ganhos, gastos e ciclos financeiros. Next.js (App Router) + Supabase. A especificação está em [docs/planejamento.md](docs/planejamento.md).

## Rodar localmente

Requisitos: Node.js 20 ou mais novo e um projeto no [Supabase](https://supabase.com).

1. Instale as dependências:

   ```bash
   npm install
   ```

2. Copie `.env.example` para `.env.local` e preencha com a **Project URL** e a chave **anon / publishable**. As duas ficam no painel do Supabase, em *Project Settings → API*. Nunca use a chave `service_role` aqui.

3. No painel do Supabase, em *Authentication → URL Configuration*:
   - **Site URL**: `http://localhost:3000`
   - **Redirect URLs**: adicione `http://localhost:3000/auth/callback`

4. Para o botão **Entrar com Google**, ative o provedor Google em *Authentication → Sign In / Providers*. Você vai precisar de um Client ID e de um Client Secret do Google Cloud, com `https://<seu-projeto>.supabase.co/auth/v1/callback` como URI de redirecionamento autorizado. O link mágico por e-mail já vem ativo.

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
- `src/app/login`, `src/app/auth/callback`: login com link mágico e Google, e o retorno do login.
- `src/app/(app)/`: telas logadas (Início, Lançar, Análises, Ciclos, Cadastros) com a barra inferior.
