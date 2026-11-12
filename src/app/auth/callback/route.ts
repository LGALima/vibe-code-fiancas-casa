import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { destinoSeguro } from "@/lib/destino-seguro";
import { createClient } from "@/lib/supabase/server";

/**
 * Retorno do login: link mágico e Google chegam aqui.
 * - ?code=...                 → fluxo PKCE (Google e link mágico padrão)
 * - ?token_hash=...&type=...  → link mágico com template de e-mail customizado
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = destinoSeguro(searchParams.get("next"));

  const supabase = await createClient();

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}${next}`);
  } else if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type,
    });
    if (!error) return NextResponse.redirect(`${origin}${next}`);
  }

  return NextResponse.redirect(`${origin}/login?erro=link-invalido`);
}
