// Testes de isolamento entre espaços (RLS).
// Rode com: npm run test:db
//
// Cenário: Ana e Bia moram na "Casa A" (espaço X). Caio mora na "Casa C"
// (espaço Y). Caio não pode ler nem alterar nada da Casa A.

import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import { comoAdmin, comoAnonimo, comoUsuario, criarBanco } from "./banco.mjs";

const ANA = "00000000-0000-4000-8000-00000000000a";
const BIA = "00000000-0000-4000-8000-00000000000b";
const CAIO = "00000000-0000-4000-8000-00000000000c";

const TABELAS = [
  "espacos",
  "membros",
  "configuracoes",
  "ciclos",
  "categorias",
  "formas_pagamento",
  "lancamentos",
];

let db;
const X = {}; // ids da Casa A
const Y = {}; // ids da Casa C

async function um(sql, params) {
  const { rows } = await db.query(sql, params);
  return rows[0];
}

async function contar(tabela, coluna, valor) {
  const { rows } = await db.query(
    `select count(*)::int as n from public.${tabela} where ${coluna} = $1`,
    [valor],
  );
  return rows[0].n;
}

async function afetadas(sql, params) {
  const r = await db.query(sql, params);
  return r.affectedRows ?? 0;
}

async function falha(sql, params, padrao) {
  await assert.rejects(db.query(sql, params), padrao);
}

const RLS = /row-level security/;

before(async () => {
  ({ db } = await criarBanco());

  await comoAdmin(db);
  await db.query(
    "insert into auth.users (id, email) values ($1, 'ana@ex.com'), ($2, 'bia@ex.com'), ($3, 'caio@ex.com')",
    [ANA, BIA, CAIO],
  );

  // Ana cria a Casa A; Bia entra pelo código de convite.
  await comoUsuario(db, ANA);
  X.espaco = (await um("select public.criar_espaco('Casa A', 'Ana') as id")).id;
  X.codigo = (
    await um("select codigo_convite from public.espacos where id = $1", [
      X.espaco,
    ])
  ).codigo_convite;

  await comoUsuario(db, BIA);
  await um("select public.entrar_no_espaco($1, 'Bia')", [X.codigo]);

  // Dados da Casa A, lançados pela Ana.
  await comoUsuario(db, ANA);
  X.ciclo = (
    await um(
      "insert into public.ciclos (espaco_id, nome, data_inicio, data_fim) values ($1, 'Dezembro/2026', '2026-12-03', '2027-01-02') returning id",
      [X.espaco],
    )
  ).id;
  X.categoria = (
    await um(
      "insert into public.categorias (espaco_id, nome, tipo, cor) values ($1, 'Essencial', 'gasto', '#3366FF') returning id",
      [X.espaco],
    )
  ).id;
  X.forma = (
    await um(
      "insert into public.formas_pagamento (espaco_id, nome) values ($1, 'Pix') returning id",
      [X.espaco],
    )
  ).id;
  X.lancamento = (
    await um(
      `insert into public.lancamentos
         (espaco_id, ciclo_id, tipo, descricao, estimativa, categoria_id, forma_pagamento_id, data)
       values ($1, $2, 'gasto', 'Conta de água', 120.50, $3, $4, '2026-12-10') returning id`,
      [X.espaco, X.ciclo, X.categoria, X.forma],
    )
  ).id;

  // Caio cria a Casa C com os próprios cadastros.
  await comoUsuario(db, CAIO);
  Y.espaco = (await um("select public.criar_espaco('Casa C') as id")).id;
  Y.ciclo = (
    await um(
      "insert into public.ciclos (espaco_id, nome, data_inicio, data_fim) values ($1, 'Dezembro/2026', '2026-12-03', '2027-01-02') returning id",
      [Y.espaco],
    )
  ).id;
  Y.categoria = (
    await um(
      "insert into public.categorias (espaco_id, nome, tipo) values ($1, 'Lazer', 'gasto') returning id",
      [Y.espaco],
    )
  ).id;
  Y.forma = (
    await um(
      "insert into public.formas_pagamento (espaco_id, nome) values ($1, 'Débito') returning id",
      [Y.espaco],
    )
  ).id;
});

after(async () => {
  await db?.close();
});

describe("membros do espaço", () => {
  test("Ana e Bia veem os dados da Casa A", async () => {
    for (const usuario of [ANA, BIA]) {
      await comoUsuario(db, usuario);
      assert.equal(await contar("espacos", "id", X.espaco), 1);
      assert.equal(await contar("membros", "espaco_id", X.espaco), 2);
      assert.equal(await contar("configuracoes", "espaco_id", X.espaco), 1);
      assert.equal(await contar("ciclos", "espaco_id", X.espaco), 1);
      assert.equal(await contar("categorias", "espaco_id", X.espaco), 1);
      assert.equal(await contar("formas_pagamento", "espaco_id", X.espaco), 1);
      assert.equal(await contar("lancamentos", "espaco_id", X.espaco), 1);
    }
  });

  test("configurações nascem com dia 3 e BRL", async () => {
    await comoUsuario(db, ANA);
    const c = await um(
      "select dia_inicio_ciclo, moeda from public.configuracoes where espaco_id = $1",
      [X.espaco],
    );
    assert.deepEqual(c, { dia_inicio_ciclo: 3, moeda: "BRL" });
  });

  test("Bia lança e fica registrada como criado_por", async () => {
    await comoUsuario(db, BIA);
    const l = await um(
      `insert into public.lancamentos
         (espaco_id, ciclo_id, tipo, descricao, valor_real, categoria_id, forma_pagamento_id, data)
       values ($1, $2, 'gasto', 'Mercado', 89.90, $3, $4, '2026-12-11') returning id, criado_por`,
      [X.espaco, X.ciclo, X.categoria, X.forma],
    );
    assert.equal(l.criado_por, BIA);
    assert.equal(
      await afetadas("delete from public.lancamentos where id = $1", [l.id]),
      1,
    );
  });

  test("Bia não consegue lançar em nome da Ana", async () => {
    await comoUsuario(db, BIA);
    await falha(
      `insert into public.lancamentos
         (espaco_id, ciclo_id, tipo, descricao, valor_real, categoria_id, forma_pagamento_id, data, criado_por)
       values ($1, $2, 'gasto', 'Falso', 1, $3, $4, '2026-12-11', $5)`,
      [X.espaco, X.ciclo, X.categoria, X.forma, ANA],
      RLS,
    );
  });

  test("criado_por não muda ao editar", async () => {
    await comoUsuario(db, BIA);
    await db.query(
      "update public.lancamentos set criado_por = $2, observacao = 'editado' where id = $1",
      [X.lancamento, BIA],
    );
    const l = await um(
      "select criado_por, observacao from public.lancamentos where id = $1",
      [X.lancamento],
    );
    assert.deepEqual(l, { criado_por: ANA, observacao: "editado" });
  });
});

describe("usuário fora do espaço (Caio)", () => {
  test("não lê nenhuma tabela da Casa A", async () => {
    await comoUsuario(db, CAIO);
    assert.equal(await contar("espacos", "id", X.espaco), 0);
    for (const tabela of TABELAS.filter((t) => t !== "espacos")) {
      assert.equal(
        await contar(tabela, "espaco_id", X.espaco),
        0,
        `Caio leu linhas de ${tabela}`,
      );
    }
  });

  test("não descobre o código de convite", async () => {
    await comoUsuario(db, CAIO);
    const r = await db.query(
      "select codigo_convite from public.espacos where codigo_convite = $1",
      [X.codigo],
    );
    assert.equal(r.rows.length, 0);
  });

  test("não altera nada da Casa A", async () => {
    await comoUsuario(db, CAIO);
    const tentativas = [
      ["update public.espacos set nome = 'invadido' where id = $1", X.espaco],
      ["update public.membros set nome_exibicao = 'x' where espaco_id = $1", X.espaco],
      ["update public.configuracoes set dia_inicio_ciclo = 10 where espaco_id = $1", X.espaco],
      ["update public.ciclos set nome = 'x' where id = $1", X.ciclo],
      ["update public.categorias set nome = 'x' where id = $1", X.categoria],
      ["update public.formas_pagamento set nome = 'x' where id = $1", X.forma],
      ["update public.lancamentos set valor_real = 999 where id = $1", X.lancamento],
    ];
    for (const [sql, id] of tentativas) {
      assert.equal(await afetadas(sql, [id]), 0, sql);
    }

    await comoAdmin(db);
    const l = await um(
      "select valor_real, estimativa from public.lancamentos where id = $1",
      [X.lancamento],
    );
    assert.equal(l.valor_real, null);
    assert.equal(Number(l.estimativa), 120.5);
    const e = await um("select nome from public.espacos where id = $1", [
      X.espaco,
    ]);
    assert.equal(e.nome, "Casa A");
  });

  test("não exclui nada da Casa A", async () => {
    await comoUsuario(db, CAIO);
    const tentativas = [
      ["delete from public.espacos where id = $1", X.espaco],
      ["delete from public.membros where espaco_id = $1", X.espaco],
      ["delete from public.configuracoes where espaco_id = $1", X.espaco],
      ["delete from public.lancamentos where id = $1", X.lancamento],
      ["delete from public.ciclos where id = $1", X.ciclo],
      ["delete from public.categorias where id = $1", X.categoria],
      ["delete from public.formas_pagamento where id = $1", X.forma],
    ];
    for (const [sql, id] of tentativas) {
      assert.equal(await afetadas(sql, [id]), 0, sql);
    }

    await comoAdmin(db);
    assert.equal(await contar("lancamentos", "id", X.lancamento), 1);
    assert.equal(await contar("membros", "espaco_id", X.espaco), 2);
  });

  test("não insere dados na Casa A", async () => {
    await comoUsuario(db, CAIO);
    await falha(
      "insert into public.ciclos (espaco_id, nome, data_inicio, data_fim) values ($1, 'x', '2027-01-03', '2027-02-02')",
      [X.espaco],
      RLS,
    );
    await falha(
      "insert into public.categorias (espaco_id, nome, tipo) values ($1, 'x', 'gasto')",
      [X.espaco],
      RLS,
    );
    await falha(
      "insert into public.formas_pagamento (espaco_id, nome) values ($1, 'x')",
      [X.espaco],
      RLS,
    );
    await falha(
      `insert into public.lancamentos
         (espaco_id, ciclo_id, tipo, descricao, valor_real, categoria_id, forma_pagamento_id, data)
       values ($1, $2, 'gasto', 'x', 1, $3, $4, '2026-12-11')`,
      [X.espaco, X.ciclo, X.categoria, X.forma],
      RLS,
    );
  });

  test("não se adiciona como membro nem cria configurações", async () => {
    await comoUsuario(db, CAIO);
    await falha(
      "insert into public.membros (espaco_id, user_id) values ($1, $2)",
      [X.espaco, CAIO],
      RLS,
    );
    await falha(
      "insert into public.espacos (nome) values ('Casa falsa')",
      [],
      RLS,
    );
  });

  test("não move os próprios dados para a Casa A", async () => {
    await comoUsuario(db, CAIO);
    await falha(
      "update public.categorias set espaco_id = $1 where id = $2",
      [X.espaco, Y.categoria],
      RLS,
    );
    await falha(
      "update public.membros set espaco_id = $1 where espaco_id = $2",
      [X.espaco, Y.espaco],
      RLS,
    );
  });

  test("não usa ciclo, categoria ou forma da Casa A no próprio espaço", async () => {
    await comoUsuario(db, CAIO);
    const base = `insert into public.lancamentos
      (espaco_id, ciclo_id, tipo, descricao, valor_real, categoria_id, forma_pagamento_id, data)
      values ($1, $2, 'gasto', 'x', 1, $3, $4, '2026-12-11')`;
    await falha(base, [Y.espaco, X.ciclo, Y.categoria, Y.forma], /foreign key/);
    await falha(base, [Y.espaco, Y.ciclo, X.categoria, Y.forma], /foreign key/);
    await falha(base, [Y.espaco, Y.ciclo, Y.categoria, X.forma], /foreign key/);
  });

  test("não entra com código errado", async () => {
    await comoUsuario(db, CAIO);
    await falha(
      "select public.entrar_no_espaco('NAOEXISTE')",
      [],
      /Código de convite inválido/,
    );
    assert.equal(await contar("espacos", "id", X.espaco), 0);
  });

  test("continua vendo só a própria casa", async () => {
    await comoUsuario(db, CAIO);
    const { rows } = await db.query("select id from public.espacos");
    assert.deepEqual(
      rows.map((r) => r.id),
      [Y.espaco],
    );
  });
});

describe("visitante sem login (anon)", () => {
  test("não lê nada", async () => {
    await comoAnonimo(db);
    for (const tabela of TABELAS) {
      const { rows } = await db.query(
        `select count(*)::int as n from public.${tabela}`,
      );
      assert.equal(rows[0].n, 0, `anon leu ${tabela}`);
    }
  });

  test("não chama as funções de espaço", async () => {
    await comoAnonimo(db);
    await falha("select public.criar_espaco('x')", [], /permission denied/);
    await falha(
      "select public.entrar_no_espaco($1)",
      [X.codigo],
      /permission denied/,
    );
    await falha(
      "select public.eh_membro($1)",
      [X.espaco],
      /permission denied/,
    );
  });
});

describe("regras dos lançamentos", () => {
  const inserir = (extra) => `insert into public.lancamentos
    (espaco_id, ciclo_id, tipo, descricao, categoria_id, forma_pagamento_id, data${extra.colunas})
    values ($1, $2, 'gasto', 'teste', $3, $4, '2026-12-12'${extra.valores})`;

  test("exige estimativa ou valor real", async () => {
    await comoUsuario(db, ANA);
    await falha(
      inserir({ colunas: "", valores: "" }),
      [X.espaco, X.ciclo, X.categoria, X.forma],
      /lancamentos_estimativa_ou_real/,
    );
  });

  test("parcela_atual fica entre 1 e total_parcelas", async () => {
    await comoUsuario(db, ANA);
    const params = [X.espaco, X.ciclo, X.categoria, X.forma];
    for (const [atual, total] of [
      [0, 10],
      [11, 10],
      [1, null],
      [null, 10],
    ]) {
      await falha(
        inserir({
          colunas: ", estimativa, parcela_atual, total_parcelas",
          valores: `, 50, ${atual ?? "null"}, ${total ?? "null"}`,
        }),
        params,
        /lancamentos_parcelas/,
      );
    }
    const ok = await um(
      inserir({
        colunas: ", estimativa, parcela_atual, total_parcelas",
        valores: ", 50, 10, 10",
      }) + " returning id",
      params,
    );
    assert.ok(ok.id);
  });

  test("não aceita valor negativo", async () => {
    await comoUsuario(db, ANA);
    await falha(
      inserir({ colunas: ", valor_real", valores: ", -1" }),
      [X.espaco, X.ciclo, X.categoria, X.forma],
      /check constraint/,
    );
  });
});
