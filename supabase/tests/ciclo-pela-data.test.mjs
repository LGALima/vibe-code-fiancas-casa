// A data do lançamento define o ciclo (trigger lancamentos_definir_ciclo).

import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import { comoAdmin, comoUsuario, criarBanco } from "./banco.mjs";

const ANA = "00000000-0000-4000-8000-00000000000a";

let db;
let casa;
let nov;
let dez;
let categoria;
let forma;

async function um(sql, params) {
  const { rows } = await db.query(sql, params);
  return rows[0];
}

async function lancar(data, cicloEnviado) {
  return um(
    `insert into public.lancamentos
       (espaco_id, ciclo_id, tipo, descricao, valor_real, categoria_id, forma_pagamento_id, data)
     values ($1, $2, 'gasto', 'Teste', 10, $3, $4, $5) returning id, ciclo_id`,
    [casa, cicloEnviado, categoria, forma, data],
  );
}

before(async () => {
  ({ db } = await criarBanco());
  await comoAdmin(db);
  await db.query("insert into auth.users (id, email) values ($1, 'ana@ex.com')", [ANA]);
  await comoUsuario(db, ANA);
  casa = (await um("select public.criar_espaco('Casa') as id")).id;
  nov = (
    await um(
      "insert into public.ciclos (espaco_id, nome, data_inicio, data_fim) values ($1, 'Novembro/2026', '2026-11-03', '2026-12-02') returning id",
      [casa],
    )
  ).id;
  dez = (
    await um(
      "insert into public.ciclos (espaco_id, nome, data_inicio, data_fim) values ($1, 'Dezembro/2026', '2026-12-03', '2027-01-02') returning id",
      [casa],
    )
  ).id;
  categoria = (await um("select id from public.categorias where espaco_id = $1 limit 1", [casa])).id;
  forma = (await um("select id from public.formas_pagamento where espaco_id = $1 limit 1", [casa])).id;
});

after(async () => {
  await db?.close();
});

describe("a data define o ciclo", () => {
  test("ao inserir, usa o ciclo da data mesmo que outro seja enviado", async () => {
    const l = await lancar("2026-12-10", nov);
    assert.equal(l.ciclo_id, dez);
  });

  test("bordas do ciclo", async () => {
    assert.equal((await lancar("2026-12-02", dez)).ciclo_id, nov);
    assert.equal((await lancar("2026-12-03", nov)).ciclo_id, dez);
    assert.equal((await lancar("2027-01-02", nov)).ciclo_id, dez);
  });

  test("mudar a data move o lançamento de ciclo", async () => {
    const l = await lancar("2026-12-10", dez);
    const depois = await um(
      "update public.lancamentos set data = '2026-11-20' where id = $1 returning ciclo_id",
      [l.id],
    );
    assert.equal(depois.ciclo_id, nov);
  });

  test("não dá para forçar outro ciclo editando só o ciclo_id", async () => {
    const l = await lancar("2026-12-10", dez);
    const depois = await um(
      "update public.lancamentos set ciclo_id = $2 where id = $1 returning ciclo_id",
      [l.id, nov],
    );
    assert.equal(depois.ciclo_id, dez);
  });

  test("sem ciclo para a data, o lançamento é recusado", async () => {
    await assert.rejects(lancar("2027-03-10", dez), /Não há ciclo que contenha a data 10\/03\/2027/);
  });

  test("editar outros campos não mexe no ciclo", async () => {
    const l = await lancar("2026-12-10", dez);
    const depois = await um(
      "update public.lancamentos set valor_real = 99 where id = $1 returning ciclo_id",
      [l.id],
    );
    assert.equal(depois.ciclo_id, dez);
  });
});
