import { describe, expect, it } from "vitest";
import { escolherEspacoAtivo, nomeExibicaoSugerido } from "./espacos";

const casa = { id: "a", nome: "Casa", nomeExibicao: "Lucas" };
const praia = { id: "b", nome: "Praia", nomeExibicao: null };
const viagem = { id: "c", nome: "Viagem", nomeExibicao: "Luc" };

describe("escolherEspacoAtivo", () => {
  it("usa o espaço da preferência", () => {
    expect(escolherEspacoAtivo([casa, praia], "b")).toBe(praia);
  });

  it("sem preferência, ou com um espaço de que saiu, usa o mais antigo", () => {
    expect(escolherEspacoAtivo([casa, praia], null)).toBe(casa);
    expect(escolherEspacoAtivo([casa, praia], "zzz")).toBe(casa);
  });

  it("sem espaços, devolve null", () => {
    expect(escolherEspacoAtivo([], "a")).toBeNull();
  });
});

describe("nomeExibicaoSugerido", () => {
  it("pega o nome mais recente preenchido", () => {
    expect(nomeExibicaoSugerido([casa, viagem, praia])).toBe("Luc");
  });

  it("vazio quando nenhum espaço tem nome", () => {
    expect(nomeExibicaoSugerido([praia])).toBe("");
    expect(nomeExibicaoSugerido([])).toBe("");
  });
});
