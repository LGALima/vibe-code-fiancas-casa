// Auditoria: um usuário consegue alterar o espaço de outro?
// Complementa isolamento.test.mjs com os caminhos indiretos: chaves que
// apontam para outro espaço, mover linhas, funções (RPC) com ids alheios,
// atualizações em massa e quem saiu do espaço.
//
// Cenário: Ana e Bia na "Casa A"; Caio na "Casa C" (sem o código da Casa A).

import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import { comoAdmin, comoUsuario, criarBanco } from "./banco.mjs";

const ANA = "00000000-0000-4000-8000-00000000000a";
const BIA = "00000000-0000-4000-8000-00000000000b";
const CAIO = "00000000-0000-4000-8000-00000000000c";

const RLS = /row-level security/;
const FK = /foreign key/;

let db;
const A = {}; // Casa A
const C = {}; // Casa C

async function um(sql, params) {
  const { rows } = await db.query(sql, params);
  return rows[0];
}

async function afetadas(sql, params) {
  const r = await db.query(sql, params);
  return r.affectedRows ?? 0;
}

/** Retrato da Casa A, lido como admin, para comparar antes e depois. */
async function retratoCasaA() {
  await comoAdmin(db);
  const consultas = {
    espaco: "select nome, codigo_convite from public.espacos where id = $1",
    membros: "select user_id, nome_exibicao from public.membros where espaco_id = $1 order by user_id",
    config: "select dia_inicio_ciclo, moeda from public.configuracoes where espaco_id = $1",
    ciclos: "select id, nome, data_inicio, data_fim from public.ciclos where espaco_id = $1 order by id",
    categorias: "select id, nome, ativa from public.categorias where espaco_id = $1 order by id",
    formas: "select id, nome, ativa from public.formas_pagamento where espaco_id = $1 order by id",
    lancamentos: `select id, descricao, estimativa, valor_real, ciclo_id, vinculado_id, grupo_id, criado_por
                    from public.lancamentos where espaco_id = $1 order by id`,
  };
  const r = {};
  for (const [nome, sql] of Object.entries(consultas)) {
    r[nome] = (await db.query(sql, [A.espaco])).rows;
  }
  return JSON.stringify(r);
}

let antes;

before(async () => {
  ({ db } = await criarBanco());
  await comoAdmin(db);
  await db.query(
    "insert into auth.users (id, email) values ($1, 'ana@ex.com'), ($2, 'bia@ex.com'), ($3, 'caio@ex.com')",
    [ANA, BIA, CAIO],
  );

  await comoUsuario(db, ANA);
  A.espaco = (await um("select public.criar_espaco('Casa A', 'Ana') as id")).id;
  A.codigo = (await um("select codigo_convite from public.espacos where id = $1", [A.espaco])).codigo_convite;
  A.ciclo = (
    await um(
      "insert into public.ciclos (espaco_id, nome, data_inicio, data_fim) values ($1, 'Dezembro/2026', '2026-12-03', '2027-01-02') returning id",
      [A.espaco],
    )
  ).id;
  A.categoria = (await um("select id from public.categorias where espaco_id = $1 limit 1", [A.espaco])).id;
  A.forma = (await um("select id from public.formas_pagamento where espaco_id = $1 limit 1", [A.espaco])).id;
  A.lancamento = (
    await um(
      `insert into public.lancamentos
         (espaco_id, ciclo_id, tipo, descricao, estimativa, categoria_id, forma_pagamento_id, data,
          recorrente, parcela_atual, total_parcelas, grupo_id)
       values ($1, $2, 'gasto', 'Geladeira', 300, $3, $4, '2026-12-10', true, 2, 10, gen_random_uuid())
       returning id`,
      [A.espaco, A.ciclo, A.categoria, A.forma],
    )
  ).id;

  await comoUsuario(db, BIA);
  await um("select public.entrar_no_espaco($1, 'Bia')", [A.codigo]);

  await comoUsuario(db, CAIO);
  C.espaco = (await um("select public.criar_espaco('Casa C', 'Caio') as id")).id;
  C.ciclo = (
    await um(
      "insert into public.ciclos (espaco_id, nome, data_inicio, data_fim) values ($1, 'Dezembro/2026', '2026-12-03', '2027-01-02') returning id",
      [C.espaco],
    )
  ).id;
  C.categoria = (await um("select id from public.categorias where espaco_id = $1 limit 1", [C.espaco])).id;
  C.forma = (await um("select id from public.formas_pagamento where espaco_id = $1 limit 1", [C.espaco])).id;
  C.lancamento = (
    await um(
      `insert into public.lancamentos
         (espaco_id, ciclo_id, tipo, descricao, valor_real, categoria_id, forma_pagamento_id, data)
       values ($1, $2, 'gasto', 'Do Caio', 10, $3, $4, '2026-12-11') returning id`,
      [C.espaco, C.ciclo, C.categoria, C.forma],
    )
  ).id;

  antes = await retratoCasaA();
});

after(async () => {
  await db?.close();
});

describe("Caio (outro espaço) tentando alterar a Casa A", () => {
  test("não liga os próprios dados a linhas da Casa A", async () => {
    await comoUsuario(db, CAIO);
    // Empréstimo → reembolso apontando para um lançamento da Casa A.
    await assert.rejects(
      db.query("update public.lancamentos set vinculado_id = $1 where id = $2", [A.lancamento, C.lancamento]),
      FK,
    );
    // Ciclo "copiado" de um ciclo da Casa A.
    await assert.rejects(
      db.query("update public.ciclos set ciclo_origem_id = $1 where id = $2", [A.ciclo, C.ciclo]),
      FK,
    );
  });

  test("não move o próprio lançamento, ciclo ou forma para a Casa A", async () => {
    await comoUsuario(db, CAIO);
    for (const sql of [
      "update public.lancamentos set espaco_id = $1 where id = $2",
      "update public.ciclos set espaco_id = $1 where id = $2",
      "update public.formas_pagamento set espaco_id = $1 where id = $2",
    ]) {
      const id = sql.includes("lancamentos") ? C.lancamento : sql.includes("ciclos") ? C.ciclo : C.forma;
      await assert.rejects(db.query(sql, [A.espaco, id]), /row-level security|foreign key|Não há ciclo/, sql);
    }
  });

  test("não vira outra pessoa no próprio cadastro de membro", async () => {
    await comoUsuario(db, CAIO);
    await assert.rejects(
      db.query("update public.membros set user_id = $1 where user_id = $2", [ANA, CAIO]),
      RLS,
    );
    await assert.rejects(
      db.query("insert into public.membros (espaco_id, user_id) values ($1, $2)", [C.espaco, ANA]),
      RLS,
    );
  });

  test("não lança na própria casa em nome da Ana", async () => {
    await comoUsuario(db, CAIO);
    await assert.rejects(
      db.query(
        `insert into public.lancamentos
           (espaco_id, ciclo_id, tipo, descricao, valor_real, categoria_id, forma_pagamento_id, data, criado_por)
         values ($1, $2, 'gasto', 'x', 1, $3, $4, '2026-12-12', $5)`,
        [C.espaco, C.ciclo, C.categoria, C.forma, ANA],
      ),
      RLS,
    );
  });

  test("atualizações e exclusões em massa só pegam a Casa C", async () => {
    await comoUsuario(db, CAIO);
    // Sem where: só deveria pegar as linhas que o Caio enxerga.
    await db.query("update public.lancamentos set descricao = 'tudo do Caio', valor_real = 0");
    await db.query("update public.ciclos set nome = 'tudo do Caio'");
    await db.query("update public.categorias set ativa = false");
    await db.query("update public.formas_pagamento set ativa = false");
    await db.query("update public.configuracoes set dia_inicio_ciclo = 20");
    await db.query("update public.espacos set nome = 'tudo do Caio'");
    await db.query("update public.membros set nome_exibicao = 'tudo do Caio'");
    // delete em massa: a FK da categoria/forma em uso na própria casa recusa,
    // então exclui só lançamentos e ciclos.
    assert.equal(await afetadas("delete from public.lancamentos"), 1);
    assert.equal(await afetadas("delete from public.ciclos"), 1);
  });

  test("funções com ids da Casa A não leem nem alteram nada", async () => {
    await comoUsuario(db, CAIO);
    assert.equal((await um("select public.eh_membro($1) as r", [A.espaco])).r, false);
    assert.equal((await um("select public.ciclo_da_data($1, '2026-12-10') as r", [A.espaco])).r, null);
    assert.equal((await um("select public.analise_ciclo($1) as r", [A.ciclo])).r, null);
    const evolucao = (await um("select public.evolucao_ciclos($1) as r", [A.espaco])).r;
    assert.ok(!JSON.stringify(evolucao ?? null).includes(A.ciclo), "evolução vazou ciclos da Casa A");
    await assert.rejects(db.query("select public.previa_proximo_ciclo($1)", [A.ciclo]), /Ciclo não encontrado/);
    await assert.rejects(db.query("select public.criar_proximo_ciclo($1)", [A.ciclo]), /Ciclo não encontrado/);
    // Funções internas continuam fechadas.
    await assert.rejects(db.query("select public.inserir_cadastros_padrao($1)", [A.espaco]), /permission denied/);
    await assert.rejects(db.query("select public.marcar_espaco_ativo($1)", [A.espaco]), /permission denied/);
    await assert.rejects(db.query("select privado.planejar_proximo_ciclo($1, false)", [A.ciclo]), /permission denied/);
  });

  test("não marca a Casa A como espaço ativo", async () => {
    await comoUsuario(db, CAIO);
    await assert.rejects(
      db.query(
        `insert into public.preferencias_usuario (user_id, espaco_ativo_id) values (auth.uid(), $1)
         on conflict (user_id) do update set espaco_ativo_id = excluded.espaco_ativo_id`,
        [A.espaco],
      ),
      RLS,
    );
  });

  test("a Casa A continua exatamente igual", async () => {
    assert.equal(await retratoCasaA(), antes);
  });
});

describe("quem saiu do espaço", () => {
  test("Bia sai da Casa A e perde o acesso de escrita", async () => {
    await comoUsuario(db, BIA);
    assert.equal(await afetadas("delete from public.membros where user_id = auth.uid() and espaco_id = $1", [A.espaco]), 1);
    assert.equal(await afetadas("update public.lancamentos set valor_real = 1 where id = $1", [A.lancamento]), 0);
    assert.equal(await afetadas("delete from public.ciclos where id = $1", [A.ciclo]), 0);
    await assert.rejects(
      db.query("insert into public.categorias (espaco_id, nome, tipo) values ($1, 'x', 'gasto')", [A.espaco]),
      RLS,
    );
  });

  test("a Casa A continua igual (sem a Bia na lista de membros)", async () => {
    await comoAdmin(db);
    const membros = (await db.query("select user_id from public.membros where espaco_id = $1", [A.espaco])).rows;
    assert.deepEqual(membros.map((m) => m.user_id), [ANA]);
    const l = await um("select valor_real, descricao from public.lancamentos where id = $1", [A.lancamento]);
    assert.equal(l.valor_real, null);
    assert.equal(l.descricao, "Geladeira");
  });
});
