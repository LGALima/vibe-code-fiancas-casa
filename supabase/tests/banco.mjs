// Sobe um Postgres em memória (PGlite), imita o básico do Supabase e aplica
// todas as migrações de supabase/migrations/ em ordem, do zero.

import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PGlite } from "@electric-sql/pglite";

const aqui = path.dirname(fileURLToPath(import.meta.url));
const pastaMigracoes = path.join(aqui, "..", "migrations");

export async function criarBanco() {
  const db = new PGlite();
  await db.exec(await readFile(path.join(aqui, "supabase-stub.sql"), "utf8"));

  const arquivos = (await readdir(pastaMigracoes))
    .filter((nome) => nome.endsWith(".sql"))
    .sort();

  for (const arquivo of arquivos) {
    const sql = await readFile(path.join(pastaMigracoes, arquivo), "utf8");
    try {
      await db.exec(sql);
    } catch (erro) {
      throw new Error(`Falha ao aplicar ${arquivo}: ${erro.message}`, {
        cause: erro,
      });
    }
  }

  return { db, migracoes: arquivos };
}

/** Volta a ser o dono do banco (como o painel/SQL editor do Supabase). */
export async function comoAdmin(db) {
  await db.exec(
    "reset role; select set_config('request.jwt.claim.sub', '', false);",
  );
}

/** Passa a agir como um usuário logado, igual a uma requisição da API. */
export async function comoUsuario(db, userId) {
  await db.query("select set_config('request.jwt.claim.sub', $1, false)", [
    userId,
  ]);
  await db.exec("set role authenticated");
}

/** Visitante sem login (chave publishable sem sessão). */
export async function comoAnonimo(db) {
  await db.exec(
    "select set_config('request.jwt.claim.sub', '', false); set role anon;",
  );
}
