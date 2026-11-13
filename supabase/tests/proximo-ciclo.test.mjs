// Criar o próximo ciclo (criar_proximo_ciclo / previa_proximo_ciclo).

import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, before, beforeEach, describe, test } from "node:test";
import { comoAdmin, comoAnonimo, comoUsuario, criarBanco } from "./banco.mjs";

const ANA = "00000000-0000-4000-8000-00000000000a";
const BIA = "00000000-0000-4000-8000-00000000000b";
const CAIO = "00000000-0000-4000-8000-00000000000c";

let db;
let casa;
let catGasto;
let catGanho;
let forma;

async function um(sql, params) {
  const { rows } = await db.query(sql, params);
  return rows[0];
}

async function ciclo(nome, inicio, fim) {
  return (
    await um(
      "insert into public.ciclos (espaco_id, nome, data_inicio, data_fim) values ($1, $2, $3, $4) returning id",
      [casa, nome, inicio, fim],
    )
  ).id;
}

/** Lança no ciclo da data. `extra` sobrescreve colunas. */
async function lancar(data, extra = {}) {
  const l = {
    tipo: "gasto",
    descricao: "Teste",
    recorrente: true,
    estimativa: 100,
    valor_real: null,
    parcela_atual: null,
    total_parcelas: null,
    grupo_id: null,
    observacao: null,
    ...extra,
  };
  return (
    await um(
      `insert into public.lancamentos
         (espaco_id, ciclo_id, tipo, descricao, recorrente, estimativa, valor_real,
          categoria_id, forma_pagamento_id, data, parcela_atual, total_parcelas, grupo_id, observacao)
       values ($1, (select id from public.ciclos where espaco_id = $1 limit 1), $2, $3, $4, $5, $6,
               $7, $8, $9, $10, $11, $12, $13) returning id`,
      [
        casa,
        l.tipo,
        l.descricao,
        l.recorrente,
        l.estimativa,
        l.valor_real,
        l.tipo === "ganho" ? catGanho : catGasto,
        forma,
        data,
        l.parcela_atual,
        l.total_parcelas,
        l.grupo_id,
        l.observacao,
      ],
    )
  ).id;
}

async function previa(cicloId, usarUltimoReal = false) {
  return (await um("select public.previa_proximo_ciclo($1, $2) as p", [cicloId, usarUltimoReal])).p;
}

async function criar(cicloId, usarUltimoReal = false) {
  return (await um("select public.criar_proximo_ciclo($1, $2) as id", [cicloId, usarUltimoReal])).id;
}

async function cicloPorId(id) {
  const c = await um("select nome, data_inicio::text, data_fim::text, ciclo_origem_id from public.ciclos where id = $1", [id]);
  return c;
}

async function lancamentosDe(cicloId) {
  const { rows } = await db.query(
    `select tipo, descricao, recorrente, estimativa::float8 as estimativa, valor_real,
            data::text as data, parcela_atual, total_parcelas, grupo_id, observacao, criado_por,
            categoria_id, forma_pagamento_id
     from public.lancamentos where ciclo_id = $1 order by data, descricao`,
    [cicloId],
  );
  return rows;
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
  catGasto = (await um("select id from public.categorias where espaco_id = $1 and nome = 'Essencial'", [casa])).id;
  catGanho = (await um("select id from public.categorias where espaco_id = $1 and nome = 'Salário'", [casa])).id;
  forma = (await um("select id from public.formas_pagamento where espaco_id = $1 and nome = 'Pix'", [casa])).id;
});

beforeEach(async () => {
  await comoUsuario(db, ANA);
  await db.query("delete from public.ciclos where espaco_id = $1", [casa]);
});

after(async () => {
  await db?.close();
});

describe("datas e nome do próximo ciclo", () => {
  test("início = fim + 1; fim = véspera do mesmo dia no mês seguinte; nome = mês do início", async () => {
    const nov = await ciclo("Nov", "2026-11-06", "2026-12-05");
    const novo = await criar(nov);
    assert.deepEqual(await cicloPorId(novo), {
      nome: "Dezembro/2026",
      data_inicio: "2026-12-06",
      data_fim: "2027-01-05",
      ciclo_origem_id: nov,
    });
  });

  test("virada de ano: dezembro → janeiro", async () => {
    const dez = await ciclo("Dezembro/2026", "2026-12-03", "2027-01-02");
    await lancar("2026-12-25", { descricao: "Natal" });
    const jan = await criar(dez);
    assert.deepEqual(await cicloPorId(jan), {
      nome: "Janeiro/2027",
      data_inicio: "2027-01-03",
      data_fim: "2027-02-02",
      ciclo_origem_id: dez,
    });
    assert.equal((await lancamentosDe(jan))[0].data, "2027-01-25");
  });

  test("meses de 28, 30 e 31 dias", async () => {
    // Ciclo que começa dia 31: fevereiro não tem 31, então o fim é 27/02.
    const jan = await ciclo("Janeiro/2027", "2027-01-01", "2027-01-30");
    await lancar("2027-01-30", { descricao: "Fim de janeiro" });
    const fev = await criar(jan); // começa 31/01
    assert.deepEqual(await cicloPorId(fev), {
      nome: "Janeiro/2027",
      data_inicio: "2027-01-31",
      data_fim: "2027-02-27",
      ciclo_origem_id: jan,
    });
    // 30/01 + 1 mês = 28/02 (fevereiro de 28 dias), mas o novo ciclo vai até
    // 27/02: a data fica no último dia do ciclo.
    assert.equal((await lancamentosDe(fev))[0].data, "2027-02-27");

    // De 28/02 a 27/03, e de lá para abril (30 dias).
    const mar = await criar(fev);
    assert.deepEqual(await cicloPorId(mar), {
      nome: "Fevereiro/2027",
      data_inicio: "2027-02-28",
      data_fim: "2027-03-27",
      ciclo_origem_id: fev,
    });
    await db.query("delete from public.ciclos where espaco_id = $1", [casa]);

    const marco = await ciclo("Março/2027", "2027-03-01", "2027-03-31");
    await lancar("2027-03-31", { descricao: "Dia 31" });
    const abril = await criar(marco);
    assert.deepEqual(await cicloPorId(abril), {
      nome: "Abril/2027",
      data_inicio: "2027-04-01",
      data_fim: "2027-04-30",
      ciclo_origem_id: marco,
    });
    // 31/03 + 1 mês = 30/04 (abril tem 30 dias)
    assert.equal((await lancamentosDe(abril))[0].data, "2027-04-30");
  });

  test("ano bissexto: 31/01/2028 + 1 mês = 29/02/2028", async () => {
    const jan = await ciclo("Janeiro/2028", "2028-01-03", "2028-02-02");
    await lancar("2028-01-31", { descricao: "Bissexto" });
    const fev = await criar(jan);
    assert.equal((await lancamentosDe(fev))[0].data, "2028-02-29");
  });
});

describe("o que é copiado", () => {
  test("recorrente simples: vira previsto, data + 1 mês, estimativa anterior", async () => {
    const nov = await ciclo("Nov", "2026-11-03", "2026-12-02");
    await lancar("2026-11-10", { descricao: "Água", estimativa: 120, valor_real: 98.5, observacao: "conta" });
    const dez = await criar(nov);
    const [copia] = await lancamentosDe(dez);
    assert.equal(copia.descricao, "Água");
    assert.equal(copia.data, "2026-12-10");
    assert.equal(copia.estimativa, 120);
    assert.equal(copia.valor_real, null);
    assert.equal(copia.recorrente, true);
    assert.equal(copia.observacao, "conta");
    assert.equal(copia.criado_por, ANA);
  });

  test("opção de usar o último valor real como estimativa", async () => {
    const nov = await ciclo("Nov", "2026-11-03", "2026-12-02");
    await lancar("2026-11-10", { descricao: "Água", estimativa: 120, valor_real: 98.5 });
    await lancar("2026-11-11", { descricao: "Internet", estimativa: 100, valor_real: null });
    const dez = await criar(nov, true);
    const copias = await lancamentosDe(dez);
    assert.equal(copias.find((c) => c.descricao === "Água").estimativa, 98.5);
    // Sem valor real, continua a estimativa.
    assert.equal(copias.find((c) => c.descricao === "Internet").estimativa, 100);
  });

  test("recorrente não planejado (só valor real) vira previsto com esse valor", async () => {
    const nov = await ciclo("Nov", "2026-11-03", "2026-12-02");
    await lancar("2026-11-10", { descricao: "Padaria", estimativa: null, valor_real: 45 });
    const dez = await criar(nov);
    const [copia] = await lancamentosDe(dez);
    assert.equal(copia.estimativa, 45);
    assert.equal(copia.valor_real, null);
  });

  test("ganho recorrente", async () => {
    const nov = await ciclo("Nov", "2026-11-03", "2026-12-02");
    await lancar("2026-11-05", { tipo: "ganho", descricao: "Salário 2ª parte", estimativa: 5000, valor_real: 5100 });
    const dez = await criar(nov);
    const [copia] = await lancamentosDe(dez);
    assert.equal(copia.tipo, "ganho");
    assert.equal(copia.categoria_id, catGanho);
    assert.equal(copia.estimativa, 5000);
    assert.equal(copia.data, "2026-12-05");
  });

  test("não recorrentes não são copiados", async () => {
    const nov = await ciclo("Nov", "2026-11-03", "2026-12-02");
    await lancar("2026-11-10", { descricao: "Cinema", recorrente: false, estimativa: null, valor_real: 60 });
    const dez = await criar(nov);
    assert.deepEqual(await lancamentosDe(dez), []);
  });

  test("parcela intermediária: parcela + 1, mesmo grupo", async () => {
    const nov = await ciclo("Nov", "2026-11-03", "2026-12-02");
    const grupo = randomUUID();
    await lancar("2026-11-15", { descricao: "TV", estimativa: 300, parcela_atual: 3, total_parcelas: 10, grupo_id: grupo });
    const dez = await criar(nov);
    const [copia] = await lancamentosDe(dez);
    assert.equal(copia.parcela_atual, 4);
    assert.equal(copia.total_parcelas, 10);
    assert.equal(copia.grupo_id, grupo);
    assert.equal(copia.data, "2026-12-15");
  });

  test("penúltima vira última; a última não é copiada", async () => {
    const nov = await ciclo("Nov", "2026-11-03", "2026-12-02");
    await lancar("2026-11-15", { descricao: "Celular", parcela_atual: 9, total_parcelas: 10, grupo_id: randomUUID() });
    await lancar("2026-11-16", { descricao: "Sofá", parcela_atual: 10, total_parcelas: 10, grupo_id: randomUUID() });
    const dez = await criar(nov);
    const copias = await lancamentosDe(dez);
    assert.deepEqual(copias.map((c) => [c.descricao, c.parcela_atual]), [["Celular", 10]]);

    const jan = await criar(dez);
    assert.deepEqual(await lancamentosDe(jan), [], "a 10/10 do celular encerra");
  });

  test("cópia mantém quem lançou o original", async () => {
    const nov = await ciclo("Nov", "2026-11-03", "2026-12-02");
    await comoUsuario(db, BIA);
    await lancar("2026-11-10", { descricao: "Da Bia" });
    await comoUsuario(db, ANA);
    const dez = await criar(nov);
    assert.equal((await lancamentosDe(dez))[0].criado_por, BIA);
  });
});

describe("prévia", () => {
  test("conta recorrentes, parcelas e parcelas encerradas, sem gravar nada", async () => {
    const nov = await ciclo("Nov", "2026-11-03", "2026-12-02");
    await lancar("2026-11-05", { tipo: "ganho", descricao: "Salário" });
    await lancar("2026-11-10", { descricao: "Água" });
    await lancar("2026-11-12", { descricao: "Cinema", recorrente: false });
    await lancar("2026-11-15", { descricao: "TV", parcela_atual: 3, total_parcelas: 10, grupo_id: randomUUID() });
    await lancar("2026-11-16", { descricao: "Sofá", parcela_atual: 10, total_parcelas: 10, grupo_id: randomUUID() });

    const p = await previa(nov);
    assert.equal(p.nome, "Dezembro/2026");
    assert.equal(p.data_inicio, "2026-12-03");
    assert.equal(p.data_fim, "2027-01-02");
    assert.equal(p.conflito, null);
    assert.equal(p.recorrentes, 2);
    assert.equal(p.parcelas, 1);
    assert.equal(p.parcelas_encerradas, 1);
    assert.equal(p.itens.length, 4);

    const { n } = await um("select count(*)::int as n from public.ciclos where espaco_id = $1", [casa]);
    assert.equal(n, 1, "a prévia não cria ciclo");
  });

  test("criar Janeiro a partir de Dezembro gera exatamente o que a prévia mostrou", async () => {
    const dez = await ciclo("Dezembro/2026", "2026-12-03", "2027-01-02");
    await lancar("2026-12-05", { tipo: "ganho", descricao: "Salário 2ª parte", estimativa: 5000, valor_real: 5100 });
    await lancar("2026-12-16", { tipo: "ganho", descricao: "Salário 1ª parte", estimativa: 3000 });
    await lancar("2026-12-10", { descricao: "Aluguel", estimativa: 1500, valor_real: 1500 });
    await lancar("2026-12-20", { descricao: "Água", estimativa: 120, valor_real: 98.5 });
    await lancar("2026-12-31", { descricao: "Academia", estimativa: null, valor_real: 99.9 });
    await lancar("2026-12-24", { descricao: "Ceia", recorrente: false, valor_real: 300 });
    const g1 = randomUUID();
    const g2 = randomUUID();
    await lancar("2026-12-15", { descricao: "TV", estimativa: 300, parcela_atual: 3, total_parcelas: 10, grupo_id: g1 });
    await lancar("2026-12-18", { descricao: "Sofá", estimativa: 500, parcela_atual: 6, total_parcelas: 6, grupo_id: g2 });

    for (const usar of [false, true]) {
      await db.query("delete from public.ciclos where espaco_id = $1 and data_inicio = '2027-01-03'", [casa]);
      const p = await previa(dez, usar);
      const jan = await criar(dez, usar);
      const c = await cicloPorId(jan);
      assert.deepEqual(
        { nome: c.nome, data_inicio: c.data_inicio, data_fim: c.data_fim },
        { nome: p.nome, data_inicio: p.data_inicio, data_fim: p.data_fim },
      );

      const esperado = p.itens
        .filter((i) => i.situacao !== "parcela_encerrada")
        .map((i) => ({
          tipo: i.tipo,
          descricao: i.descricao,
          estimativa: Number(i.estimativa),
          data: i.data,
          parcela_atual: i.parcela_atual,
          total_parcelas: i.total_parcelas,
          grupo_id: i.grupo_id,
          categoria_id: i.categoria_id,
          forma_pagamento_id: i.forma_pagamento_id,
          criado_por: i.criado_por,
        }))
        .sort((a, b) => (a.data + a.descricao).localeCompare(b.data + b.descricao));
      const criado = (await lancamentosDe(jan)).map((l) => ({
        tipo: l.tipo,
        descricao: l.descricao,
        estimativa: l.estimativa,
        data: l.data,
        parcela_atual: l.parcela_atual,
        total_parcelas: l.total_parcelas,
        grupo_id: l.grupo_id,
        categoria_id: l.categoria_id,
        forma_pagamento_id: l.forma_pagamento_id,
        criado_por: l.criado_por,
      }));
      assert.deepEqual(criado, esperado, `usar_ultimo_real = ${usar}`);
      assert.equal(criado.length, p.recorrentes + p.parcelas);
      assert.deepEqual([p.recorrentes, p.parcelas, p.parcelas_encerradas], [5, 1, 1]);
    }
  });
});

describe("recusas", () => {
  test("ciclo duplicado: já existe um ciclo começando nessa data", async () => {
    const nov = await ciclo("Nov", "2026-11-03", "2026-12-02");
    await lancar("2026-11-10");
    await criar(nov);
    const p = await previa(nov);
    assert.equal(p.conflito, "Já existe um ciclo começando em 03/12/2026.");
    await assert.rejects(criar(nov), /Já existe um ciclo começando em 03\/12\/2026/);
    const { n } = await um("select count(*)::int as n from public.ciclos where espaco_id = $1", [casa]);
    assert.equal(n, 2, "não criou nada a mais");
  });

  test("ciclo sobreposto no período também é recusado", async () => {
    const nov = await ciclo("Nov", "2026-11-03", "2026-12-02");
    await ciclo("Especial", "2026-12-20", "2026-12-25");
    await assert.rejects(criar(nov), /Já existe um ciclo nesse período \(Especial\)/);
  });

  test("tudo ou nada: se a criação falha, não sobra ciclo nem lançamento", async () => {
    const nov = await ciclo("Nov", "2026-11-03", "2026-12-02");
    await lancar("2026-11-10");
    // Categoria apagada à força deixa a cópia inválida no meio da criação.
    await comoAdmin(db);
    await db.query("alter table public.lancamentos disable trigger all");
    await db.query("update public.lancamentos set categoria_id = gen_random_uuid() where espaco_id = $1", [casa]);
    await db.query("alter table public.lancamentos enable trigger all");
    await comoUsuario(db, ANA);
    await assert.rejects(criar(nov));
    const { n } = await um("select count(*)::int as n from public.ciclos where espaco_id = $1", [casa]);
    assert.equal(n, 1, "o ciclo novo foi desfeito junto");
  });

  test("quem não é membro não vê a prévia nem cria", async () => {
    const nov = await ciclo("Nov", "2026-11-03", "2026-12-02");
    await comoUsuario(db, CAIO);
    await assert.rejects(previa(nov), /Ciclo não encontrado/);
    await assert.rejects(criar(nov), /Ciclo não encontrado/);
    await comoAnonimo(db);
    await assert.rejects(previa(nov), /permission denied/);
    await assert.rejects(criar(nov), /permission denied/);
  });
});
