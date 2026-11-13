const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

/** 1234.5 → "R$ 1.234,50" */
export function formatarBRL(valor: number): string {
  return brl.format(valor);
}

/** −10 → "−R$ 10,00"; 5 → "+R$ 5,00" */
export function formatarDiferenca(valor: number): string {
  const sinal = valor < 0 ? "−" : valor > 0 ? "+" : "";
  return `${sinal}${brl.format(Math.abs(valor))}`;
}

/**
 * Lê o que a pessoa digitou no campo de valor, no jeito brasileiro:
 * "1.234,56", "1234,5", "R$ 12", "12.5" e "1.234" (milhar) funcionam.
 * Devolve null para vazio, inválido ou negativo.
 */
export function lerValor(texto: string | null | undefined): number | null {
  if (texto === null || texto === undefined) return null;
  let s = texto.replace(/R\$/gi, "").replace(/[\s ]/g, "");
  if (s === "") return null;
  if (!/^[\d.,]+$/.test(s)) return null;

  if (s.includes(",")) {
    // Vírgula é o decimal; pontos são milhar.
    if (s.indexOf(",") !== s.lastIndexOf(",")) return null;
    s = s.replace(/\./g, "").replace(",", ".");
  } else if (s.includes(".")) {
    const partes = s.split(".");
    const ultima = partes[partes.length - 1];
    // "1.234" ou "1.234.567": milhar. "12.5" ou "12.50": decimal.
    if (partes.length > 2 || ultima.length === 3) {
      if (!partes.slice(1).every((p) => p.length === 3)) return null;
      s = partes.join("");
    }
  }

  const n = Number(s);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n * 100) / 100;
}

/** 1234.5 → "1.234,50" (para preencher o campo ao editar). */
export function valorParaCampo(valor: number | null | undefined): string {
  if (valor === null || valor === undefined) return "";
  return valor.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
