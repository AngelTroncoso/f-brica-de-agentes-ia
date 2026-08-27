import { useState } from "react";
import { Check, Copy, Download, RotateCcw, Sparkles, TriangleAlert } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { AgenteGenerado } from "@/lib/agentes.tipos";
import {
  agenteComoMarkdown,
  copiarAlPortapapeles,
  descargarArchivo,
  fichaComoMarkdown,
  slug,
} from "@/lib/descargas";

type Props = {
  agente: AgenteGenerado;
  onReiniciar: () => void;
};

export function FichaAgente({ agente, onReiniciar }: Props) {
  const [copiado, setCopiado] = useState<string | null>(null);
  const base = slug(agente.ficha.nombre);

  const copiar = async (clave: string, texto: string) => {
    const ok = await copiarAlPortapapeles(texto);
    if (ok) {
      setCopiado(clave);
      toast.success("Copiado al portapapeles");
      setTimeout(() => setCopiado((c) => (c === clave ? null : c)), 2000);
    } else {
      toast.error("No pudimos copiar. Selecciona el texto manualmente.");
    }
  };

  return (
    <section className="animate-rise space-y-6" aria-live="polite">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="border-transparent bg-success/15 text-success">
              <Sparkles className="mr-1 size-3" /> Agente listo
            </Badge>
            <Badge variant="outline" className="font-mono text-[11px] uppercase">
              {agente.modo === "ia" ? "Generado con IA" : "Modo demo"}
            </Badge>
          </div>
          <h3 className="text-2xl font-semibold sm:text-3xl">{agente.ficha.nombre}</h3>
          <p className="max-w-2xl text-sm text-muted-foreground">{agente.ficha.rol}</p>
        </div>
        <Button variant="outline" onClick={onReiniciar} className="shrink-0">
          <RotateCcw className="size-4" /> Crear otro agente
        </Button>
      </header>

      {agente.modo === "demo" && (
        <p className="flex items-start gap-2 rounded-lg border border-primary/30 bg-primary/10 p-3 text-sm text-foreground">
          <TriangleAlert className="mt-0.5 size-4 shrink-0 text-primary" />
          Estamos mostrando una generación de demostración porque el modelo no está
          disponible en este momento. La experiencia completa sigue siendo funcional.
        </p>
      )}

      <Tabs defaultValue="prompt" className="w-full">
        <TabsList className="grid w-full grid-cols-2 sm:w-auto sm:inline-grid">
          <TabsTrigger value="prompt">System prompt</TabsTrigger>
          <TabsTrigger value="ficha">Ficha técnica</TabsTrigger>
        </TabsList>

        <TabsContent value="prompt" className="mt-4 animate-fade">
          <div className="panel overflow-hidden">
            <div className="flex items-center justify-between gap-2 border-b border-border bg-surface-strong/60 px-4 py-2.5">
              <span className="font-mono text-xs text-muted-foreground">
                system_prompt.txt
              </span>
              <div className="flex gap-1.5">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => copiar("prompt", agente.systemPrompt)}
                >
                  {copiado === "prompt" ? (
                    <Check className="size-4 text-success" />
                  ) : (
                    <Copy className="size-4" />
                  )}
                  <span className="hidden sm:inline">Copiar</span>
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() =>
                    descargarArchivo(`${base}-system-prompt.txt`, agente.systemPrompt)
                  }
                >
                  <Download className="size-4" />
                  <span className="hidden sm:inline">Descargar</span>
                </Button>
              </div>
            </div>
            <pre className="max-h-[26rem] overflow-auto whitespace-pre-wrap p-4 font-mono text-[13px] leading-relaxed text-foreground/90">
              {agente.systemPrompt}
            </pre>
          </div>
        </TabsContent>

        <TabsContent value="ficha" className="mt-4 animate-fade">
          <div className="panel space-y-6 p-5 sm:p-6">
            <div className="grid gap-5 sm:grid-cols-2">
              <Bloque titulo="Objetivos" items={agente.ficha.objetivos} />
              <Bloque titulo="Métricas de éxito" items={agente.ficha.metricas} />
            </div>

            <div className="space-y-3">
              <h4 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Herramientas sugeridas
              </h4>
              <ul className="grid gap-2 sm:grid-cols-2">
                {agente.ficha.herramientas.map((h) => (
                  <li
                    key={h.nombre}
                    className="rounded-lg border border-border bg-surface p-3 transition-colors hover:border-primary/50"
                  >
                    <p className="font-mono text-sm text-accent">{h.nombre}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{h.para_que}</p>
                  </li>
                ))}
              </ul>
            </div>

            <div className="space-y-3">
              <h4 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Stack recomendado
              </h4>
              <div className="overflow-x-auto rounded-lg border border-border">
                <table className="w-full text-left text-sm">
                  <thead className="bg-surface-strong/60 text-xs uppercase text-muted-foreground">
                    <tr>
                      <th scope="col" className="px-3 py-2 font-medium">Capa</th>
                      <th scope="col" className="px-3 py-2 font-medium">Elección</th>
                      <th scope="col" className="px-3 py-2 font-medium">Por qué</th>
                    </tr>
                  </thead>
                  <tbody>
                    {agente.ficha.stack.map((s) => (
                      <tr key={s.capa} className="border-t border-border align-top">
                        <td className="px-3 py-2.5 text-muted-foreground">{s.capa}</td>
                        <td className="px-3 py-2.5 font-mono text-accent">{s.eleccion}</td>
                        <td className="px-3 py-2.5 text-foreground/85">{s.motivo}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <Bloque titulo="Riesgos a revisar" items={agente.ficha.riesgos} />

            <div className="flex flex-wrap gap-2 border-t border-border pt-4">
              <Button
                variant="secondary"
                onClick={() => copiar("ficha", fichaComoMarkdown(agente.ficha))}
              >
                {copiado === "ficha" ? (
                  <Check className="size-4 text-success" />
                ) : (
                  <Copy className="size-4" />
                )}
                Copiar ficha
              </Button>
              <Button
                variant="secondary"
                onClick={() =>
                  descargarArchivo(
                    `${base}-ficha.md`,
                    fichaComoMarkdown(agente.ficha),
                    "text/markdown",
                  )
                }
              >
                <Download className="size-4" /> Descargar ficha (.md)
              </Button>
              <Button
                onClick={() =>
                  descargarArchivo(
                    `${base}-completo.md`,
                    agenteComoMarkdown(agente),
                    "text/markdown",
                  )
                }
              >
                <Download className="size-4" /> Descargar todo
              </Button>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      <p className="text-xs text-muted-foreground">
        Este es un prototipo generado automáticamente. Revisa el prompt, las
        herramientas y los datos que expondrás antes de llevarlo a producción.
      </p>
    </section>
  );
}

function Bloque({ titulo, items }: { titulo: string; items: string[] }) {
  return (
    <div className="space-y-2">
      <h4 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        {titulo}
      </h4>
      <ul className="space-y-1.5">
        {items.map((item) => (
          <li key={item} className="flex gap-2 text-sm text-foreground/90">
            <span aria-hidden className="mt-2 size-1.5 shrink-0 rounded-full bg-primary" />
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
