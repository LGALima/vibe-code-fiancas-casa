import { describe, expect, test } from "vitest";
import { lancamentoSchema, type LancamentoEntrada } from "./lancamento";

const ciclos = [
  { id: "dez", data_inicio: "2026-12-03", data_fim: "2027-01-02" },
  { id: "jan", data_inicio: "2027-01-03", data_fim: "2027-02-02" },
];
const schema = lancamentoSchema(ciclos);

const base: LancamentoEntrada = {
  tipo: "gasto",
  descricao: "",
  estimativa: "",
  valorReal: "45,90",
  categoriaId: "cat",
  formaId: "pix",
  data: "2026-12-10",
  recorrente: false,
  parcelado: false,
  totalParcelas: "",
  parcelaAtual: "1",
  observacao: "",
};

function erros(entrada: Partial<LancamentoEntrada>) {
  const r = schema.safeParse({ ...base, ...entrada });
  return r.success ? {} : Object.fromEntries(r.error.issues.map((i) => [i.path.join("."), i.message]));
}

describe("lancamentoSchema", () => {
  test("gasto comum: só valor, categoria e forma", () => {
    const r = schema.parse(base);
    expect(r).toMatchObject({ valorReal: 45.9, estimativa: null, cicloId: "dez", recorrente: false });
  });

  test("valor real obrigatório quando não há estimativa", () => {
    expect(erros({ valorReal: "" })).toHaveProperty("valorReal");
    expect(erros({ valorReal: "", estimativa: "100" })).toEqual({});
  });

  test("valor digitado errado", () => {
    expect(erros({ valorReal: "abc" }).valorReal).toMatch(/inválido/);
  });

  test("a data define o ciclo", () => {
    expect(schema.parse({ ...base, data: "2027-01-02" }).cicloId).toBe("dez");
    expect(schema.parse({ ...base, data: "2027-01-03" }).cicloId).toBe("jan");
    expect(erros({ data: "2027-03-01" }).data).toMatch(/Não há ciclo para 01\/03\/2027/);
  });

  test("parcelado implica recorrente", () => {
    const r = schema.parse({ ...base, parcelado: true, totalParcelas: "10", parcelaAtual: "1" });
    expect(r).toMatchObject({ recorrente: true, totalParcelas: 10, parcelaAtual: 1 });
  });

  test("parcelas fora do intervalo", () => {
    expect(erros({ parcelado: true, totalParcelas: "1", parcelaAtual: "1" })).toHaveProperty("totalParcelas");
    expect(erros({ parcelado: true, totalParcelas: "10", parcelaAtual: "11" })).toHaveProperty("parcelaAtual");
    expect(erros({ parcelado: true, totalParcelas: "10", parcelaAtual: "0" })).toHaveProperty("parcelaAtual");
  });

  test("não parcelado zera as parcelas", () => {
    const r = schema.parse({ ...base, totalParcelas: "10", parcelaAtual: "3" });
    expect(r).toMatchObject({ totalParcelas: null, parcelaAtual: null });
  });

  test("categoria e forma obrigatórias", () => {
    expect(erros({ categoriaId: "", formaId: "" })).toMatchObject({
      categoriaId: "Escolha uma categoria.",
      formaId: "Escolha a forma de pagamento.",
    });
  });
});
