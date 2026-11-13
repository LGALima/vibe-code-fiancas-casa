import { describe, expect, it } from "vitest";
import { depoisDoLogin, destinoSeguro } from "./destino-seguro";

describe("destinoSeguro", () => {
  it("aceita só caminhos internos", () => {
    expect(destinoSeguro("/ciclos")).toBe("/ciclos");
    expect(destinoSeguro("https://mal.com")).toBe("/");
    expect(destinoSeguro("//mal.com")).toBe("/");
    expect(destinoSeguro(null)).toBe("/");
  });
});

describe("depoisDoLogin", () => {
  it("passa pela escolha do espaço", () => {
    expect(depoisDoLogin("/")).toBe("/espacos");
    expect(depoisDoLogin(null)).toBe("/espacos");
  });

  it("guarda o destino original, já validado", () => {
    expect(depoisDoLogin("/ciclos?x=1")).toBe("/espacos?next=%2Fciclos%3Fx%3D1");
    expect(depoisDoLogin("//mal.com")).toBe("/espacos");
  });
});
