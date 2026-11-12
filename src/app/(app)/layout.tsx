import { LogOut } from "lucide-react";
import { BarraInferior } from "@/components/barra-inferior";
import { Button } from "@/components/ui/button";
import { sair } from "./actions";

export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-30 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="mx-auto flex h-14 max-w-md items-center justify-between px-4">
          <span className="font-semibold tracking-tight">Finanças da Casa</span>
          <form action={sair}>
            <Button type="submit" variant="ghost" size="sm">
              <LogOut aria-hidden />
              Sair
            </Button>
          </form>
        </div>
      </header>

      <main className="mx-auto w-full max-w-md flex-1 px-4 pt-4 pb-[calc(5rem+env(safe-area-inset-bottom))]">
        {children}
      </main>

      <BarraInferior />
    </div>
  );
}
