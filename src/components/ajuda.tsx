"use client";

import { useState, type ComponentType, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  ChevronDown,
  CircleHelp,
  CalendarRange,
  PlusCircle,
  Settings2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

type Topico = "ciclo" | "lancamento" | "analises" | "cadastros";

/** Abre já no assunto da tela em que a pessoa está. */
export function topicoDaRota(rota: string): Topico {
  if (rota.startsWith("/lancar")) return "lancamento";
  if (rota.startsWith("/analises")) return "analises";
  if (rota.startsWith("/cadastros")) return "cadastros";
  return "ciclo";
}

/**
 * Botão "?" que abre a explicação dos conceitos do app.
 * Com `comRotulo` (barra lateral), mostra "Ajuda" ao lado do ícone.
 */
export function BotaoAjuda({ comRotulo = false, className }: { comRotulo?: boolean; className?: string }) {
  const rota = usePathname();
  const [aberto, setAberto] = useState(false);

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size={comRotulo ? "sm" : "icon"}
        className={cn(comRotulo ? "justify-start" : "size-9", className)}
        onClick={() => setAberto(true)}
        aria-label={comRotulo ? undefined : "Ajuda: como o app funciona"}
        title="Como o app funciona"
      >
        <CircleHelp aria-hidden />
        {comRotulo && <span>Ajuda</span>}
      </Button>
      <Dialog open={aberto} onOpenChange={setAberto}>
        <DialogContent className="max-h-[85dvh] overflow-y-auto sm:max-w-lg">
          <DialogHeader className="pr-8">
            <DialogTitle>Como o app funciona</DialogTitle>
            <DialogDescription>
              Toque num assunto para ver a explicação.
            </DialogDescription>
          </DialogHeader>
          {/* A chave remonta a lista a cada abertura: o assunto da tela atual vem aberto. */}
          {aberto && <Topicos key={rota} inicial={topicoDaRota(rota)} />}
        </DialogContent>
      </Dialog>
    </>
  );
}

function Topicos({ inicial }: { inicial: Topico }) {
  return (
    <div className="flex flex-col gap-2">
      <Secao id="ciclo" inicial={inicial} Icone={CalendarRange} titulo="Ciclo">
        <p>
          O ciclo é o <strong>fechamento de mês</strong> da casa: o período que você
          considera para saber se o dinheiro sobrou ou faltou. Ele não precisa seguir o
          calendário. Começa no dia que fizer sentido para vocês e vai até a véspera do
          próximo. Exemplo: com início no dia 3, o ciclo vai de 03/11 a 02/12.
        </p>
        <ul>
          <li>
            O <strong>Início</strong> mostra o ciclo escolhido no topo: ganhos, gastos e o
            saldo líquido, cada um em <em>previsto</em> e <em>realizado</em>.
          </li>
          <li>
            <strong>Pode gastar por dia</strong>: quanto sobra do saldo dividido pelos dias
            que faltam para o ciclo acabar.
          </li>
          <li>
            Em <strong>Ciclos</strong> você vê todos, ajusta nome e datas e usa{" "}
            <strong>Criar próximo ciclo</strong>: os lançamentos recorrentes e as próximas
            parcelas são copiados como previstos. Dá para usar o último valor real como
            nova estimativa.
          </li>
          <li>
            O dia de início padrão fica em Cadastros → Configurações.
          </li>
        </ul>
      </Secao>

      <Secao id="lancamento" inicial={inicial} Icone={PlusCircle} titulo="Lançamento">
        <p>
          Lançamento é cada <strong>gasto</strong> ou <strong>ganho</strong>. Ele pode ter
          uma <strong>estimativa</strong> (quanto você espera) e um{" "}
          <strong>valor real</strong> (quanto foi de verdade). Precisa ter ao menos um dos
          dois. Pelos valores preenchidos, o app mostra o status:
        </p>
        <ul>
          <li>
            <strong>Previsto</strong>: só a estimativa. Ainda vai acontecer.
          </li>
          <li>
            <strong>Realizado</strong>: estimativa e valor real. Aconteceu como planejado
            (ou quase).
          </li>
          <li>
            <strong>Não planejado</strong>: só o valor real. Aconteceu sem estar previsto.
          </li>
        </ul>
        <p>
          Previstos com data de hoje ou anterior e sem valor real ficam em destaque como{" "}
          <strong>não confirmados</strong>. Toque em <strong>Confirmar</strong> para
          informar quanto foi.
        </p>
        <ul>
          <li>
            <strong>Parcelado</strong>: informe a parcela atual e o total. Cada parcela cai
            num ciclo.
          </li>
          <li>
            <strong>Recorrente</strong>: algo que se repete todo ciclo, como aluguel ou
            salário. Vira previsto no próximo ciclo.
          </li>
          <li>
            Na lista do Início, use a busca e os <strong>Filtros</strong>. Com algum filtro
            ligado, o total filtrado aparece acima da lista.
          </li>
        </ul>
      </Secao>

      <Secao id="analises" inicial={inicial} Icone={BarChart3} titulo="Análises (gráficos)">
        <p>
          Mostra o ciclo em gráficos. No topo, escolha o <strong>ciclo</strong>, a{" "}
          <strong>pessoa</strong> (os dois ou só um) e a <strong>visão</strong>:{" "}
          <em>Previsto</em> (o planejado) ou <em>Realizado</em> (o que já aconteceu).
        </p>
        <ul>
          <li>
            <strong>Gastos e ganhos por categoria</strong>: a barra mais apagada é o
            previsto e a mais forte, o realizado. Toque numa barra para ver os lançamentos dela.
          </li>
          <li>
            <strong>Gastos e ganhos por dia</strong>: quanto saiu ou entrou em cada dia do
            ciclo. Nos gastos, uma linha mostra o total acumulado e a linha tracejada é o
            previsto do ciclo: se a linha passar dela, os gastos estouraram o planejado.
          </li>
          <li>
            <strong>Por forma de pagamento</strong>: a fatia de cada forma (Pix, crédito,
            débito…) no total.
          </li>
          <li>
            <strong>Evolução entre ciclos</strong>: ganhos, gastos e saldo dos últimos
            ciclos, para comparar um com o outro.
          </li>
          <li>
            Em cada gráfico, <strong>Ver em tabela</strong> mostra os números exatos.
          </li>
        </ul>
      </Secao>

      <Secao id="cadastros" inicial={inicial} Icone={Settings2} titulo="Cadastros">
        <p>
          Aqui ficam as listas usadas nos lançamentos. Tudo vale para todos os membros do
          espaço.
        </p>
        <ul>
          <li>
            <strong>Categorias</strong>: para que é o dinheiro (Mercado, Salário, Lazer…).
            Cada uma tem nome, cor e ícone, que aparecem na lista e nos gráficos, e serve
            para gastos, ganhos ou ambos. Uma categoria em uso pode ser{" "}
            <strong>desativada</strong>: some das opções, mas o histórico continua.
          </li>
          <li>
            <strong>Formas de pagamento</strong>: como o dinheiro entrou ou saiu (Pix,
            dinheiro, cartão…). Marque <strong>É crédito</strong> nos cartões de crédito para ver o
            peso do cartão nos gráficos.
            Também podem ser desativadas.
          </li>
          <li>
            <strong>Configurações</strong>: o <strong>dia de início do ciclo</strong> (o dia
            em que vocês consideram que o mês recomeça, de 1 a 28). Mudar o dia não altera
            os ciclos já criados.
          </li>
          <li>
            <strong>Espaço</strong>: o código de convite para chamar outra pessoa e a lista
            de membros. Use o seletor no topo para trocar de espaço ou criar outro.
          </li>
        </ul>
      </Secao>
    </div>
  );
}

function Secao({
  id,
  inicial,
  Icone,
  titulo,
  children,
}: {
  id: Topico;
  inicial: Topico;
  Icone: ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  titulo: string;
  children: ReactNode;
}) {
  return (
    <details open={id === inicial} className="group rounded-lg border">
      <summary className="flex cursor-pointer list-none items-center gap-2 rounded-lg px-3 py-2.5 font-medium outline-none select-none hover:bg-muted/60 focus-visible:ring-3 focus-visible:ring-ring/50 [&::-webkit-details-marker]:hidden">
        <Icone className="size-4 text-muted-foreground" aria-hidden />
        <span className="flex-1">{titulo}</span>
        <ChevronDown
          className="size-4 text-muted-foreground transition-transform group-open:rotate-180"
          aria-hidden
        />
      </summary>
      <div className="flex flex-col gap-2 border-t px-3 pt-2 pb-3 leading-relaxed text-muted-foreground [&_li]:ml-4 [&_li]:list-disc [&_strong]:font-medium [&_strong]:text-foreground [&_ul]:flex [&_ul]:flex-col [&_ul]:gap-1">
        {children}
      </div>
    </details>
  );
}
