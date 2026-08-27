import { Check } from "lucide-react";

import { cn } from "@/lib/utils";

type Props = {
  pasos: string[];
  actual: number;
};

export function StepIndicator({ pasos, actual }: Props) {
  return (
    <ol
      className="flex w-full items-center gap-2 sm:gap-3"
      aria-label="Progreso de creación del agente"
    >
      {pasos.map((paso, i) => {
        const completado = i < actual;
        const activo = i === actual;
        return (
          <li key={paso} className="flex flex-1 items-center gap-2 sm:gap-3">
            <div className="flex min-w-0 items-center gap-2">
              <span
                aria-hidden
                className={cn(
                  "flex size-7 shrink-0 items-center justify-center rounded-full border text-xs font-semibold transition-colors duration-300",
                  completado && "border-transparent bg-success text-success-foreground",
                  activo && "border-primary bg-primary text-primary-foreground",
                  !completado && !activo && "border-border bg-surface text-muted-foreground",
                )}
              >
                {completado ? <Check className="size-4" /> : i + 1}
              </span>
              <span
                className={cn(
                  "hidden truncate text-sm font-medium transition-colors sm:block",
                  activo ? "text-foreground" : "text-muted-foreground",
                )}
                aria-current={activo ? "step" : undefined}
              >
                {paso}
              </span>
            </div>
            {i < pasos.length - 1 && (
              <span
                aria-hidden
                className={cn(
                  "h-px flex-1 transition-colors duration-500",
                  completado ? "bg-success/60" : "bg-border",
                )}
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}
