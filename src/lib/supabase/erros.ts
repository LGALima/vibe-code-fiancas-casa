import type { AuthError } from "@supabase/supabase-js";

const MENSAGENS: Record<string, string> = {
  invalid_credentials: "E-mail ou senha incorretos.",
  email_not_confirmed:
    "Confirme seu e-mail antes de entrar. Procure o link na sua caixa de entrada.",
  user_already_exists: "Já existe uma conta com este e-mail. Tente entrar.",
  email_exists: "Já existe uma conta com este e-mail. Tente entrar.",
  weak_password: "Senha fraca. Use pelo menos 8 caracteres, misturando letras e números.",
  same_password: "A nova senha precisa ser diferente da atual.",
  signup_disabled: "Novos cadastros estão desativados.",
  over_email_send_rate_limit:
    "Muitos e-mails enviados em pouco tempo. Aguarde alguns minutos e tente de novo.",
  over_request_rate_limit:
    "Muitas tentativas em pouco tempo. Aguarde alguns minutos e tente de novo.",
  email_address_invalid: "Este endereço de e-mail não é aceito.",
  email_address_not_authorized:
    "O envio de e-mail para este endereço não está liberado no Supabase (configure um SMTP próprio).",
};

/** Traduz um erro de autenticação do Supabase para uma mensagem em pt-BR. */
export function traduzirErroAuth(error: AuthError): string {
  return (
    (error.code && MENSAGENS[error.code]) ||
    "Algo deu errado. Tente de novo em instantes."
  );
}
