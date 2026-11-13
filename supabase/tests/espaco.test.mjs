// Testes de criar e compartilhar o espaço.
// Critério de aceite: com duas contas, a segunda entra pelo código e vê as
// mesmas categorias da primeira.

import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import { comoAdmin, comoAnonimo, comoUsuario, criarBanco } from "./banco.mjs";

const ANA = "00000000-0000-4000-8000-00000000000a";
const BIA = "00000000-0000-4000-8000-00000000000b";
const CAIO = "00000000-0000-4000-8000-00000000000c";

const CATEGORIAS_PADRAO = [
  ["Cachorro", "gasto"],
  ["Educação", "gasto"],
  ["Empréstimo", "gasto"],
  ["Essencial", "gasto"],
  ["Extra", "ganho"],
  ["Lazer", "gasto"],
  ["Pagamento de terceiro", "ganho"],
  ["Salário", "ganho"],
  ["Streaming", "gasto"],
];

const FORMAS_PADRAO = [
  ["Crédito", true],
  ["Dinheiro", false],
  ["Débito", false],
  ["Pix", false],
];

let db;
let casaA;
let casaC;

async function um(sql, params) {
  const { rows } = await db.query(sql, params);
  return rows[0];
}

async function categorias(espacoId) {
  const { rows } = await db.query(
    "select nome, tipo from public.categorias where espaco_id = $1 order by nome collate \"C\"",
    [espacoId],
  );
  return rows.map((r) => [r.nome, r.tipo]);
}

async function espacoAtivo() {
  const r = await um(
    "select espaco_ativo_id from public.preferencias_usuario where user_id = auth.uid()",
  );
  return r?.espaco_ativo_id ?? null;
}

before(async () => {
  ({ db } = await criarBanco());
  await comoAdmin(db);
  await db.query(
    "insert into auth.users (id, email) values ($1, 'ana@ex.com'), ($2, 'bia@ex.com'), ($3, 'caio@ex.com')",
    [ANA, BIA, CAIO],
  );

  await comoUsuario(db, ANA);
  casaA = (await um("select public.criar_espaco('Nossa casa', 'Ana') as id")).id;

  await comoUsuario(db, CAIO);
  casaC = (await um("select public.criar_espaco('Casa do Caio') as id")).id;
});

after(async () => {
  await db?.close();
});

describe("criar_espaco", () => {
  test("cria espaço, configuração padrão e o criador como membro", async () => {
    await comoUsuario(db, ANA);
    const e = await um("select nome, codigo_convite from public.espacos where id = $1", [casaA]);
    assert.equal(e.nome, "Nossa casa");
    assert.match(e.codigo_convite, /^[A-Z0-9]{8}$/);

    const c = await um(
      "select dia_inicio_ciclo, moeda from public.configuracoes where espaco_id = $1",
      [casaA],
    );
    assert.deepEqual(c, { dia_inicio_ciclo: 3, moeda: "BRL" });

    const { rows: membros } = await db.query(
      "select user_id, nome_exibicao from public.membros where espaco_id = $1",
      [casaA],
    );
    assert.deepEqual(membros, [{ user_id: ANA, nome_exibicao: "Ana" }]);
  });

  test("insere as categorias padrão", async () => {
    await comoUsuario(db, ANA);
    assert.deepEqual(await categorias(casaA), CATEGORIAS_PADRAO);
  });

  test("insere as formas de pagamento padrão, com Crédito marcado", async () => {
    await comoUsuario(db, ANA);
    const { rows } = await db.query(
      "select nome, eh_credito from public.formas_pagamento where espaco_id = $1 order by nome collate \"C\"",
      [casaA],
    );
    assert.deepEqual(
      rows.map((r) => [r.nome, r.eh_credito]),
      FORMAS_PADRAO,
    );
  });

  test("marca o espaço criado como ativo", async () => {
    await comoUsuario(db, ANA);
    assert.equal(await espacoAtivo(), casaA);
  });

  test("cada espaço tem os próprios cadastros padrão", async () => {
    await comoUsuario(db, CAIO);
    assert.deepEqual(await categorias(casaC), CATEGORIAS_PADRAO);
    const { rows } = await db.query("select distinct espaco_id from public.categorias");
    assert.deepEqual(rows.map((r) => r.espaco_id), [casaC]);
  });
});

describe("entrar_no_espaco", () => {
  test("a segunda conta entra pelo código e vê as mesmas categorias", async () => {
    await comoUsuario(db, ANA);
    const { codigo_convite } = await um(
      "select codigo_convite from public.espacos where id = $1",
      [casaA],
    );
    const categoriasDaAna = await um(
      "select array_agg(id order by id) as ids from public.categorias where espaco_id = $1",
      [casaA],
    );

    await comoUsuario(db, BIA);
    assert.deepEqual(await categorias(casaA), [], "Bia viu antes de entrar");

    // Aceita o código com espaços e minúsculas.
    const id = (
      await um("select public.entrar_no_espaco($1, 'Bia') as id", [
        `  ${codigo_convite.toLowerCase()} `,
      ])
    ).id;
    assert.equal(id, casaA);

    const categoriasDaBia = await um(
      "select array_agg(id order by id) as ids from public.categorias where espaco_id = $1",
      [casaA],
    );
    assert.deepEqual(categoriasDaBia.ids, categoriasDaAna.ids);
    assert.deepEqual(await categorias(casaA), CATEGORIAS_PADRAO);
  });

  test("marca o espaço como ativo para quem entrou", async () => {
    await comoUsuario(db, BIA);
    assert.equal(await espacoAtivo(), casaA);
  });

  test("os dois aparecem como membros", async () => {
    await comoUsuario(db, ANA);
    const { rows } = await db.query(
      "select nome_exibicao from public.membros where espaco_id = $1 order by nome_exibicao",
      [casaA],
    );
    assert.deepEqual(rows.map((r) => r.nome_exibicao), ["Ana", "Bia"]);
  });

  test("entrar de novo não duplica o membro", async () => {
    await comoUsuario(db, ANA);
    const { codigo_convite } = await um(
      "select codigo_convite from public.espacos where id = $1",
      [casaA],
    );
    await comoUsuario(db, BIA);
    await um("select public.entrar_no_espaco($1)", [codigo_convite]);
    const { n } = await um(
      "select count(*)::int as n from public.membros where espaco_id = $1 and user_id = $2",
      [casaA, BIA],
    );
    assert.equal(n, 1);
    const { nome_exibicao } = await um(
      "select nome_exibicao from public.membros where espaco_id = $1 and user_id = $2",
      [casaA, BIA],
    );
    assert.equal(nome_exibicao, "Bia", "nome sumiu ao entrar de novo sem nome");
  });

  test("código errado não entra", async () => {
    await comoUsuario(db, CAIO);
    await assert.rejects(
      db.query("select public.entrar_no_espaco('ZZZZZZZZ')"),
      /Código de convite inválido/,
    );
  });
});

describe("espaço ativo", () => {
  test("cada um só vê a própria preferência", async () => {
    await comoUsuario(db, CAIO);
    const { rows } = await db.query(
      "select user_id from public.preferencias_usuario",
    );
    assert.deepEqual(rows.map((r) => r.user_id), [CAIO]);
  });

  test("não dá para marcar como ativo um espaço de que não se é membro", async () => {
    await comoUsuario(db, CAIO);
    await assert.rejects(
      db.query(
        "update public.preferencias_usuario set espaco_ativo_id = $1 where user_id = auth.uid()",
        [casaA],
      ),
      /row-level security/,
    );
  });

  test("não dá para mexer na preferência de outra pessoa", async () => {
    await comoUsuario(db, CAIO);
    const r = await db.query(
      "update public.preferencias_usuario set espaco_ativo_id = null where user_id = $1",
      [ANA],
    );
    assert.equal(r.affectedRows ?? 0, 0);
    await assert.rejects(
      db.query(
        "insert into public.preferencias_usuario (user_id, espaco_ativo_id) values ($1, null)",
        [ANA],
      ),
      /row-level security/,
    );
  });

  test("membro troca o espaço ativo entre os seus espaços", async () => {
    await comoUsuario(db, BIA);
    const segunda = (await um("select public.criar_espaco('Casa da praia') as id")).id;
    assert.equal(await espacoAtivo(), segunda);
    await db.query(
      "update public.preferencias_usuario set espaco_ativo_id = $1 where user_id = auth.uid()",
      [casaA],
    );
    assert.equal(await espacoAtivo(), casaA);
  });

  test("a lista de espaços mostra só aqueles de que a pessoa é membro", async () => {
    await comoUsuario(db, BIA);
    const { rows } = await db.query(
      `select e.nome from public.membros m join public.espacos e on e.id = m.espaco_id
        where m.user_id = auth.uid() order by m.criado_em`,
    );
    assert.deepEqual(rows.map((r) => r.nome), ["Nossa casa", "Casa da praia"]);
  });

  test("trocar pelo app (upsert) funciona e respeita a segurança", async () => {
    await comoUsuario(db, BIA);
    const praia = (await um("select id from public.espacos where nome = 'Casa da praia'")).id;
    const upsert = (id) =>
      db.query(
        `insert into public.preferencias_usuario (user_id, espaco_ativo_id, atualizado_em)
         values (auth.uid(), $1, now())
         on conflict (user_id) do update
           set espaco_ativo_id = excluded.espaco_ativo_id, atualizado_em = excluded.atualizado_em`,
        [id],
      );
    await upsert(praia);
    assert.equal(await espacoAtivo(), praia);
    await upsert(casaA);
    assert.equal(await espacoAtivo(), casaA);
    await assert.rejects(upsert(casaC), /row-level security/);
    assert.equal(await espacoAtivo(), casaA);
  });

  test("cada espaço da mesma pessoa tem os próprios cadastros", async () => {
    await comoUsuario(db, BIA);
    const praia = (await um("select id from public.espacos where nome = 'Casa da praia'")).id;
    await db.query(
      "insert into public.categorias (espaco_id, nome, tipo) values ($1, 'Só da praia', 'gasto')",
      [praia],
    );
    assert.ok((await categorias(praia)).some(([nome]) => nome === "Só da praia"));
    assert.ok(!(await categorias(casaA)).some(([nome]) => nome === "Só da praia"));
  });

  test("funções internas não são chamáveis pela API", async () => {
    await comoUsuario(db, CAIO);
    await assert.rejects(
      db.query("select public.inserir_cadastros_padrao($1)", [casaA]),
      /permission denied/,
    );
    await assert.rejects(
      db.query("select public.marcar_espaco_ativo($1)", [casaA]),
      /permission denied/,
    );
    await comoAnonimo(db);
    const { rows } = await db.query(
      "select count(*)::int as n from public.preferencias_usuario",
    );
    assert.equal(rows[0].n, 0);
  });
});
