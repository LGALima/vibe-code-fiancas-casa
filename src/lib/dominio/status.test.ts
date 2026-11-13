import { describe, expect, test } from "vitest";
import { avaliarDiferenca, calcularStatus, diferenca, valorPrevisto } from "./status";

describe("calcularStatus", () => {
  test("só estimativa: Previsto", () => {
    expect(calcularStatus({ estimativa: 100, valor_real: null })).toBe("previsto");
  });

  test("estimativa e valor real: Realizado", () => {
    expect(calcularStatus({ estimativa: 100, valor_real: 90 })).toBe("realizado");
  });

  test("só valor real: Não planejado", () => {
    expect(calcularStatus({ estimativa: null, valor_real: 90 })).toBe("nao_planejado");
  });

  test("valor zero conta como preenchido", () => {
    expect(calcularStatus({ estimativa: 0, valor_real: null })).toBe("previsto");
    expect(calcularStatus({ estimativa: null, valor_real: 0 })).toBe("nao_planejado");
    expect(calcularStatus({ estimativa: 0, valor_real: 0 })).toBe("realizado");
  });

  test("sem nenhum dos dois é erro (o banco também impede)", () => {
    expect(() => calcularStatus({ estimativa: null, valor_real: null })).toThrow();
  });
});

describe("diferenca", () => {
  test("real − estimativa, com centavos exatos", () => {
    expect(diferenca({ estimativa: 100, valor_real: 90 })).toBe(-10);
    expect(diferenca({ estimativa: 0.1, valor_real: 0.3 })).toBe(0.2);
  });

  test("null quando não é Realizado", () => {
    expect(diferenca({ estimativa: 100, valor_real: null })).toBeNull();
    expect(diferenca({ estimativa: null, valor_real: 90 })).toBeNull();
  });
});

describe("avaliarDiferenca", () => {
  test("gasto: gastar menos é favorável", () => {
    expect(avaliarDiferenca("gasto", -10)).toBe("favoravel");
    expect(avaliarDiferenca("gasto", 10)).toBe("desfavoravel");
  });

  test("ganho: receber mais é favorável", () => {
    expect(avaliarDiferenca("ganho", 10)).toBe("favoravel");
    expect(avaliarDiferenca("ganho", -10)).toBe("desfavoravel");
  });

  test("sem diferença é neutra", () => {
    expect(avaliarDiferenca("gasto", 0)).toBe("neutra");
    expect(avaliarDiferenca("ganho", null)).toBe("neutra");
  });
});

describe("valorPrevisto", () => {
  test("usa o real quando existe; senão a estimativa", () => {
    expect(valorPrevisto({ estimativa: 100, valor_real: 90 })).toBe(90);
    expect(valorPrevisto({ estimativa: 100, valor_real: null })).toBe(100);
    expect(valorPrevisto({ estimativa: null, valor_real: 50 })).toBe(50);
  });
});
