import { describe, expect, test } from "vitest";
import { formatarBRL, formatarDiferenca, lerValor, valorParaCampo, mascararCentavos, mascararColado } from "./dinheiro";

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

describe("mascararCentavos", () => {
  test("os dois últimos dígitos viram centavos", () => {
    expect(mascararCentavos("7890")).toBe("78,90");
    expect(mascararCentavos("7")).toBe("0,07");
    expect(mascararCentavos("78")).toBe("0,78");
    expect(mascararCentavos("789")).toBe("7,89");
  });

  test("separa milhar com ponto", () => {
    expect(mascararCentavos("123456")).toBe("1.234,56");
    expect(mascararCentavos("123456789")).toBe("1.234.567,89");
  });

  test("digitar sobre o valor já mascarado continua a conta", () => {
    expect(mascararCentavos("78,901")).toBe("789,01");
    // Apagar o último caractere tira o último dígito.
    expect(mascararCentavos("78,9")).toBe("7,89");
  });

  test("ignora zeros à esquerda e o que não é dígito", () => {
    expect(mascararCentavos("0,075")).toBe("0,75");
    expect(mascararCentavos("R$ 1a2")).toBe("0,12");
    expect(mascararCentavos("0")).toBe("0,00");
  });

  test("vazio continua vazio", () => {
    expect(mascararCentavos("")).toBe("");
    expect(mascararCentavos("abc")).toBe("");
  });

  test("para no limite do banco (12 dígitos)", () => {
    expect(mascararCentavos("9999999999999")).toBe("9.999.999.999,99");
  });

  test("o resultado é lido de volta como o mesmo valor", () => {
    expect(lerValor(mascararCentavos("7890"))).toBe(78.9);
    expect(lerValor(mascararCentavos("123456"))).toBe(1234.56);
  });
});

describe("mascararColado", () => {
  test("lê o valor colado no jeito brasileiro", () => {
    expect(mascararColado("R$ 1.234,5")).toBe("1.234,50");
    expect(mascararColado("120")).toBe("120,00");
    expect(mascararColado("12.50")).toBe("12,50");
  });
});
