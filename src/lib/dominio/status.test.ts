import { describe, expect, test } from "vitest";
import {
  aguardaConfirmacao,
  avaliarDiferenca,
  calcularStatus,
  diferenca,
  resumirPendentes,
  valorPrevisto,
} from "./status";

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

describe("aguardaConfirmacao", () => {
  const hoje = "2026-12-10";
  const base = { tipo: "gasto" as const, estimativa: 100, valor_real: null };

  test("previsto com data de hoje ou de antes: aguarda confirmação", () => {
    expect(aguardaConfirmacao({ ...base, data: "2026-12-10" }, hoje)).toBe(true);
    expect(aguardaConfirmacao({ ...base, data: "2026-12-03" }, hoje)).toBe(true);
  });

  test("previsto com data futura ainda não", () => {
    expect(aguardaConfirmacao({ ...base, data: "2026-12-11" }, hoje)).toBe(false);
  });

  test("com valor real (realizado ou não planejado) não aguarda", () => {
    expect(aguardaConfirmacao({ ...base, valor_real: 90, data: "2026-12-01" }, hoje)).toBe(false);
    expect(aguardaConfirmacao({ ...base, estimativa: null, valor_real: 90, data: "2026-12-01" }, hoje)).toBe(false);
  });
});

describe("resumirPendentes", () => {
  test("conta, soma gastos e ganhos separados e acha o mais antigo", () => {
    const r = resumirPendentes(
      [
        { tipo: "gasto", estimativa: 120.1, valor_real: null, data: "2026-12-08" },
        { tipo: "gasto", estimativa: 0.2, valor_real: null, data: "2026-12-05" },
        { tipo: "ganho", estimativa: 500, valor_real: null, data: "2026-12-10" },
        { tipo: "gasto", estimativa: 999, valor_real: null, data: "2026-12-20" }, // futuro
        { tipo: "gasto", estimativa: 50, valor_real: 50, data: "2026-12-04" }, // confirmado
      ],
      "2026-12-10",
    );
    expect(r).toEqual({ quantidade: 3, gastos: 120.3, ganhos: 500, maisAntigo: "2026-12-05" });
  });

  test("sem pendentes", () => {
    expect(resumirPendentes([], "2026-12-10")).toEqual({ quantidade: 0, gastos: 0, ganhos: 0, maisAntigo: null });
  });
});
