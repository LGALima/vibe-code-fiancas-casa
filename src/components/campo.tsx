import type { ComponentProps } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Props = ComponentProps<typeof Input> & {
  id: string;
  rotulo: string;
  erro?: string;
};

/** Rótulo + campo + mensagem de erro, no padrão dos formulários do app. */
export function Campo({ id, rotulo, erro, className, ...props }: Props) {
  const idErro = `${id}-erro`;
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>{rotulo}</Label>
      <Input
        id={id}
        aria-invalid={erro ? true : undefined}
        aria-describedby={erro ? idErro : undefined}
        className={className ?? "h-10 text-base"}
        {...props}
      />
      {erro && (
        <p id={idErro} className="text-sm text-destructive">
          {erro}
        </p>
      )}
    </div>
  );
}
