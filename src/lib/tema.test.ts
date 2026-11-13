import { describe, expect, test } from "vitest";
import { SCRIPT_TEMA, ehPreferencia, proximaPreferencia, temaEfetivo } from "./tema";

describe("tema", () => {
  test("sistema segue o aparelho; claro e escuro fixam", () => {
    expect(temaEfetivo("sistema", true)).toBe("escuro");
    expect(temaEfetivo("sistema", false)).toBe("claro");
    expect(temaEfetivo("claro", true)).toBe("claro");
    expect(temaEfetivo("escuro", false)).toBe("escuro");
  });

  test("o botão alterna sistema → claro → escuro → sistema", () => {
    expect(proximaPreferencia("sistema")).toBe("claro");
    expect(proximaPreferencia("claro")).toBe("escuro");
    expect(proximaPreferencia("escuro")).toBe("sistema");
  });

  test("valores salvos inválidos são ignorados", () => {
    expect(ehPreferencia("escuro")).toBe(true);
    expect(ehPreferencia("dark")).toBe(false);
    expect(ehPreferencia(null)).toBe(false);
  });

  test("o script do <head> aplica a classe dark conforme a preferência", () => {
    const rodar = (salvo: string | null, sistemaEscuro: boolean) => {
      const classes = new Set<string>();
      const html = {
        classList: { toggle: (c: string, ligar: boolean) => (ligar ? classes.add(c) : classes.delete(c)) },
        style: { colorScheme: "" },
      };
      new Function("localStorage", "window", "document", SCRIPT_TEMA)(
        { getItem: () => salvo },
        { matchMedia: () => ({ matches: sistemaEscuro }) },
        { documentElement: html },
      );
      return { escuro: classes.has("dark"), colorScheme: html.style.colorScheme };
    };
    expect(rodar("escuro", false)).toEqual({ escuro: true, colorScheme: "dark" });
    expect(rodar("claro", true)).toEqual({ escuro: false, colorScheme: "light" });
    expect(rodar(null, true)).toEqual({ escuro: true, colorScheme: "dark" });
    expect(rodar("lixo", false)).toEqual({ escuro: false, colorScheme: "light" });
  });
});
