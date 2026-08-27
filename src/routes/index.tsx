import { createFileRoute } from "@tanstack/react-router";
import { ArrowRight, Check, Cpu, FileText, ShieldCheck, Workflow } from "lucide-react";

import { ContactoForm } from "@/components/fabrica/ContactoForm";
import { Workbench } from "@/components/fabrica/Workbench";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  component: Index,
});

const FEATURES = [
  {
    icono: FileText,
    titulo: "System prompt productivo",
    detalle: "Listo para pegar en tu agente y partir probando de inmediato.",
  },
  {
    icono: Workflow,
    titulo: "Ficha técnica completa",
    detalle: "Rol, objetivos, herramientas sugeridas y métricas de éxito.",
  },
  {
    icono: ShieldCheck,
    titulo: "Stack recomendado",
    detalle: "FastAPI + Gemini por defecto, ajustable a tu caso de uso.",
  },
];

const PASOS = [
  {
    numero: "01",
    titulo: "Describe tu problema",
    texto: "Elige tu rubro y cuéntanos con tus palabras qué proceso te está quitando tiempo.",
  },
  {
    numero: "02",
    titulo: "La fábrica diseña el agente",
    texto:
      "Definimos rol, límites, herramientas y stack: un micro-agente acotado, no promesas infinitas.",
  },
  {
    numero: "03",
    titulo: "Copias y prototipeas",
    texto: "Te llevas el prompt en texto plano y la ficha descargable en Markdown.",
  },
];

const GARANTIAS = [
  "Diagnóstico breve de tu proceso, sin costo ni compromiso.",
  "Propuesta de agente con alcance acotado y métricas claras.",
  "Acompañamiento técnico durante el prototipo y el despliegue.",
];

function Index() {
  return (
    <div className="min-h-screen">
      <Encabezado />
      <main>
        <Hero />
        <SeccionFabrica />
        <SeccionComo />
        <SeccionContacto />
      </main>
      <Pie />
    </div>
  );
}

function Encabezado() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <a href="#inicio" className="flex items-center gap-2.5">
          <span className="flex size-8 items-center justify-center rounded-lg border border-primary/40 bg-primary/10">
            <Cpu className="size-4 text-primary" />
          </span>
          <span className="font-display text-base font-semibold tracking-tight">
            Fábrica de Agentes
          </span>
        </a>
        <nav
          aria-label="Navegación principal"
          className="hidden items-center gap-7 text-sm text-muted-foreground md:flex"
        >
          <a className="transition-colors hover:text-foreground" href="#fabrica">
            La fábrica
          </a>
          <a className="transition-colors hover:text-foreground" href="#como">
            Cómo funciona
          </a>
          <a className="transition-colors hover:text-foreground" href="#contacto">
            Contacto
          </a>
        </nav>
        <Button asChild size="sm" className="font-medium">
          <a href="#fabrica">
            Crear mi agente
            <ArrowRight className="size-4" />
          </a>
        </Button>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section id="inicio" className="relative overflow-hidden">
      <div aria-hidden className="grid-backdrop pointer-events-none absolute inset-0" />
      <div className="relative mx-auto max-w-6xl px-4 pb-16 pt-16 sm:px-6 sm:pb-20 sm:pt-24">
        <div className="animate-rise max-w-3xl">
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1.5 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
            <span aria-hidden className="size-1.5 rounded-full bg-success" />
            Prototipo funcional · edición hackaton
          </span>
          <h1 className="mt-6 text-4xl font-bold leading-[1.08] sm:text-5xl lg:text-6xl">
            Describe el problema.{" "}
            <span className="text-gradient-brand">Nosotros fabricamos el agente.</span>
          </h1>
          <p className="mt-5 max-w-2xl text-base text-muted-foreground sm:text-lg">
            En tres pasos te llevas un system prompt listo para producción, la ficha técnica
            completa y el stack recomendado para partir el prototipo hoy mismo.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button size="lg" asChild>
              <a href="#fabrica">
                Fabricar mi agente
                <ArrowRight className="size-4" />
              </a>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <a href="#contacto">Quiero asesoría</a>
            </Button>
          </div>
          <dl className="mt-12 grid gap-x-8 gap-y-5 sm:grid-cols-3">
            {FEATURES.map((f) => (
              <div key={f.titulo} className="flex gap-3">
                <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg border border-border bg-surface">
                  <f.icono className="size-4 text-primary" />
                </span>
                <div>
                  <dt className="text-sm font-semibold">{f.titulo}</dt>
                  <dd className="mt-0.5 text-sm text-muted-foreground">{f.detalle}</dd>
                </div>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </section>
  );
}

function SeccionFabrica() {
  return (
    <section id="fabrica" className="scroll-mt-20 border-t border-border/60">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
        <div className="animate-fade mb-10 max-w-2xl">
          <p className="font-mono text-xs uppercase tracking-[0.25em] text-primary">La fábrica</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
            De problema a agente, al tiro
          </h2>
          <p className="mt-3 text-muted-foreground">
            Sin registro ni formularios eternos: responde tres pasos cortos y el resultado es tuyo
            al instante.
          </p>
        </div>
        <Workbench />
      </div>
    </section>
  );
}

function SeccionComo() {
  return (
    <section id="como" className="scroll-mt-20 border-t border-border/60 bg-surface/40">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
        <div className="mb-10 max-w-2xl">
          <p className="font-mono text-xs uppercase tracking-[0.25em] text-primary">
            Cómo funciona
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
            Tres pasos, cero fricción
          </h2>
        </div>
        <ol className="grid gap-5 md:grid-cols-3">
          {PASOS.map((paso) => (
            <li
              key={paso.numero}
              className="panel p-5 transition-transform duration-300 hover:-translate-y-1 sm:p-6"
            >
              <span className="font-mono text-sm text-primary">{paso.numero}</span>
              <h3 className="mt-3 font-display text-lg font-semibold">{paso.titulo}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{paso.texto}</p>
            </li>
          ))}
        </ol>
        <p className="mt-8 max-w-3xl text-sm text-muted-foreground">
          ¿Sin clave de IA configurada? La fábrica opera en{" "}
          <span className="font-medium text-foreground">modo demo</span>: el flujo completo sigue
          funcionando y cada resultado queda claramente marcado.
        </p>
      </div>
    </section>
  );
}

function SeccionContacto() {
  return (
    <section id="contacto" className="scroll-mt-20 border-t border-border/60">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 sm:px-6 sm:py-24 lg:grid-cols-[1fr_1.15fr] lg:gap-16">
        <div className="animate-fade">
          <p className="font-mono text-xs uppercase tracking-[0.25em] text-primary">Contacto</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
            ¿Listo para llevarlo a producción?
          </h2>
          <p className="mt-4 text-muted-foreground">
            Si el agente que fabricaste te convence, el siguiente paso es implementarlo de verdad.
            Cuéntanos tu caso y armamos el plan contigo.
          </p>
          <ul className="mt-6 space-y-3">
            {GARANTIAS.map((g) => (
              <li key={g} className="flex items-start gap-2.5 text-sm text-foreground/90">
                <Check className="mt-0.5 size-4 shrink-0 text-success" />
                {g}
              </li>
            ))}
          </ul>
        </div>
        <ContactoForm />
      </div>
    </section>
  );
}

function Pie() {
  return (
    <footer className="border-t border-border/60 py-8">
      <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p className="flex items-center gap-2">
          <Cpu className="size-3.5 text-primary" />
          Fábrica de Agentes — prototipo construido en un hackaton, desde Chile.
        </p>
        <p>Los agentes generados son punto de partida: revísalos antes de producción.</p>
      </div>
    </footer>
  );
}
