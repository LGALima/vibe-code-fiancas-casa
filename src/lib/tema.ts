/**
 * Tema claro/escuro. A preferência fica no aparelho (localStorage):
 * "sistema" segue o celular/computador; "claro" e "escuro" fixam.
 */
export type PreferenciaTema = "sistema" | "claro" | "escuro";

export const CHAVE_TEMA = "financas:tema";
const EVENTO = "financas:tema";

export function ehPreferencia(v: unknown): v is PreferenciaTema {
  return v === "sistema" || v === "claro" || v === "escuro";
}

/** O tema que vale de fato, dada a preferência e o tema do sistema. */
export function temaEfetivo(pref: PreferenciaTema, sistemaEscuro: boolean): "claro" | "escuro" {
  if (pref === "sistema") return sistemaEscuro ? "escuro" : "claro";
  return pref;
}

/** Próxima opção do botão de tema: sistema → claro → escuro → sistema. */
export function proximaPreferencia(pref: PreferenciaTema): PreferenciaTema {
  return pref === "sistema" ? "claro" : pref === "claro" ? "escuro" : "sistema";
}

/**
 * Script que roda no <head>, antes da página aparecer, para não piscar claro
 * quando o tema é escuro. Precisa ser autossuficiente (vira texto).
 */
export const SCRIPT_TEMA = `(function(){try{var p=localStorage.getItem(${JSON.stringify(CHAVE_TEMA)});if(p!=="claro"&&p!=="escuro")p="sistema";var e=p==="escuro"||(p==="sistema"&&window.matchMedia("(prefers-color-scheme: dark)").matches);var d=document.documentElement;d.classList.toggle("dark",e);d.style.colorScheme=e?"dark":"light";}catch(_){}})();`;

// ---------------------------------------------------------------------------
// Navegador
// ---------------------------------------------------------------------------

function sistemaEscuro() {
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

export function lerPreferencia(): PreferenciaTema {
  try {
    const v = window.localStorage.getItem(CHAVE_TEMA);
    return ehPreferencia(v) ? v : "sistema";
  } catch {
    return "sistema";
  }
}

export function aplicarTema(pref: PreferenciaTema) {
  const escuro = temaEfetivo(pref, sistemaEscuro()) === "escuro";
  const html = document.documentElement;
  html.classList.toggle("dark", escuro);
  html.style.colorScheme = escuro ? "dark" : "light";
}

export function salvarPreferencia(pref: PreferenciaTema) {
  try {
    window.localStorage.setItem(CHAVE_TEMA, pref);
  } catch {
    // Sem armazenamento: vale só nesta visita.
  }
  aplicarTema(pref);
  window.dispatchEvent(new Event(EVENTO));
}

/** Para useSyncExternalStore: avisa quando a preferência ou o tema do sistema mudam. */
export function assinarTema(aoMudar: () => void) {
  const mql = window.matchMedia("(prefers-color-scheme: dark)");
  const aoMudarSistema = () => {
    aplicarTema(lerPreferencia());
    aoMudar();
  };
  mql.addEventListener("change", aoMudarSistema);
  window.addEventListener(EVENTO, aoMudar);
  window.addEventListener("storage", aoMudarSistema);
  return () => {
    mql.removeEventListener("change", aoMudarSistema);
    window.removeEventListener(EVENTO, aoMudar);
    window.removeEventListener("storage", aoMudarSistema);
  };
}
