// Totais do ciclo (view resumo_ciclo).
// Critério de aceite: os totais batem com uma soma manual de um ciclo de teste.

import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import { comoAdmin, comoAnonimo, comoUsuario, criarBanco } from "./banco.mjs";

const ANA = "00000000-0000-4000-8000-00000000000a";
const BIA = "00000000-0000-4000-8000-00000000000b";
const CAIO = "00000000-0000-4000-8000-00000000000c";

// Ciclo de teste: [tipo, descrição, estimativa, valor real, quem lançou]
const LANCAMENTOS = [
  ["ganho", "Salário 2ª parte", 5000.0, null, ANA], //   Previsto
  ["ganho", "Salário 1ª parte", 3000.0, 3100.0, BIA], //  Realizado (ganhou mais)
  ["ganho", "Venda usada", null, 200.0, ANA], //          Não planejado
  ["gasto", "Aluguel", 1500.0, null, ANA], //             Previsto
  ["gasto", "Mercado", 800.0, 750.35, BIA], //            Realizado (gastou menos)
  ["gasto", "Cinema", null, 60.1, ANA], //                Não planejado
  ["gasto", "Conta de luz", 0.1, 0.2, BIA], //            centavos
];

/** Soma manual, do jeito descrito em docs/planejamento.md. */
function somaManual() {
  let ganhosPrev = 0, ganhosReal = 0, gastosPrev = 0, gastosReal = 0;
  for (const [tipo, , estimativa, real] of LANCAMENTOS) {
    const previsto = real ?? estimativa;
    const realizado = real ?? 0;
    if (tipo === "ganho") {
      ganhosPrev += previsto;
      ganhosReal += realizado;
    } else {
      gastosPrev += previsto;
      gastosReal += realizado;
    }
  }
  const r = (n) => Math.round(n * 100) / 100;
  return {
    ganhos_previsto: r(ganhosPrev),
    ganhos_realizado: r(ganhosReal),
    gastos_previsto: r(gastosPrev),
    gastos_realizado: r(gastosReal),
    saldo_previsto: r(ganhosPrev - gastosPrev),
    saldo_realizado: r(ganhosReal - gastosReal),
  };
}

let db;
let casa;
let dez;
let jan;

async function um(sql, params) {
  const { rows } = await db.query(sql, params);
  return rows[0];
}

async function resumo(cicloId) {
  const r = await um("select * from public.resumo_ciclo where ciclo_id = $1", [cicloId]);
  if (!r) return null;
  const numeros = {};
  for (const k of [
    "ganhos_previsto",
    "ganhos_realizado",
    "gastos_previsto",
    "gastos_realizado",
    "saldo_previsto",
    "saldo_realizado",
  ]) {
    numeros[k] = Number(r[k]);
  }
  return { ...numeros, qtd_lancamentos: r.qtd_lancamentos, qtd_previstos: r.qtd_previstos };
}

before(async () => {
  ({ db } = await criarBanco());
  await comoAdmin(db);
  await db.query(
    "insert into auth.users (id, email) values ($1, 'ana@ex.com'), ($2, 'bia@ex.com'), ($3, 'caio@ex.com')",
    [ANA, BIA, CAIO],
  );
  await comoUsuario(db, CAIO);
  await um("select public.criar_espaco('Casa do Caio')");

  await comoUsuario(db, ANA);
  casa = (await um("select public.criar_espaco('Casa') as id")).id;
  const { codigo_convite } = await um("select codigo_convite from public.espacos where id = $1", [casa]);
  await comoUsuario(db, BIA);
  await um("select public.entrar_no_espaco($1)", [codigo_convite]);

  await comoUsuario(db, ANA);
  dez = (
    await um(
      "insert into public.ciclos (espaco_id, nome, data_inicio, data_fim) values ($1, 'Dezembro/2026', '2026-12-03', '2027-01-02') returning id",
      [casa],
    )
  ).id;
  jan = (
    await um(
      "insert into public.ciclos (espaco_id, nome, data_inicio, data_fim) values ($1, 'Janeiro/2027', '2027-01-03', '2027-02-02') returning id",
      [casa],
    )
  ).id;
  const cat = (await um("select id from public.categorias where espaco_id = $1 and tipo = 'gasto' limit 1", [casa])).id;
  const catGanho = (await um("select id from public.categorias where espaco_id = $1 and tipo = 'ganho' limit 1", [casa])).id;
  const forma = (await um("select id from public.formas_pagamento where espaco_id = $1 limit 1", [casa])).id;

  for (const [tipo, descricao, estimativa, real, quem] of LANCAMENTOS) {
    await comoUsuario(db, quem);
    await db.query(
      `insert into public.lancamentos
         (espaco_id, ciclo_id, tipo, descricao, estimativa, valor_real, categoria_id, forma_pagamento_id, data)
       values ($1, $2, $3, $4, $5, $6, $7, $8, '2026-12-10')`,
      [casa, dez, tipo, descricao, estimativa, real, tipo === "ganho" ? catGanho : cat, forma],
    );
  }
  // Um lançamento em outro ciclo, que não pode entrar na conta de Dezembro.
  await comoUsuario(db, ANA);
  await db.query(
    `insert into public.lancamentos
       (espaco_id, ciclo_id, tipo, descricao, valor_real, categoria_id, forma_pagamento_id, data)
     values ($1, $2, 'gasto', 'Outro ciclo', 999, $3, $4, '2027-01-10')`,
    [casa, jan, cat, forma],
  );
});

after(async () => {
  await db?.close();
});

describe("resumo_ciclo", () => {
  test("totais batem com a soma manual do ciclo de teste", async () => {
    await comoUsuario(db, ANA);
    const r = await resumo(dez);
    assert.deepEqual(
      {
        ganhos_previsto: r.ganhos_previsto,
        ganhos_realizado: r.ganhos_realizado,
        gastos_previsto: r.gastos_previsto,
        gastos_realizado: r.gastos_realizado,
        saldo_previsto: r.saldo_previsto,
        saldo_realizado: r.saldo_realizado,
      },
      somaManual(),
    );
  });

  test("valores conferidos à mão", async () => {
    await comoUsuario(db, ANA);
    const r = await resumo(dez);
    // Ganhos: previsto 5000 + 3100 + 200; realizado 3100 + 200
    assert.equal(r.ganhos_previsto, 8300);
    assert.equal(r.ganhos_realizado, 3300);
    // Gastos: previsto 1500 + 750,35 + 60,10 + 0,20; realizado 750,35 + 60,10 + 0,20
    assert.equal(r.gastos_previsto, 2310.65);
    assert.equal(r.gastos_realizado, 810.65);
    assert.equal(r.saldo_previsto, 5989.35);
    assert.equal(r.saldo_realizado, 2489.35);
    assert.equal(r.qtd_lancamentos, 7);
    assert.equal(r.qtd_previstos, 2);
  });

  test("valores do banco são exatos em centavos (numeric, não float)", async () => {
    await comoUsuario(db, ANA);
    const r = await um("select gastos_realizado::text as t from public.resumo_ciclo where ciclo_id = $1", [dez]);
    assert.equal(r.t, "810.65");
  });

  test("os dois membros veem os mesmos totais", async () => {
    await comoUsuario(db, ANA);
    const daAna = await resumo(dez);
    await comoUsuario(db, BIA);
    assert.deepEqual(await resumo(dez), daAna);
  });

  test("lançamento de outro ciclo não entra na conta", async () => {
    await comoUsuario(db, ANA);
    const r = await resumo(jan);
    assert.equal(r.gastos_realizado, 999);
    assert.equal(r.qtd_lancamentos, 1);
  });

  test("ciclo sem lançamentos aparece zerado", async () => {
    await comoUsuario(db, ANA);
    const vazio = (
      await um(
        "insert into public.ciclos (espaco_id, nome, data_inicio, data_fim) values ($1, 'Fevereiro/2027', '2027-02-03', '2027-03-02') returning id",
        [casa],
      )
    ).id;
    assert.deepEqual(await resumo(vazio), {
      ganhos_previsto: 0,
      ganhos_realizado: 0,
      gastos_previsto: 0,
      gastos_realizado: 0,
      saldo_previsto: 0,
      saldo_realizado: 0,
      qtd_lancamentos: 0,
      qtd_previstos: 0,
    });
  });

  test("confirmar um previsto muda só o realizado", async () => {
    await comoUsuario(db, ANA);
    const antes = await resumo(dez);
    await db.query(
      "update public.lancamentos set valor_real = estimativa where ciclo_id = $1 and descricao = 'Aluguel'",
      [dez],
    );
    const depois = await resumo(dez);
    assert.equal(depois.gastos_previsto, antes.gastos_previsto);
    assert.equal(depois.gastos_realizado, Math.round((antes.gastos_realizado + 1500) * 100) / 100);
    assert.equal(depois.qtd_previstos, antes.qtd_previstos - 1);
    await db.query(
      "update public.lancamentos set valor_real = null where ciclo_id = $1 and descricao = 'Aluguel'",
      [dez],
    );
  });

  test("quem é de outra casa não vê o resumo", async () => {
    await comoUsuario(db, CAIO);
    assert.equal(await resumo(dez), null);
    const { rows } = await db.query("select espaco_id from public.resumo_ciclo");
    assert.ok(rows.every((r) => r.espaco_id !== casa));
  });

  test("visitante sem login não lê a view", async () => {
    await comoAnonimo(db);
    await assert.rejects(db.query("select * from public.resumo_ciclo"), /permission denied/);
  });
});
