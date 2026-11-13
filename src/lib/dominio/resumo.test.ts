import { describe, expect, test } from "vitest";
import {
  RESUMO_ZERADO,
  diasRestantes,
  podeGastarPorDia,
  progressoDoPrevisto,
  resumoDaLinha,
} from "./resumo";

const dez = { data_inicio: "2026-12-03", data_fim: "2027-01-02" };

describe("diasRestantes", () => {
  test("conta hoje e o último dia", () => {
    expect(diasRestantes(dez, "2027-01-02")).toBe(1);
    expect(diasRestantes(dez, "2027-01-01")).toBe(2);
    expect(diasRestantes(dez, "2026-12-03")).toBe(31);
  });

  test("ciclo que ainda não começou: o ciclo inteiro", () => {
    expect(diasRestantes(dez, "2026-11-20")).toBe(31);
  });

  test("ciclo encerrado: zero", () => {
    expect(diasRestantes(dez, "2027-01-03")).toBe(0);
  });
});

describe("podeGastarPorDia", () => {
  test("saldo previsto ÷ dias restantes", () => {
    expect(podeGastarPorDia(3000, 30)).toBe(100);
    expect(podeGastarPorDia(5989.35, 20)).toBe(299.46); // 299,4675 → para baixo
  });

  test("arredonda para baixo no centavo", () => {
    expect(podeGastarPorDia(100, 3)).toBe(33.33);
    expect(podeGastarPorDia(0.1, 3)).toBe(0.03);
  });

  test("saldo negativo dá valor negativo (já estourou)", () => {
    expect(podeGastarPorDia(-90, 3)).toBe(-30);
  });

  test("ciclo encerrado: null", () => {
    expect(podeGastarPorDia(500, 0)).toBeNull();
  });
});

describe("progressoDoPrevisto", () => {
  test("realizado ÷ previsto", () => {
    expect(progressoDoPrevisto(810.65, 2310.65)).toBeCloseTo(0.3508, 4);
    expect(progressoDoPrevisto(0, 1000)).toBe(0);
  });

  test("pode passar de 100%", () => {
    expect(progressoDoPrevisto(1200, 1000)).toBe(1.2);
  });

  test("sem previsto", () => {
    expect(progressoDoPrevisto(0, 0)).toBe(0);
    expect(progressoDoPrevisto(50, 0)).toBe(1);
  });
});

describe("resumoDaLinha", () => {
  test("view vazia ou com nulos vira zero", () => {
    expect(resumoDaLinha(null)).toEqual(RESUMO_ZERADO);
    expect(resumoDaLinha({ ganhos_previsto: null, gastos_previsto: 10 }).gastos_previsto).toBe(10);
  });

  test("aceita números que chegam como texto", () => {
    const linha = { saldo_previsto: "5989.35" as unknown as number };
    expect(resumoDaLinha(linha).saldo_previsto).toBe(5989.35);
  });
});
