import { describe, expect, test } from "vitest";
import { formatarBRL, formatarDiferenca, lerValor, valorParaCampo } from "./dinheiro";

const nbsp = (s: string) => s.replace(/ /g, " ");

describe("lerValor", () => {
  test.each([
    ["12", 12],
    ["12,5", 12.5],
    ["12,50", 12.5],
    ["1.234,56", 1234.56],
    ["1234,56", 1234.56],
    ["R$ 1.234,56", 1234.56],
    ["12.5", 12.5],
    ["1.234", 1234],
    ["1.234.567", 1234567],
    ["0,1", 0.1],
    ["0", 0],
    [" 45 ", 45],
  ])("%s → %s", (texto, esperado) => {
    expect(lerValor(texto)).toBe(esperado);
  });

  test.each(["", "   ", "abc", "-5", "1,2,3", "1.23.4", null, undefined])(
    "%s → null",
    (texto) => {
      expect(lerValor(texto as string | null | undefined)).toBeNull();
    },
  );
});

describe("formatação", () => {
  test("formatarBRL", () => {
    expect(nbsp(formatarBRL(1234.5))).toBe("R$ 1.234,50");
  });

  test("formatarDiferenca com sinal", () => {
    expect(nbsp(formatarDiferenca(-10))).toBe("−R$ 10,00");
    expect(nbsp(formatarDiferenca(5))).toBe("+R$ 5,00");
  });

  test("valorParaCampo", () => {
    expect(valorParaCampo(1234.5)).toBe("1.234,50");
    expect(valorParaCampo(null)).toBe("");
  });
});
