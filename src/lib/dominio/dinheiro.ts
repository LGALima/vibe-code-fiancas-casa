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

/** Até R$ 9.999.999.999,99: o limite de numeric(12,2) no banco. */
const MAX_DIGITOS = 12;

/**
 * Máscara de valor que preenche da direita, como em app de banco: os dois
 * últimos dígitos são os centavos. "7890" → "78,90", "7" → "0,07",
 * "123456" → "1.234,56". Ignora o que não for dígito; vazio continua vazio.
 */
export function mascararCentavos(texto: string): string {
  const digitos = texto.replace(/\D/g, "").replace(/^0+(?=\d)/, "").slice(0, MAX_DIGITOS);
  if (digitos === "") return "";
  const centavos = digitos.padStart(3, "0");
  const inteiro = centavos.slice(0, -2).replace(/^0+(?=\d)/, "");
  const milhar = inteiro.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${milhar},${centavos.slice(-2)}`;
}

/**
 * Texto colado no campo ("R$ 1.234,5", "12.50", "120"): lê como valor e já
 * devolve mascarado. Se não der para ler, cai na máscara dígito a dígito.
 */
export function mascararColado(texto: string): string {
  const valor = lerValor(texto);
  return valor === null ? mascararCentavos(texto) : valorParaCampo(valor);
}
