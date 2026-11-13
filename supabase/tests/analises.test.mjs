// Agregações da tela Análises (analise_ciclo e evolucao_ciclos).
// Critério de aceite: os totais dos gráficos batem com os cartões do Início
// (view resumo_ciclo).

import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import { comoAdmin, comoAnonimo, comoUsuario, criarBanco } from "./banco.mjs";

const ANA = "00000000-0000-4000-8000-00000000000a";
const BIA = "00000000-0000-4000-8000-00000000000b";
const CAIO = "00000000-0000-4000-8000-00000000000c";

let db;
let casa;
let nov;
let dez;
const cat = {};
const forma = {};

const n = (v) => Number(v);
const r2 = (v) => Math.round(v * 100) / 100;
const soma = (itens, campo) => r2(itens.reduce((t, i) => t + n(i[campo]), 0));

async function um(sql, params) {
  const { rows } = await db.query(sql, params);
  return rows[0];
}

async function analise(cicloId, pessoa = null) {
  return (await um("select public.analise_ciclo($1, $2) as a", [cicloId, pessoa])).a;
}

async function lancar(quem, tipo, descricao, data, estimativa, real, categoria, formaNome) {
  await comoUsuario(db, quem);
  await db.query(
    `insert into public.lancamentos
       (espaco_id, ciclo_id, tipo, descricao, estimativa, valor_real, categoria_id, forma_pagamento_id, data)
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
    [casa, nov, tipo, descricao, estimativa, real, cat[categoria], forma[formaNome], data],
  );
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
  for (const { id, nome } of (await db.query("select id, nome from public.categorias where espaco_id = $1", [casa])).rows) {
    cat[nome] = id;
  }
  for (const { id, nome } of (await db.query("select id, nome from public.formas_pagamento where espaco_id = $1", [casa])).rows) {
    forma[nome] = id;
  }
  nov = (await um(
    "insert into public.ciclos (espaco_id, nome, data_inicio, data_fim) values ($1, 'Novembro/2026', '2026-11-06', '2026-12-05') returning id",
    [casa],
  )).id;
  dez = (await um(
    "insert into public.ciclos (espaco_id, nome, data_inicio, data_fim) values ($1, 'Dezembro/2026', '2026-12-06', '2027-01-05') returning id",
    [casa],
  )).id;

  //            quem  tipo     descrição        data          estim   real     categoria     forma
  await lancar(ANA, "ganho", "Salário 2ª", "2026-11-06", 5000, 5100, "Salário", "Pix");
  await lancar(BIA, "ganho", "Salário 1ª", "2026-11-16", 3000, null, "Salário", "Pix");
  await lancar(ANA, "ganho", "Venda", "2026-11-20", null, 200, "Extra", "Dinheiro");
  await lancar(ANA, "gasto", "Aluguel", "2026-11-10", 1500, 1500, "Essencial", "Pix");
  await lancar(BIA, "gasto", "Mercado", "2026-11-10", 800, 750.35, "Essencial", "Débito");
  await lancar(ANA, "gasto", "Cinema", "2026-11-12", null, 60.1, "Lazer", "Crédito");
  await lancar(BIA, "gasto", "Netflix", "2026-11-15", 55.9, null, "Streaming", "Crédito");
  await lancar(ANA, "gasto", "Ração", "2026-12-05", 180, null, "Cachorro", "Pix");
});

after(async () => {
  await db?.close();
});

describe("analise_ciclo", () => {
  test("totais batem com os cartões do Início (resumo_ciclo)", async () => {
    await comoUsuario(db, ANA);
    const a = await analise(nov);
    const resumo = await um("select * from public.resumo_ciclo where ciclo_id = $1", [nov]);
    for (const k of ["ganhos_previsto", "ganhos_realizado", "gastos_previsto", "gastos_realizado"]) {
      assert.equal(n(a.totais[k]), n(resumo[k]), k);
    }
    assert.equal(n(a.totais.gastos_previsto), 2546.35); // 1500 + 750,35 + 60,10 + 55,90 + 180
    assert.equal(n(a.totais.gastos_realizado), 2310.45); // 1500 + 750,35 + 60,10
  });

  test("por categoria soma o total, ordenado do maior para o menor, com a cor do cadastro", async () => {
    await comoUsuario(db, ANA);
    const a = await analise(nov);
    const gastos = a.por_categoria.filter((c) => c.tipo === "gasto");
    const ganhos = a.por_categoria.filter((c) => c.tipo === "ganho");
    assert.equal(soma(gastos, "previsto"), n(a.totais.gastos_previsto));
    assert.equal(soma(gastos, "realizado"), n(a.totais.gastos_realizado));
    assert.equal(soma(ganhos, "previsto"), n(a.totais.ganhos_previsto));
    assert.deepEqual(gastos.map((c) => c.nome), ["Essencial", "Cachorro", "Lazer", "Streaming"]);
    assert.equal(gastos[0].previsto, 2250.35);
    assert.equal(gastos[0].cor, "#2563EB");
    assert.equal(gastos[0].qtd, 2);
  });

  test("por forma de pagamento soma o total", async () => {
    await comoUsuario(db, ANA);
    const a = await analise(nov);
    const gastos = a.por_forma.filter((f) => f.tipo === "gasto");
    assert.equal(soma(gastos, "previsto"), n(a.totais.gastos_previsto));
    const credito = gastos.find((f) => f.nome === "Crédito");
    assert.equal(credito.eh_credito, true);
    assert.equal(credito.previsto, 116); // 60,10 + 55,90
    assert.equal(credito.realizado, 60.1);
  });

  test("por dia: um ponto por dia do ciclo, soma o total e o acumulado termina no total", async () => {
    await comoUsuario(db, ANA);
    const a = await analise(nov);
    assert.equal(a.por_dia.length, 30); // 06/11 a 05/12
    assert.equal(a.por_dia[0].dia, "2026-11-06");
    assert.equal(a.por_dia.at(-1).dia, "2026-12-05");
    assert.equal(soma(a.por_dia, "gastos_previsto"), n(a.totais.gastos_previsto));
    assert.equal(soma(a.por_dia, "ganhos_realizado"), n(a.totais.ganhos_realizado));
    assert.equal(n(a.por_dia.at(-1).gastos_previsto_acumulado), n(a.totais.gastos_previsto));
    assert.equal(n(a.por_dia.at(-1).gastos_realizado_acumulado), n(a.totais.gastos_realizado));
    const dia10 = a.por_dia.find((d) => d.dia === "2026-11-10");
    assert.equal(dia10.gastos_previsto, 2250.35);
    assert.equal(dia10.gastos_previsto_acumulado, 2250.35);
    const dia11 = a.por_dia.find((d) => d.dia === "2026-11-11");
    assert.equal(dia11.gastos_previsto, 0);
    assert.equal(dia11.gastos_previsto_acumulado, 2250.35);
  });

  test("filtro por pessoa conta só o que ela lançou", async () => {
    await comoUsuario(db, ANA);
    const daBia = await analise(nov, BIA);
    assert.equal(n(daBia.totais.gastos_previsto), 806.25); // 750,35 + 55,90
    assert.equal(n(daBia.totais.ganhos_previsto), 3000);
    assert.equal(daBia.totais.qtd_lancamentos, 3);
    const daAna = await analise(nov, ANA);
    assert.equal(
      r2(n(daAna.totais.gastos_previsto) + n(daBia.totais.gastos_previsto)),
      n((await analise(nov)).totais.gastos_previsto),
    );
  });

  test("ciclo sem lançamentos: tudo zerado e listas vazias", async () => {
    await comoUsuario(db, ANA);
    const a = await analise(dez);
    assert.equal(n(a.totais.gastos_previsto), 0);
    assert.deepEqual(a.por_categoria, []);
    assert.deepEqual(a.por_forma, []);
    assert.equal(a.por_dia.length, 31);
    assert.ok(a.por_dia.every((d) => n(d.gastos_previsto) === 0));
  });

  test("outra casa recebe null; visitante sem login não executa", async () => {
    await comoUsuario(db, CAIO);
    assert.equal(await analise(nov), null);
    await comoAnonimo(db);
    await assert.rejects(analise(nov), /permission denied/);
  });
});

describe("evolucao_ciclos", () => {
  test("ciclos do mais antigo ao mais recente, com totais e saldo", async () => {
    await comoUsuario(db, ANA);
    const ev = (await um("select public.evolucao_ciclos($1) as e", [casa])).e;
    assert.deepEqual(ev.map((c) => c.nome), ["Novembro/2026", "Dezembro/2026"]);
    const resumo = await um("select * from public.resumo_ciclo where ciclo_id = $1", [nov]);
    assert.equal(n(ev[0].saldo_previsto), n(resumo.saldo_previsto));
    assert.equal(n(ev[0].saldo_realizado), n(resumo.saldo_realizado));
    assert.equal(n(ev[1].gastos_previsto), 0);
  });

  test("limita aos últimos N ciclos", async () => {
    await comoUsuario(db, ANA);
    for (let m = 1; m <= 12; m++) {
      const inicio = `2027-${String(m).padStart(2, "0")}-06`;
      await db.query(
        "insert into public.ciclos (espaco_id, nome, data_inicio, data_fim) values ($1, $2, $3, ($3::date + interval '1 month')::date - 1)",
        [casa, `C${m}`, inicio],
      );
    }
    const ev = (await um("select public.evolucao_ciclos($1) as e", [casa])).e;
    assert.equal(ev.length, 12);
    assert.equal(ev[0].nome, "C1");
    assert.equal(ev.at(-1).nome, "C12");
    const tres = (await um("select public.evolucao_ciclos($1, null, 3) as e", [casa])).e;
    assert.deepEqual(tres.map((c) => c.nome), ["C10", "C11", "C12"]);
  });

  test("filtro por pessoa e isolamento", async () => {
    await comoUsuario(db, ANA);
    const ev = (await um("select public.evolucao_ciclos($1, $2, 20) as e", [casa, BIA])).e;
    assert.equal(n(ev.find((c) => c.nome === "Novembro/2026").gastos_previsto), 806.25);
    await comoUsuario(db, CAIO);
    assert.deepEqual((await um("select public.evolucao_ciclos($1) as e", [casa])).e, []);
  });
});
