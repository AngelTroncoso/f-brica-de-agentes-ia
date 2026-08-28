import { useState, useEffect, useRef } from "react";
import { Copy, Download, Loader2, Send } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { copiarAlPortapapeles, descargarArchivo } from "@/lib/descargas";
import type { CollabSession, CollabTurno, RolTurno } from "@/lib/collab.tipos";
import { MAX_RONDAS } from "@/lib/collab.tipos";
import { cn } from "@/lib/utils";

const RETRANSMISION_RETRASO = 1200;

const ROLES_LABEL: Record<RolTurno, { label: string; color: string }> = {
  diagnostico: {
    label: "Diagnóstico",
    color: "border-blue-500/30 bg-blue-500/10 text-blue-600",
  },
  estrategia: {
    label: "Estrategia",
    color: "border-purple-500/30 bg-purple-500/10 text-purple-600",
  },
  critico: {
    label: "Crítico",
    color: "border-amber-500/30 bg-amber-500/10 text-amber-600",
  },
};

export function SalaEncuentro() {
  const [reto, setReto] = useState("");
  const [session, setSession] = useState<CollabSession | null>(null);
  const [turnos, setTurnos] = useState<CollabTurno[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const canalRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // ── Cleanup Realtime on unmount
  useEffect(() => {
    return () => {
      if (canalRef.current) {
        supabase.removeChannel(canalRef.current);
        canalRef.current = null;
      }
    };
  }, []);

  // ── Realtime subscription per session
  useEffect(() => {
    if (!session) return;
    setTurnos([]);

    const channel = supabase
      .channel(`collab:sala:${session.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "collab_turns",
          filter: `session_id=eq.${session.id}`,
        },
        (payload) => {
          const nuevoTurno = payload.new as unknown as CollabTurno;
          setTurnos((prev) =>
            prev.some((t) => t.id === nuevoTurno.id) ? prev : [...prev, nuevoTurno],
          );
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "collab_sessions",
          filter: `id=eq.${session.id}`,
        },
        (payload) => {
          setSession(payload.new as unknown as CollabSession);
        },
      )
      .subscribe();

    canalRef.current = channel;
    return () => {
      supabase.removeChannel(channel);
      canalRef.current = null;
    };
  }, [session]);

  // ── Crear sesión y lanzar el loop
  const iniciarSala = async () => {
    const retoTrimmed = reto.trim();
    if (retoTrimmed.length < 15) {
      toast.error("Describe el reto con al menos 15 caracteres.");
      return;
    }

    try {
      const { data: newSession, error: errInsert } = await supabase
        .from("collab_sessions")
        .insert({ reto: retoTrimmed })
        .select()
        .single();

      if (errInsert || !newSession) {
        throw errInsert ?? new Error("No se pudo crear la sala");
      }

      setSession(newSession as unknown as CollabSession);
      await ejecutarLoop((newSession as { id: string }).id);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error(`No se pudo crear la sala: ${msg}`);
    }
  };

  // ── Loop: un turno por invocación a la Edge Function
  const ejecutarLoop = async (sessionId: string) => {
    setIsRunning(true);
    try {
      for (let intento = 0; intento < MAX_RONDAS; intento++) {
        const { data, error: fnError } = await supabase.functions.invoke("collab_orchestrate", {
          body: { session_id: sessionId },
        });

        if (fnError) {
          throw new Error(fnError.message ?? "Error en la orquestación");
        }

        const result = data as unknown as {
          finished?: boolean;
          session?: CollabSession;
        };

        if (result.session) setSession(result.session);
        if (result.finished) break;

        // Brief delay while Realtime picks up the turn
        await new Promise((r) => setTimeout(r, RETRANSMISION_RETRASO));
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error(`Error en la orquestación: ${msg}`);
    } finally {
      setIsRunning(false);
    }
  };

  const reiniciar = () => {
    setSession(null);
    setTurnos([]);
    setReto("");
  };

  // ── Computed: solution from last approved Crítico turn
  const aprobadoTurno = turnos
    .filter((t) => t.rol === "critico")
    .findLast((t) => /^APROBADO\b/i.test(t.contenido.trim()));

  const solucionTexto = aprobadoTurno
    ? aprobadoTurno.contenido.replace(/^APROBADO\s*/i, "").trim()
    : (turnos[turnos.length - 1]?.contenido ?? "");

  const estado = session?.estado ?? "activa";
  const esConvergida = estado === "convergida";
  const esFallida = estado === "fallida";

  // ── Render
  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
        <div className="mb-8">
          <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
            Sala de Encuentro
          </h1>
          <p className="mt-2 text-muted-foreground">
            Tres agentes de IA colaboran en rondas visibles — Diagnóstico, Estrategia y Crítico —
            hasta validar o descartar una solución al reto que plantees.
          </p>
        </div>

        {/* Input — only before session is created */}
        {!session && (
          <div className="panel p-8 animate-rise">
            <h2 className="text-xl font-semibold mb-2">¿Sobre qué reto quieres colaborar?</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Describe el problema con detalle para que los agentes trabajen en conjunto.
            </p>
            <Textarea
              placeholder="Ej: Nuestro chatbot responde mal preguntas frecuentes y deriva mal casos complejos..."
              value={reto}
              onChange={(e) => setReto(e.target.value)}
              rows={4}
              maxLength={2000}
              className="w-full"
            />
            <Button
              className="mt-4"
              onClick={iniciarSala}
              disabled={reto.trim().length < 15 || isRunning}
            >
              <Send className="size-4 mr-2" />
              Iniciar sala
            </Button>
          </div>
        )}

        {/* Timeline — visible once session exists */}
        {session && (
          <div className="panel p-8">
            <div className="mb-6">
              <Badge
                className={cn(
                  "font-mono text-xs uppercase",
                  estado === "activa"
                    ? "border-primary/30 bg-primary/10 text-primary"
                    : esConvergida
                      ? "border-success/30 bg-success/10 text-success"
                      : "border-destructive/30 bg-destructive/10 text-destructive",
                )}
              >
                {estado === "activa"
                  ? `En vivo · ${turnos.length > 0 ? `${turnos.length} turno(s)` : "iniciando…"}`
                  : esConvergida
                    ? "Convergido"
                    : "Sin convergencia"}
              </Badge>
              <p className="mt-2 text-sm text-muted-foreground">{session.reto}</p>
            </div>

            {turnos.length === 0 && estado === "activa" && (
              <div className="text-center py-10 text-muted-foreground">
                <Loader2 className="size-6 animate-spin text-primary mx-auto mb-3" />
                <p className="font-medium">Los agentes están trabajando…</p>
                <p className="text-xs mt-1">Cada turno aparecerá aquí en vivo.</p>
              </div>
            )}

            <div className="space-y-4">
              {turnos.map((t) => (
                <TurnoCard key={t.id} turno={t} />
              ))}
            </div>

            {estado === "activa" && !isRunning && turnos.length > 0 && (
              <div className="mt-6 text-center">
                <Button variant="ghost" onClick={reiniciar}>
                  Reiniciar sala
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Final — convergida */}
        {esConvergida && <FinalConvergida solucionTexto={solucionTexto} onReiniciar={reiniciar} />}

        {/* Final — fallida */}
        {esFallida && <FinalFallida onReiniciar={reiniciar} />}
      </div>
    </div>
  );
}

// ── Turn card ──────────────────────────────────────────────────────────────
function TurnoCard({ turno }: { turno: CollabTurno }) {
  const config = ROLES_LABEL[turno.rol];
  if (!config) return null;

  return (
    <div className="border border-border/50 rounded-lg p-4 bg-surface/30 animate-rise">
      <div className="flex items-start gap-3">
        <Badge variant="outline" className={cn("font-mono text-xs uppercase", config.color)}>
          {config.label}
        </Badge>
        <span className="text-xs text-muted-foreground">Ronda {turno.ronda}</span>
      </div>
      <p className="mt-2 text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap">
        {turno.contenido}
      </p>
    </div>
  );
}

// ── Final — convergida ────────────────────────────────────────────────────
function FinalConvergida({
  solucionTexto,
  onReiniciar,
}: {
  solucionTexto: string;
  onReiniciar: () => void;
}) {
  const [copiado, setCopiado] = useState(false);

  const copiar = async () => {
    const ok = await copiarAlPortapapeles(solucionTexto);
    if (ok) {
      setCopiado(true);
      toast.success("Copiado al portapapeles");
      setTimeout(() => setCopiado(false), 2000);
    } else {
      toast.error("No se pudo copiar. Selecciona el texto manualmente.");
    }
  };

  return (
    <div className="panel p-8 animate-rise">
      <div className="mb-6">
        <Badge className="border-success/30 bg-success/10 text-success font-mono text-xs uppercase">
          Convergido
        </Badge>
        <h2 className="mt-3 text-2xl font-semibold">Solución validada</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Los tres roles coincidieron en una solución viable.
        </p>
      </div>

      <div className="prose prose-sm max-w-none">
        <p className="text-foreground/90 leading-relaxed whitespace-pre-wrap">{solucionTexto}</p>
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        <Button onClick={copiar} variant={copiado ? "secondary" : "default"}>
          <Copy className="size-4 mr-2" />
          {copiado ? "Copiado" : "Copiar solución"}
        </Button>
        <Button
          variant="secondary"
          onClick={() =>
            descargarArchivo("solucion-sala-encuentro.md", solucionTexto, "text/markdown")
          }
        >
          <Download className="size-4 mr-2" />
          Descargar (.md)
        </Button>
        <Button variant="ghost" onClick={onReiniciar}>
          Nueva sala
        </Button>
      </div>
    </div>
  );
}

// ── Final — fallida ────────────────────────────────────────────────────────
function FinalFallida({ onReiniciar }: { onReiniciar: () => void }) {
  return (
    <div className="panel p-8 animate-rise">
      <div className="mb-6">
        <Badge className="border-destructive/30 bg-destructive/10 text-destructive font-mono text-xs uppercase">
          Sin convergencia
        </Badge>
        <h2 className="mt-3 text-2xl font-semibold">La sala no convergió</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Se alcanzaron las 5 rondas sin aprobación del rol crítico. El feedback indica que la
          propuesta necesitaba revisiones que no pudieron resolverse en las rondas disponibles.
        </p>
      </div>
      <Button onClick={onReiniciar}>Reformular el reto</Button>
    </div>
  );
}
