import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { CORES, ICONES, ICONES_FORMA, iconeDaForma, NOMES_ICONES, PALETA } from "./cadastros";

// Cores e ícones que já podem estar salvos no banco (versão anterior e sementes).
const CORES_ANTIGAS = [
  "#2563EB", "#0891B2", "#0D9488", "#16A34A", "#65A30D",
  "#D97706", "#DC2626", "#DB2777", "#7C3AED", "#475569",
];
const ICONES_ANTIGOS = [
  "house", "shopping-cart", "utensils", "car", "fuel", "bus", "heart-pulse", "pill",
  "dog", "cat", "baby", "graduation-cap", "book-open", "tv", "gamepad-2", "party-popper",
  "plane", "shirt", "gift", "dumbbell", "smartphone", "wifi", "zap", "droplets", "wrench",
  "receipt", "hand-coins", "handshake", "briefcase", "sparkles", "piggy-bank", "wallet", "tag",
];

describe("paleta de categorias", () => {
  it("tem 20 cores hexadecimais, sem repetir valor nem nome", () => {
    expect(PALETA).toHaveLength(20);
    for (const c of CORES) expect(c).toMatch(/^#[0-9A-F]{6}$/);
    expect(new Set(CORES).size).toBe(CORES.length);
    expect(new Set(PALETA.map((c) => c.nome)).size).toBe(PALETA.length);
  });

  it("mantém as cores antigas, para as categorias salvas continuarem válidas", () => {
    for (const c of CORES_ANTIGAS) expect(CORES).toContain(c);
  });
});

describe("ícones de categoria", () => {
  it("mantém os ícones antigos", () => {
    for (const nome of ICONES_ANTIGOS) expect(NOMES_ICONES).toContain(nome);
  });

  it("não repete o nome mostrado na tela", () => {
    const nomes = Object.values(ICONES).map((i) => i.nome);
    expect(new Set(nomes).size).toBe(nomes.length);
  });
});

describe("ícones das formas de pagamento", () => {
  it("tem todas as chaves que o banco sugere pelo nome", () => {
    const sql = readFileSync(
      path.join(process.cwd(), "supabase/migrations/20261115100000_icone_formas_pagamento.sql"),
      "utf8",
    );
    const sugeridas = [...sql.matchAll(/(?:then|else) '([a-z0-9-]+)'/g)].map((m) => m[1]);
    expect(sugeridas.length).toBeGreaterThan(10);
    for (const chave of sugeridas) expect(ICONES_FORMA).toHaveProperty(chave);
  });

  it("usa a carteira para ícone desconhecido ou vazio", () => {
    expect(iconeDaForma("nao-existe")).toBe(ICONES_FORMA.wallet.Icone);
    expect(iconeDaForma(null)).toBe(ICONES_FORMA.wallet.Icone);
    expect(iconeDaForma("pix")).toBe(ICONES_FORMA.pix.Icone);
  });

  it("não repete o nome mostrado na tela", () => {
    const nomes = Object.values(ICONES_FORMA).map((i) => i.nome);
    expect(new Set(nomes).size).toBe(nomes.length);
  });
});
