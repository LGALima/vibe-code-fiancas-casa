// Gestão de membros: dono do espaço, novo código de convite e remover membro.
//
// Cenário: Ana cria a "Casa A" (dona), Bia e Davi entram pelo código.
// Caio tem a própria "Casa C".

import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import { comoAdmin, comoAnonimo, comoUsuario, criarBanco } from "./banco.mjs";

const ANA = "00000000-0000-4000-8000-00000000000a";
const BIA = "00000000-0000-4000-8000-00000000000b";
const CAIO = "00000000-0000-4000-8000-00000000000c";
const DAVI = "00000000-0000-4000-8000-00000000000d";

let db;
let casaA;
let casaC;

async function um(sql, params) {
  const { rows } = await db.query(sql, params);
  return rows[0];
}

async function papeis(espacoId) {
  await comoAdmin(db);
  const { rows } = await db.query(
    "select user_id, papel from public.membros where espaco_id = $1 order by criado_em, user_id",
    [espacoId],
  );
  return Object.fromEntries(rows.map((r) => [r.user_id, r.papel]));
}

async function codigo(espacoId) {
  await comoAdmin(db);
  return (await um("select codigo_convite from public.espacos where id = $1", [espacoId])).codigo_convite;
}

before(async () => {
  ({ db } = await criarBanco());
  await comoAdmin(db);
  await db.query(
    `insert into auth.users (id, email) values
       ($1, 'ana@ex.com'), ($2, 'bia@ex.com'), ($3, 'caio@ex.com'), ($4, 'davi@ex.com')`,
    [ANA, BIA, CAIO, DAVI],
  );

  await comoUsuario(db, ANA);
  casaA = (await um("select public.criar_espaco('Casa A', 'Ana') as id")).id;
  const cod = await codigo(casaA);
  await comoUsuario(db, BIA);
  await um("select public.entrar_no_espaco($1, 'Bia')", [cod]);
  await comoUsuario(db, DAVI);
  await um("select public.entrar_no_espaco($1, 'Davi')", [cod]);

  await comoUsuario(db, CAIO);
  casaC = (await um("select public.criar_espaco('Casa C', 'Caio') as id")).id;
});

after(async () => {
  await db?.close();
});

describe("papel no espaço", () => {
  test("quem cria é dono; quem entra pelo código é membro", async () => {
    assert.deepEqual(await papeis(casaA), { [ANA]: "dono", [BIA]: "membro", [DAVI]: "membro" });
    assert.deepEqual(await papeis(casaC), { [CAIO]: "dono" });
  });

  test("membro não se promove a dono pela API, mas continua editando o próprio nome", async () => {
    await comoUsuario(db, BIA);
    await assert.rejects(
      db.query("update public.membros set papel = 'dono' where user_id = auth.uid()"),
      /permission denied/,
    );
    await db.query("update public.membros set nome_exibicao = 'Bia S.' where user_id = auth.uid() and espaco_id = $1", [casaA]);
    await comoAdmin(db);
    const r = await um("select nome_exibicao, papel from public.membros where user_id = $1 and espaco_id = $2", [BIA, casaA]);
    assert.deepEqual(r, { nome_exibicao: "Bia S.", papel: "membro" });
  });

  test("só há um dono por espaço", async () => {
    await comoAdmin(db);
    await assert.rejects(
      db.query("update public.membros set papel = 'dono' where user_id = $1 and espaco_id = $2", [BIA, casaA]),
      /membros_um_dono_idx/,
    );
  });
});

describe("gerar_novo_codigo_convite", () => {
  test("qualquer membro gera; o código antigo para de funcionar", async () => {
    const antigo = await codigo(casaA);
    await comoUsuario(db, BIA);
    const novo = (await um("select public.gerar_novo_codigo_convite($1) as c", [casaA])).c;
    assert.match(novo, /^[A-F0-9]{8}$/);
    assert.notEqual(novo, antigo);
    assert.equal(await codigo(casaA), novo);

    await comoUsuario(db, CAIO);
    await assert.rejects(db.query("select public.entrar_no_espaco($1)", [antigo]), /Código de convite inválido/);
  });

  test("quem não é membro não troca o código de outro espaço", async () => {
    const antes = await codigo(casaA);
    await comoUsuario(db, CAIO);
    await assert.rejects(db.query("select public.gerar_novo_codigo_convite($1)", [casaA]), /Espaço não encontrado/);
    assert.equal(await codigo(casaA), antes);
  });
});

describe("remover_membro", () => {
  test("membro comum não remove ninguém", async () => {
    await comoUsuario(db, BIA);
    await assert.rejects(
      db.query("select public.remover_membro($1, $2)", [casaA, DAVI]),
      /Só o dono do espaço pode remover membros/,
    );
    await assert.rejects(
      db.query("select public.remover_membro($1, $2)", [casaA, ANA]),
      /Só o dono do espaço pode remover membros/,
    );
  });

  test("dono de outro espaço não remove membros da Casa A", async () => {
    await comoUsuario(db, CAIO);
    await assert.rejects(
      db.query("select public.remover_membro($1, $2)", [casaA, BIA]),
      /Só o dono do espaço pode remover membros/,
    );
    assert.equal(Object.keys(await papeis(casaA)).length, 3);
  });

  test("o dono não remove a si mesmo", async () => {
    await comoUsuario(db, ANA);
    await assert.rejects(
      db.query("select public.remover_membro($1, $2)", [casaA, ANA]),
      /não pode remover a si mesmo/,
    );
  });

  test("o dono remove: a pessoa perde o acesso e o código muda", async () => {
    // O Davi estava usando a Casa A.
    const antigo = await codigo(casaA);
    await comoUsuario(db, DAVI);
    assert.equal((await um("select espaco_ativo_id from public.preferencias_usuario where user_id = auth.uid()")).espaco_ativo_id, casaA);

    await comoUsuario(db, ANA);
    const novo = (await um("select public.remover_membro($1, $2) as c", [casaA, DAVI])).c;
    assert.notEqual(novo, antigo);
    assert.deepEqual(await papeis(casaA), { [ANA]: "dono", [BIA]: "membro" });

    await comoUsuario(db, DAVI);
    const { rows } = await db.query("select id from public.espacos where id = $1", [casaA]);
    assert.equal(rows.length, 0, "Davi ainda vê a Casa A");
    assert.equal(
      (await um("select espaco_ativo_id from public.preferencias_usuario where user_id = auth.uid()")).espaco_ativo_id,
      null,
    );
    // Não volta com o código que conhecia.
    await assert.rejects(db.query("select public.entrar_no_espaco($1)", [antigo]), /Código de convite inválido/);
  });

  test("remover quem não é membro avisa", async () => {
    await comoUsuario(db, ANA);
    await assert.rejects(
      db.query("select public.remover_membro($1, $2)", [casaA, CAIO]),
      /Membro não encontrado/,
    );
  });

  test("visitante sem login não chama as funções", async () => {
    await comoAnonimo(db);
    await assert.rejects(db.query("select public.gerar_novo_codigo_convite($1)", [casaA]), /permission denied/);
    await assert.rejects(db.query("select public.remover_membro($1, $2)", [casaA, BIA]), /permission denied/);
  });

  test("funções internas não são chamáveis pela API", async () => {
    await comoUsuario(db, ANA);
    await assert.rejects(db.query("select privado.trocar_codigo_convite($1)", [casaA]), /permission denied/);
  });
});

describe("quando o dono sai", () => {
  test("o membro mais antigo vira dono", async () => {
    await comoUsuario(db, ANA);
    await db.query("delete from public.membros where user_id = auth.uid() and espaco_id = $1", [casaA]);
    assert.deepEqual(await papeis(casaA), { [BIA]: "dono" });

    // E a nova dona já pode gerenciar.
    await comoUsuario(db, BIA);
    const c = (await um("select public.gerar_novo_codigo_convite($1) as c", [casaA])).c;
    assert.match(c, /^[A-F0-9]{8}$/);
  });

  test("quem entra depois continua membro", async () => {
    const cod = await codigo(casaA);
    await comoUsuario(db, DAVI);
    await um("select public.entrar_no_espaco($1, 'Davi')", [cod]);
    assert.deepEqual(await papeis(casaA), { [BIA]: "dono", [DAVI]: "membro" });
  });
});
