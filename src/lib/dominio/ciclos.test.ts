import { describe, expect, test } from "vitest";
import {
  cicloDaData,
  cicloInicial,
  cicloPadraoDaData,
  fimDoCiclo,
  nomeDoCiclo,
  sugerirNovoCiclo,
} from "./ciclos";

const dez = { id: "dez", data_inicio: "2026-12-03", data_fim: "2027-01-02" };
const jan = { id: "jan", data_inicio: "2027-01-03", data_fim: "2027-02-02" };
const nov = { id: "nov", data_inicio: "2026-11-03", data_fim: "2026-12-02" };

describe("fimDoCiclo", () => {
  test("véspera do mesmo dia no mês seguinte", () => {
    expect(fimDoCiclo("2026-12-03")).toBe("2027-01-02");
    expect(fimDoCiclo("2027-01-03")).toBe("2027-02-02");
  });

  test("fevereiro e ano bissexto", () => {
    expect(fimDoCiclo("2027-02-03")).toBe("2027-03-02");
    expect(fimDoCiclo("2028-01-30")).toBe("2028-02-28");
    expect(fimDoCiclo("2027-01-31")).toBe("2027-02-27");
  });
});

describe("nomeDoCiclo", () => {
  test("mês/ano do início", () => {
    expect(nomeDoCiclo("2026-12-03")).toBe("Dezembro/2026");
    expect(nomeDoCiclo("2026-12-28")).toBe("Dezembro/2026");
    expect(nomeDoCiclo("2027-01-31")).toBe("Janeiro/2027");
  });
});

describe("cicloPadraoDaData", () => {
  test("data no dia de início ou depois: ciclo começa neste mês", () => {
    expect(cicloPadraoDaData("2026-12-03", 3)).toEqual({
      nome: "Dezembro/2026",
      data_inicio: "2026-12-03",
      data_fim: "2027-01-02",
    });
    expect(cicloPadraoDaData("2026-12-25", 3).data_inicio).toBe("2026-12-03");
  });

  test("data antes do dia de início: ciclo começou no mês anterior", () => {
    expect(cicloPadraoDaData("2027-01-02", 3)).toEqual({
      nome: "Dezembro/2026",
      data_inicio: "2026-12-03",
      data_fim: "2027-01-02",
    });
  });

  test("virada de ano para trás", () => {
    expect(cicloPadraoDaData("2027-01-01", 5).data_inicio).toBe("2026-12-05");
  });

  test("dia de início 1: ciclo = mês do calendário", () => {
    expect(cicloPadraoDaData("2027-02-15", 1)).toEqual({
      nome: "Fevereiro/2027",
      data_inicio: "2027-02-01",
      data_fim: "2027-02-28",
    });
  });
});

describe("cicloDaData (a data define o ciclo)", () => {
  const ciclos = [nov, dez, jan];

  test("escolhe o ciclo que contém a data, inclusive nas bordas", () => {
    expect(cicloDaData(ciclos, "2026-12-03")?.id).toBe("dez");
    expect(cicloDaData(ciclos, "2026-12-15")?.id).toBe("dez");
    expect(cicloDaData(ciclos, "2027-01-02")?.id).toBe("dez");
    expect(cicloDaData(ciclos, "2027-01-03")?.id).toBe("jan");
    expect(cicloDaData(ciclos, "2026-12-02")?.id).toBe("nov");
  });

  test("null quando nenhum ciclo contém a data", () => {
    expect(cicloDaData(ciclos, "2027-02-03")).toBeNull();
    expect(cicloDaData([], "2026-12-10")).toBeNull();
  });

  test("datas sobrepostas: vale o ciclo que começou por último", () => {
    const especial = { id: "especial", data_inicio: "2026-12-20", data_fim: "2027-01-10" };
    expect(cicloDaData([dez, especial, jan], "2026-12-25")?.id).toBe("especial");
    expect(cicloDaData([dez, especial, jan], "2026-12-10")?.id).toBe("dez");
  });
});

describe("cicloInicial (tela Início)", () => {
  test("abre no ciclo que contém hoje", () => {
    expect(cicloInicial([nov, dez, jan], "2026-12-15")?.id).toBe("dez");
  });

  test("sem ciclo para hoje: o último que já terminou", () => {
    expect(cicloInicial([nov, dez], "2027-03-10")?.id).toBe("dez");
  });

  test("só ciclos futuros: o mais próximo", () => {
    expect(cicloInicial([jan, dez], "2026-11-20")?.id).toBe("dez");
  });

  test("sem ciclos: null", () => {
    expect(cicloInicial([], "2026-12-15")).toBeNull();
  });
});

describe("sugerirNovoCiclo", () => {
  test("sem ciclos: o ciclo padrão de hoje", () => {
    expect(sugerirNovoCiclo([], "2026-12-15", 3)).toEqual({
      nome: "Dezembro/2026",
      data_inicio: "2026-12-03",
      data_fim: "2027-01-02",
    });
  });

  test("hoje já tem ciclo: o próximo, começando no dia seguinte ao último", () => {
    expect(sugerirNovoCiclo([nov, dez], "2026-12-15", 3)).toEqual({
      nome: "Janeiro/2027",
      data_inicio: "2027-01-03",
      data_fim: "2027-02-02",
    });
  });

  test("último ciclo com fim fora do padrão: não sobrepõe", () => {
    const dezCurto = { data_inicio: "2026-12-03", data_fim: "2026-12-31" };
    const s = sugerirNovoCiclo([dezCurto], "2026-12-15", 3);
    expect(s.data_inicio).toBe("2027-01-01");
    expect(s.data_fim).toBe("2027-01-31");
  });
});
