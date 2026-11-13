// Testes das telas de Cadastros (no banco).
// Critério de aceite: alterações feitas por um membro aparecem para o outro.

import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import { comoAdmin, comoUsuario, criarBanco } from "./banco.mjs";

const ANA = "00000000-0000-4000-8000-00000000000a";
const BIA = "00000000-0000-4000-8000-00000000000b";

let db;
let casa;

async function um(sql, params) {
  const { rows } = await db.query(sql, params);
  return rows[0];
}

before(async () => {
  ({ db } = await criarBanco());
  await comoAdmin(db);
  await db.query(
    "insert into auth.users (id, email) values ($1, 'ana@ex.com'), ($2, 'bia@ex.com')",
    [ANA, BIA],
  );
  await comoUsuario(db, ANA);
  casa = (await um("select public.criar_espaco('Nossa casa', 'Ana') as id")).id;
  const { codigo_convite } = await um(
    "select codigo_convite from public.espacos where id = $1",
    [casa],
  );
  await comoUsuario(db, BIA);
  await um("select public.entrar_no_espaco($1, 'Bia')", [codigo_convite]);
});

after(async () => {
  await db?.close();
});

describe("o que um membro altera, o outro vê", () => {
  test("categoria criada pela Ana aparece para a Bia", async () => {
    await comoUsuario(db, ANA);
    await db.query(
      "insert into public.categorias (espaco_id, nome, tipo, cor, icone) values ($1, 'Mercado', 'gasto', '#16A34A', 'shopping-cart')",
      [casa],
    );
    await comoUsuario(db, BIA);
    const c = await um(
      "select tipo, cor, icone, ativa from public.categorias where espaco_id = $1 and nome = 'Mercado'",
      [casa],
    );
    assert.deepEqual(c, { tipo: "gasto", cor: "#16A34A", icone: "shopping-cart", ativa: true });
  });

  test("edição e desativação da Bia aparecem para a Ana", async () => {
    await comoUsuario(db, BIA);
    const r = await db.query(
      "update public.categorias set nome = 'Supermercado', cor = '#2563EB', icone = 'utensils', ativa = false where espaco_id = $1 and nome = 'Mercado'",
      [casa],
    );
    assert.equal(r.affectedRows, 1);
    await comoUsuario(db, ANA);
    const c = await um(
      "select nome, cor, icone, ativa from public.categorias where espaco_id = $1 and nome = 'Supermercado'",
      [casa],
    );
    assert.deepEqual(c, { nome: "Supermercado", cor: "#2563EB", icone: "utensils", ativa: false });
  });

  test("forma de pagamento criada e desativada é vista pelo outro", async () => {
    await comoUsuario(db, ANA);
    await db.query(
      "insert into public.formas_pagamento (espaco_id, nome, eh_credito) values ($1, 'Cartão Nubank', true)",
      [casa],
    );
    await comoUsuario(db, BIA);
    await db.query(
      "update public.formas_pagamento set ativa = false where espaco_id = $1 and nome = 'Cartão Nubank'",
      [casa],
    );
    await comoUsuario(db, ANA);
    const f = await um(
      "select eh_credito, ativa from public.formas_pagamento where espaco_id = $1 and nome = 'Cartão Nubank'",
      [casa],
    );
    assert.deepEqual(f, { eh_credito: true, ativa: false });
  });

  test("dia de início do ciclo alterado pela Bia vale para a Ana", async () => {
    await comoUsuario(db, BIA);
    await db.query(
      "update public.configuracoes set dia_inicio_ciclo = 5 where espaco_id = $1",
      [casa],
    );
    await comoUsuario(db, ANA);
    const c = await um(
      "select dia_inicio_ciclo from public.configuracoes where espaco_id = $1",
      [casa],
    );
    assert.equal(c.dia_inicio_ciclo, 5);
  });
});

describe("regras dos cadastros", () => {
  test("dia de início fica entre 1 e 28", async () => {
    await comoUsuario(db, ANA);
    for (const dia of [0, 29]) {
      await assert.rejects(
        db.query("update public.configuracoes set dia_inicio_ciclo = $2 where espaco_id = $1", [
          casa,
          dia,
        ]),
        /check constraint/,
      );
    }
  });

  test("nome repetido no mesmo espaço é recusado, sem diferenciar maiúsculas", async () => {
    await comoUsuario(db, ANA);
    await assert.rejects(
      db.query(
        "insert into public.categorias (espaco_id, nome, tipo) values ($1, 'lazer', 'gasto')",
        [casa],
      ),
      (e) => e.code === "23505",
    );
    await assert.rejects(
      db.query("insert into public.formas_pagamento (espaco_id, nome) values ($1, 'PIX')", [casa]),
      (e) => e.code === "23505",
    );
  });

  test("cor fora do formato é recusada", async () => {
    await comoUsuario(db, ANA);
    await assert.rejects(
      db.query(
        "insert into public.categorias (espaco_id, nome, tipo, cor) values ($1, 'Teste cor', 'gasto', 'azul')",
        [casa],
      ),
      /check constraint/,
    );
  });

  test("categoria e forma com lançamentos não podem ser excluídas; sem lançamentos, podem", async () => {
    await comoUsuario(db, ANA);
    const ciclo = (
      await um(
        "insert into public.ciclos (espaco_id, nome, data_inicio, data_fim) values ($1, 'Dez', '2026-12-03', '2027-01-02') returning id",
        [casa],
      )
    ).id;
    const lazer = (
      await um("select id from public.categorias where espaco_id = $1 and nome = 'Lazer'", [casa])
    ).id;
    const pix = (
      await um("select id from public.formas_pagamento where espaco_id = $1 and nome = 'Pix'", [
        casa,
      ])
    ).id;
    await db.query(
      `insert into public.lancamentos (espaco_id, ciclo_id, tipo, descricao, valor_real, categoria_id, forma_pagamento_id, data)
       values ($1, $2, 'gasto', 'Cinema', 40, $3, $4, '2026-12-05')`,
      [casa, ciclo, lazer, pix],
    );

    await assert.rejects(
      db.query("delete from public.categorias where id = $1", [lazer]),
      (e) => e.code === "23503",
    );
    await assert.rejects(
      db.query("delete from public.formas_pagamento where id = $1", [pix]),
      (e) => e.code === "23503",
    );

    // Desativar continua permitido e não mexe no lançamento.
    await db.query("update public.categorias set ativa = false where id = $1", [lazer]);
    const l = await um(
      "select count(*)::int as n from public.lancamentos where categoria_id = $1",
      [lazer],
    );
    assert.equal(l.n, 1);

    const streaming = (
      await um("select id from public.categorias where espaco_id = $1 and nome = 'Streaming'", [
        casa,
      ])
    ).id;
    const r = await db.query("delete from public.categorias where id = $1", [streaming]);
    assert.equal(r.affectedRows, 1);
  });
});
