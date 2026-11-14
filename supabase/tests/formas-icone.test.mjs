// Ícone das formas de pagamento: sugestão pelo nome, cadastros padrão e edição.

import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import { comoAdmin, comoUsuario, criarBanco } from "./banco.mjs";

const ANA = "00000000-0000-4000-8000-00000000000a";

let db;
let casa;

async function um(sql, params) {
  const { rows } = await db.query(sql, params);
  return rows[0];
}

before(async () => {
  ({ db } = await criarBanco());
  await comoAdmin(db);
  await db.query("insert into auth.users (id, email) values ($1, 'ana@ex.com')", [ANA]);
  await comoUsuario(db, ANA);
  casa = (await um("select public.criar_espaco('Nossa casa', 'Ana') as id")).id;
});

after(async () => {
  await db?.close();
});

describe("sugestão de ícone pelo nome", () => {
  const casos = [
    ["Pix", false, "pix"],
    ["PIX Nubank", false, "pix"],
    ["Crédito", true, "credit-card"],
    ["Cartão Itaú", false, "credit-card"],
    ["Nubank", true, "credit-card"],
    ["Débito", false, "wallet-cards"],
    ["Débito automático", false, "repeat"],
    ["Dinheiro", false, "banknote"],
    ["TED", false, "arrow-left-right"],
    ["Transferência", false, "arrow-left-right"],
    ["Cripto", false, "bitcoin"],
    ["Boleto", false, "barcode"],
    ["Vale-refeição", false, "utensils"],
    ["VA", false, "shopping-basket"],
    ["Poupança", false, "piggy-bank"],
    ["Cashback", false, "coins"],
    ["PicPay", false, "smartphone"],
    ["Outra coisa", false, "wallet"],
    // "Ted" dentro de outra palavra não conta como TED.
    ["Fiado do Teddy", false, "wallet"],
  ];
  for (const [nome, credito, esperado] of casos) {
    test(`${nome} → ${esperado}`, async () => {
      await comoAdmin(db);
      const r = await um("select privado.icone_sugerido_forma($1, $2) as icone", [nome, credito]);
      assert.equal(r.icone, esperado);
    });
  }
});

describe("formas do espaço", () => {
  test("cadastros padrão de espaço novo já vêm com ícone", async () => {
    await comoUsuario(db, ANA);
    const { rows } = await db.query(
      "select nome, icone from public.formas_pagamento where espaco_id = $1",
      [casa],
    );
    rows.sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
    assert.deepEqual(rows, [
      { nome: "Crédito", icone: "credit-card" },
      { nome: "Débito", icone: "wallet-cards" },
      { nome: "Dinheiro", icone: "banknote" },
      { nome: "Pix", icone: "pix" },
    ]);
  });

  test("forma nova sem ícone recebe a sugestão; com ícone, fica o escolhido", async () => {
    await comoUsuario(db, ANA);
    await db.query(
      "insert into public.formas_pagamento (espaco_id, nome) values ($1, 'TED')",
      [casa],
    );
    await db.query(
      "insert into public.formas_pagamento (espaco_id, nome, icone) values ($1, 'Binance', 'bitcoin')",
      [casa],
    );
    const { rows } = await db.query(
      "select nome, icone from public.formas_pagamento where espaco_id = $1 and nome in ('TED', 'Binance') order by nome",
      [casa],
    );
    assert.deepEqual(rows, [
      { nome: "Binance", icone: "bitcoin" },
      { nome: "TED", icone: "arrow-left-right" },
    ]);
  });

  test("membro troca o ícone", async () => {
    await comoUsuario(db, ANA);
    const r = await db.query(
      "update public.formas_pagamento set icone = 'smartphone' where espaco_id = $1 and nome = 'Pix'",
      [casa],
    );
    assert.equal(r.affectedRows, 1);
  });

  test("ícone com formato inválido é recusado", async () => {
    await comoUsuario(db, ANA);
    await assert.rejects(
      db.query("update public.formas_pagamento set icone = '<script>' where espaco_id = $1", [casa]),
      /formas_pagamento_icone_valido/,
    );
  });

  test("usuário comum não chama a função interna", async () => {
    await comoUsuario(db, ANA);
    await assert.rejects(
      db.query("select privado.icone_sugerido_forma('Pix', false)"),
      /permission denied/,
    );
  });
});
