// Editar e excluir ciclos.

import assert from "node:assert/strict";
import { after, before, beforeEach, describe, test } from "node:test";
import { comoAdmin, comoUsuario, criarBanco } from "./banco.mjs";

const ANA = "00000000-0000-4000-8000-00000000000a";
const CAIO = "00000000-0000-4000-8000-00000000000c";

let db;
let casa;
let categoria;
let forma;

async function um(sql, params) {
  const { rows } = await db.query(sql, params);
  return rows[0];
}

async function criarCiclo(nome, inicio, fim) {
  return (
    await um(
      "insert into public.ciclos (espaco_id, nome, data_inicio, data_fim) values ($1, $2, $3, $4) returning id",
      [casa, nome, inicio, fim],
    )
  ).id;
}

async function lancar(data, ciclo) {
  return (
    await um(
      `insert into public.lancamentos
         (espaco_id, ciclo_id, tipo, descricao, valor_real, categoria_id, forma_pagamento_id, data)
       values ($1, $2, 'gasto', 'Teste', 10, $3, $4, $5) returning id`,
      [casa, ciclo, categoria, forma, data],
    )
  ).id;
}

async function cicloDe(id) {
  return (await um("select ciclo_id from public.lancamentos where id = $1", [id]))?.ciclo_id ?? null;
}

before(async () => {
  ({ db } = await criarBanco());
  await comoAdmin(db);
  await db.query(
    "insert into auth.users (id, email) values ($1, 'ana@ex.com'), ($2, 'caio@ex.com')",
    [ANA, CAIO],
  );
  await comoUsuario(db, CAIO);
  await um("select public.criar_espaco('Casa do Caio')");
  await comoUsuario(db, ANA);
  casa = (await um("select public.criar_espaco('Casa') as id")).id;
  categoria = (await um("select id from public.categorias where espaco_id = $1 limit 1", [casa])).id;
  forma = (await um("select id from public.formas_pagamento where espaco_id = $1 limit 1", [casa])).id;
});

beforeEach(async () => {
  await comoUsuario(db, ANA);
  await db.query("delete from public.ciclos where espaco_id = $1", [casa]);
});

after(async () => {
  await db?.close();
});

describe("excluir ciclo", () => {
  test("apaga todos os lançamentos do ciclo e só eles", async () => {
    const nov = await criarCiclo("Nov", "2026-11-03", "2026-12-02");
    const dez = await criarCiclo("Dez", "2026-12-03", "2027-01-02");
    const a = await lancar("2026-11-10", nov);
    const b = await lancar("2026-11-20", nov);
    const c = await lancar("2026-12-10", dez);

    const r = await db.query("delete from public.ciclos where id = $1", [nov]);
    assert.equal(r.affectedRows, 1);

    const { rows } = await db.query("select id from public.lancamentos where id = any($1)", [[a, b, c]]);
    assert.deepEqual(rows.map((x) => x.id), [c]);
  });

  test("quem não é membro não exclui", async () => {
    const nov = await criarCiclo("Nov", "2026-11-03", "2026-12-02");
    const a = await lancar("2026-11-10", nov);
    await comoUsuario(db, CAIO);
    const r = await db.query("delete from public.ciclos where id = $1", [nov]);
    assert.equal(r.affectedRows, 0);
    await comoUsuario(db, ANA);
    assert.equal(await cicloDe(a), nov);
  });
});

describe("editar ciclo", () => {
  test("renomear não mexe nos lançamentos", async () => {
    const nov = await criarCiclo("Nov", "2026-11-03", "2026-12-02");
    const a = await lancar("2026-11-10", nov);
    await db.query("update public.ciclos set nome = 'Novembro/2026' where id = $1", [nov]);
    assert.equal(await cicloDe(a), nov);
  });

  test("encolher um ciclo move os lançamentos da borda para o vizinho", async () => {
    const nov = await criarCiclo("Nov", "2026-11-03", "2026-12-05");
    const dez = await criarCiclo("Dez", "2026-12-06", "2027-01-05");
    const borda = await lancar("2026-12-04", nov);
    const meio = await lancar("2026-11-20", nov);
    // O salário entrou no dia 3: Dezembro passa a começar antes...
    await db.query("update public.ciclos set data_inicio = '2026-12-03' where id = $1", [dez]);
    assert.equal(await cicloDe(borda), dez, "dia 04/12 agora é de Dezembro");
    // ...e Novembro termina na véspera.
    await db.query("update public.ciclos set data_fim = '2026-12-02' where id = $1", [nov]);
    assert.equal(await cicloDe(borda), dez);
    assert.equal(await cicloDe(meio), nov);
  });

  test("não deixa lançamento sem ciclo", async () => {
    const nov = await criarCiclo("Nov", "2026-11-03", "2026-12-02");
    const a = await lancar("2026-11-30", nov);
    await assert.rejects(
      db.query("update public.ciclos set data_fim = '2026-11-25' where id = $1", [nov]),
      /1 lançamento\(s\) ficariam sem ciclo \(o primeiro em 30\/11\/2026\)/,
    );
    assert.equal(await cicloDe(a), nov);
  });

  test("aumentar um ciclo puxa os lançamentos que passam a caber nele", async () => {
    const nov = await criarCiclo("Nov", "2026-11-03", "2026-12-02");
    const especial = await criarCiclo("Especial", "2026-11-20", "2026-11-21");
    const a = await lancar("2026-11-25", nov);
    assert.equal(await cicloDe(a), nov);
    // Ciclos sobrepostos: vale o que começou por último.
    await db.query("update public.ciclos set data_fim = '2026-11-30' where id = $1", [especial]);
    assert.equal(await cicloDe(a), especial);
  });

  test("criar um ciclo por cima puxa os lançamentos do período", async () => {
    const nov = await criarCiclo("Nov", "2026-11-03", "2026-12-02");
    const a = await lancar("2026-11-28", nov);
    const novo = await criarCiclo("Fim de mês", "2026-11-27", "2026-12-02");
    assert.equal(await cicloDe(a), novo);
  });
});
