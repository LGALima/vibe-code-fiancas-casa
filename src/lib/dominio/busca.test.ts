import { describe, expect, test } from "vitest";
import { combinaComBusca, normalizar } from "./busca";

describe("normalizar", () => {
  test("tira acentos e maiúsculas", () => {
    expect(normalizar("  Conta de Água ")).toBe("conta de agua");
  });
});

describe("combinaComBusca", () => {
  test("ignora maiúsculas e acentos", () => {
    expect(combinaComBusca("Conta de Água", "agua")).toBe(true);
    expect(combinaComBusca("Farmácia", "FARMACIA")).toBe(true);
  });

  test("todas as palavras precisam aparecer, em qualquer ordem", () => {
    expect(combinaComBusca("Conta de Luz", "luz conta")).toBe(true);
    expect(combinaComBusca("Conta de Luz", "conta agua")).toBe(false);
  });

  test("acha pedaço de palavra", () => {
    expect(combinaComBusca("Supermercado", "merc")).toBe(true);
  });

  test("busca vazia acha tudo", () => {
    expect(combinaComBusca("Qualquer", "")).toBe(true);
    expect(combinaComBusca("Qualquer", "   ")).toBe(true);
  });
});
