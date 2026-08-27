import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, ArrowRight, Cpu, Loader2, TriangleAlert, Wand2 } from "lucide-react";

import { StepIndicator } from "@/components/fabrica/StepIndicator";
import { FichaAgente } from "@/components/fabrica/FichaAgente";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { generarAgente } from "@/lib/agentes.functions";
import { DOMINIOS, PROBLEMAS, generarAgenteInput } from "@/lib/agentes.tipos";
import type { AgenteGenerado } from "@/lib/agentes.tipos";
import { cn } from "@/lib/utils";

const PASOS = ["Dominio", "Problema", "Ficha del agente"];
const MAX_PROBLEMA = 2000;

export function Workbench() {
  const [paso, setPaso] = useState(0);
  const [dominio, setDominio] = useState<string>("");
  const [dominioLibre, setDominioLibre] = useState("");
  const [tipoProblema, setTipoProblema] = useState<string>("");
  const [problema, setProblema] = useState("");
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [agente, setAgente] = useState<AgenteGenerado | null>(null);

  const generar = useServerFn(generarAgente);
  const mutacion = useMutation({
    mutationFn: (data: Parameters<typeof generar>[0]["data"]) => generar({ data }),
    onSuccess: (resultado) => {
      setAgente(resultado);
      setPaso(2);
    },
  });

  const etiquetaDominio =
    DOMINIOS.find((d) => d.value === dominio)?.label ?? "";
  const problemaSel = PROBLEMAS.find((p) => p.value === tipoProblema);

  const validarPaso1 = () => {
    const e: Record<string, string> = {};
    if (!dominio) e["dominio"] = "Selecciona un dominio para continuar.";
    if (dominio === "otro" && dominioLibre.trim().length < 3)
      e["dominioLibre"] = "Describe tu rubro (mínimo 3 caracteres).";
    setErrores(e);
    return Object.keys(e).length === 0;
  };

  const enviar = () => {
    const payload = {
      dominio: dominio === "otro" ? "otro" : etiquetaDominio,
      dominioLibre: dominio === "otro" ? dominioLibre.trim() : undefined,
      tipoProblema: problemaSel?.label ?? "",
      problema: problema.trim(),
    };
    const parsed = generarAgenteInput.safeParse(payload);
    if (!parsed.success) {
      const e: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        e[String(issue.path[0] ?? "problema")] = issue.message;
      }
      if (!tipoProblema) e["tipoProblema"] = "Elige el tipo de problema.";
      setErrores(e);
      return;
    }
    if (!tipoProblema) {
      setErrores({ tipoProblema: "Elige el tipo de problema." });
      return;
    }
    setErrores({});
    mutacion.mutate(parsed.data);
  };

  const reiniciar = () => {
    setAgente(null);
    mutacion.reset();
    setPaso(0);
  };

  return (
    <div className="panel relative overflow-hidden p-5 sm:p-8">
      <div className="mb-7">
        <StepIndicator pasos={PASOS} actual={paso} />
      </div>

      {mutacion.isPending ? (
        <EstadoGenerando />
      ) : paso === 0 ? (
        <div className="animate-rise space-y-6">
          <Encabezado
            titulo="¿En qué rubro trabajas?"
            texto="Esto define el vocabulario, las reglas de negocio y el tono del agente."
          />
          <div
            role="radiogroup"
            aria-label="Dominio del negocio"
            className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
          >
            {DOMINIOS.map((d) => (
              <button
                key={d.value}
                type="button"
                role="radio"
                aria-checked={dominio === d.value}
                onClick={() => setDominio(d.value)}
                className={cn(
                  "group rounded-xl border border-border bg-surface p-4 text-left transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  dominio === d.value &&
                    "border-primary bg-primary/10 shadow-[var(--shadow-glow)]",
                )}
              >
                <span className="block font-display text-base font-semibold">
                  {d.label}
                </span>
                <span className="mt-1 block font-mono text-[11px] uppercase tracking-wide text-muted-foreground">
                  {d.value}
                </span>
              </button>
            ))}
          </div>
          {dominio === "otro" && (
            <div className="animate-fade space-y-2">
              <Label htmlFor="dominio-libre">Cuéntanos tu rubro</Label>
              <Input
                id="dominio-libre"
                value={dominioLibre}
                maxLength={80}
                placeholder="Ej: taller mecánico, clínica dental, agencia de viajes…"
                onChange={(ev) => setDominioLibre(ev.target.value)}
              />
            </div>
          )}
          <ErrorTexto mensaje={errores["dominio"] ?? errores["dominioLibre"]} />
          <div className="flex justify-end">
            <Button
              size="lg"
              onClick={() => {
                if (validarPaso1()) setPaso(1);
              }}
            >
              Continuar <ArrowRight className="size-4" />
            </Button>
          </div>
        </div>
      ) : paso === 1 ? (
        <div className="animate-rise space-y-6">
          <Encabezado
            titulo="¿Qué problema debería resolver?"
            texto="Mientras más concreto, mejor queda el prompt. Nombra procesos, canales y límites."
          />
          <div
            role="radiogroup"
            aria-label="Tipo de problema"
            className="grid gap-3 sm:grid-cols-2"
          >
            {PROBLEMAS.map((p) => (
              <button
                key={p.value}
                type="button"
                role="radio"
                aria-checked={tipoProblema === p.value}
                onClick={() => setTipoProblema(p.value)}
                className={cn(
                  "rounded-xl border border-border bg-surface p-4 text-left transition-all duration-300 hover:-translate-y-0.5 hover:border-accent/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  tipoProblema === p.value &&
                    "border-accent bg-accent/10 shadow-[var(--shadow-glow)]",
                )}
              >
                <span className="block font-display text-base font-semibold">
                  {p.label}
                </span>
                <span className="mt-1 block text-sm text-muted-foreground">{p.hint}</span>
              </button>
            ))}
          </div>

          <div className="space-y-2">
            <Label htmlFor="problema">Describe el caso con tus palabras</Label>
            <Textarea
              id="problema"
              value={problema}
              maxLength={MAX_PROBLEMA}
              rows={5}
              placeholder="Ej: recibimos 60 mensajes diarios por WhatsApp preguntando por estado de pedidos y cambios; queremos responder al tiro y derivar solo los reclamos."
              onChange={(ev) => setProblema(ev.target.value)}
              aria-describedby="problema-ayuda"
            />
            <div
              id="problema-ayuda"
              className="flex justify-between text-xs text-muted-foreground"
            >
              <span>Mínimo 15 caracteres.</span>
              <span className="font-mono">
                {problema.length}/{MAX_PROBLEMA}
              </span>
            </div>
          </div>

          <ErrorTexto
            mensaje={
              errores["tipoProblema"] ?? errores["problema"] ?? errores["dominio"]
            }
          />
          {mutacion.isError && (
            <div className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm">
              <TriangleAlert className="mt-0.5 size-4 shrink-0 text-destructive" />
              <div>
                <p className="font-medium">No pudimos generar el agente.</p>
                <p className="text-muted-foreground">
                  {mensajeError(mutacion.error)}
                </p>
              </div>
            </div>
          )}

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
            <Button variant="ghost" onClick={() => setPaso(0)}>
              <ArrowLeft className="size-4" /> Volver
            </Button>
            <Button size="lg" onClick={enviar}>
              <Wand2 className="size-4" /> Generar mi agente
            </Button>
          </div>
        </div>
      ) : agente ? (
        <FichaAgente agente={agente} onReiniciar={reiniciar} />
      ) : (
        <div className="py-10 text-center text-muted-foreground">
          Aún no hay un agente generado.
        </div>
      )}
    </div>
  );
}

function mensajeError(error: unknown) {
  const msg = error instanceof Error ? error.message : "";
  if (msg.includes("RATE_LIMIT"))
    return "Hay demasiadas solicitudes en este momento. Espera unos segundos y vuelve a intentar.";
  if (msg.includes("SIN_CREDITOS"))
    return "El servicio de IA quedó sin créditos disponibles. Intenta más tarde.";
  return "Revisa tu conexión e inténtalo nuevamente en unos segundos.";
}

function Encabezado({ titulo, texto }: { titulo: string; texto: string }) {
  return (
    <div className="space-y-1.5">
      <h3 className="text-xl font-semibold sm:text-2xl">{titulo}</h3>
      <p className="text-sm text-muted-foreground">{texto}</p>
    </div>
  );
}

function ErrorTexto({ mensaje }: { mensaje?: string }) {
  if (!mensaje) return null;
  return (
    <p role="alert" className="text-sm text-destructive">
      {mensaje}
    </p>
  );
}

function EstadoGenerando() {
  const lineas = [
    "Analizando el contexto del negocio…",
    "Definiendo rol y límites del agente…",
    "Seleccionando herramientas y stack…",
    "Redactando el system prompt…",
  ];
  return (
    <div className="animate-fade space-y-6 py-8" aria-live="polite" aria-busy="true">
      <div className="flex items-center gap-3">
        <span className="relative flex size-11 items-center justify-center rounded-xl border border-primary/40 bg-primary/10">
          <Cpu className="size-5 text-primary" />
        </span>
        <div>
          <p className="font-display text-lg font-semibold">Fabricando tu agente…</p>
          <p className="text-sm text-muted-foreground">Suele tomar entre 5 y 15 segundos.</p>
        </div>
        <Loader2 className="ml-auto size-5 animate-spin text-primary" />
      </div>
      <ul className="space-y-2.5">
        {lineas.map((l, i) => (
          <li
            key={l}
            className="animate-pulse-soft font-mono text-sm text-muted-foreground"
            style={{ animationDelay: `${i * 260}ms` }}
          >
            <span className="text-primary">›</span> {l}
          </li>
        ))}
      </ul>
      <div className="h-1 overflow-hidden rounded-full bg-secondary">
        <div className="h-full w-1/3 animate-sweep rounded-full bg-[image:var(--gradient-brand)]" />
      </div>
    </div>
  );
}
