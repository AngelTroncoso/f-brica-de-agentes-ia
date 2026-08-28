/**
 * Sala de Encuentro — Edge Function de orquestación.
 *
 * Ejecuta UN turno por invocación:
 *  1. Lee collab_sessions por session_id
 *  2. Determina el rol según la ronda actual
 *  3. Llama al LLM (GOOGLE_AI_STUDIO_KEY) con system prompt distinto por rol
 *  4. Guarda el turno en collab_turns
 *  5. Marca la sesión como convergida / fallida / avanza de ronda
 *
 * Fallback a "Modo demo" cuando no hay GOOGLE_AI_STUDIO_KEY,
 * replicando el comportamiento de agentes.server.ts.
 */
import { generateText } from "ai";
import { google } from "@ai-sdk/google";
import { createClient } from "@supabase/supabase-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MAX_RONDAS = 5;
const ROLES = ["diagnostico", "estrategia", "critico"] as const;
type Rol = (typeof ROLES)[number];

/**
 * Secuencia fija de roles por ronda:
 *   1 → diagnóstico, 2 → estrategia, 3 → crítico,
 *   4 → estrategia (revisada), 5 → crítico (validación final)
 */
function rolParaRonda(ronda: number): Rol {
  if (ronda === 1) return "diagnostico";
  if (ronda === 2 || ronda === 4) return "estrategia";
  return "critico"; // 3 y 5
}

// ── System prompts por rol ─────────────────────────────────────────────────
const PROMPTS_SISTEMA: Record<Rol, string> = {
  diagnostico: `Eres un consultor de negocios especializado en pymes y equipos técnicos de Chile y Latinoamérica. Identifica el problema REAL detrás del reto planteado. No propongas soluciones todavía.

Reglas:
- Responde SIEMPRE en español neutro con giros chilenos suaves y profesionales.
- Sé conciso pero completo: 4 a 7 líneas.
- No inventes datos que no estén explícitos en el reto.`,

  estrategia: `Eres un arquitecto de agentes de IA que trabaja con pymes y equipos técnicos de Chile y Latinoamérica. Basado en el diagnóstico y turnos previos, propone un enfoque concreto y acotado para un micro-agente: rol, herramientas clave y métricas.

Reglas:
- Responde SIEMPRE en español neutro con giros chilenos suaves y profesionales.
- Entre 6 y 10 líneas.
- Accionable: algo que un equipo técnico construya en 1-2 semanas.
- No hagas promesas de marketing ni funcionalidades infinitas.`,

  critico: `Eres un revisor crítico y meticuloso. Evalúas la propuesta de estrategia comparada con el diagnóstico y el reto original.

Formato:
- Si es sólida y completa: escribe exactamente 'APROBADO' como primera línea, luego justificación breve.
- Si necesita mejora: escribe 'RECHAZADO' como primera línea y da feedback específico.
- Responde SIEMPRE en español neutro con giros chilenos suaves.`,
};

// ── Modo demo (cuando no hay GOOGLE_AI_STUDIO_KEY) ──────────────────────
interface DemoTurno {
  contenido: string;
}

function generateDemo(rol: Rol, reto: string): DemoTurno {
  switch (rol) {
    case "diagnostico":
      return {
        contenido: `El problema real detrás del reto "${reto}" es que no existe un proceso automatizado que resuelva las consultas repetitivas de forma consistente. Falta un micro-agente que atienda la demanda básica y escale a un humano solo cuando sea necesario.`,
      };
    case "estrategia":
      return {
        contenido: `Propuesta: micro-agente de atención usando FastAPI + Gemini. Herramientas: RAG interno, API de negocio (estados de pedidos/casos) y notificaciones a humano para casos complejos. Métrica: 80% de casos sin intervención. Stack: FastAPI + Gemini + PostgreSQL. Prototipo en ~2 semanas.`,
      };
    case "critico":
      return {
        contenido: `APROBADO. La propuesta es viable, acotada y define métricas claras. La arquitectura FastAPI + Gemini es realista y las herramientas cubren los casos principales. Recomiendo ajustar el umbral de escalamiento a 75% para incluir casos límite.`,
      };
  }
}

// ── Prompt de usuario ──────────────────────────────────────────────────────
function promptUsuario(rol: Rol, reto: string, historial: string): string {
  const base = `Reto: "${reto}"`;

  if (rol === "diagnostico") {
    return `${base}\n\nIdentifica cuál es el problema real detrás de este reto.`;
  }

  if (historial) {
    return `${base}\n\nHistorial de turnos previos:\n${historial}\n\nPropón un enfoque de solución basado en el diagnóstico y el feedback recibido.`;
  }

  return `${base}\n\nPropón un enfoque de solución basado en el diagnóstico.`;
}

// ── Lógica de orquestación ─────────────────────────────────────────────────
interface TurnoGuardado {
  id: string;
  session_id: string;
  ronda: number;
  rol: string;
  contenido: string;
  created_at: string;
}

interface SessionRow {
  id: string;
  reto: string;
  estado: string;
  ronda_actual: number;
}

interface OrchestrateResult {
  session: SessionRow;
  turno: TurnoGuardado | null;
  approved: boolean;
  finished: boolean;
  modo: "ia" | "demo";
}

async function ejecutarTurno(
  supabase: ReturnType<typeof createClient>,
  session_id: string,
): Promise<OrchestrateResult> {
  // 1. Leer sesión
  const { data: sesion, error: errSesion } = await supabase
    .from("collab_sessions")
    .select("id, reto, estado, ronda_actual")
    .eq("id", session_id)
    .single();

  if (errSesion || !sesion) {
    throw new Error(`No se encontró la sesión ${session_id}`);
  }

  // 2. Si ya terminó, no ejecutar más turnos
  if (sesion.estado !== "activa") {
    return { session: sesion, turno: null, approved: false, finished: true, modo: "demo" };
  }

  const ronda = sesion.ronda_actual;
  const rol = rolParaRonda(ronda);

  // 3. Obtener historial de turnos previos
  const { data: turnos } = await supabase
    .from("collab_turns")
    .select("ronda, rol, contenido")
    .eq("session_id", session_id)
    .order("ronda", { ascending: true });

  const historial = (turnos ?? [])
    .map(
      (t: { ronda: number; rol: string; contenido: string }) =>
        `[Ronda ${t.ronda} — ${t.rol}] ${t.contenido}`,
    )
    .join("\n\n");

  // 4. Generar contenido
  let contenido: string;
  let modo: "ia" | "demo" = "demo";

  const apiKey = Deno.env.get("GOOGLE_AI_STUDIO_KEY");
  if (!apiKey) {
    contenido = generateDemo(rol, sesion.reto).contenido;
  } else {
    const modelo = Deno.env.get("GOOGLE_AI_MODEL") ?? "gemini-2.5-flash";

    try {
      const googleModel = google(modelo, { apiKey });
      const result = await generateText({
        model: googleModel,
        system: PROMPTS_SISTEMA[rol],
        prompt: promptUsuario(rol, sesion.reto, historial),
      });
      contenido = await result.text;
      modo = "ia";
    } catch (err: unknown) {
      console.error("Fallo IA, usando demo:", err);
      contenido = generateDemo(rol, sesion.reto).contenido;
    }
  }

  // 5. Guardar turno
  const { data: turnoGuardado, error: errInsert } = await supabase
    .from("collab_turns")
    .insert({
      session_id,
      ronda,
      rol,
      contenido,
    })
    .select()
    .single();

  if (errInsert) {
    console.error("Error guardando turno:", errInsert);
    throw new Error("No se pudo guardar el turno");
  }

  // 6. Evaluar resultado del crítico
  const esCritico = rol === "critico";
  const aprobado = esCritico && /^APROBADO\b/i.test(contenido.trim());

  // 7. Actualizar estado de la sesión
  if (aprobado) {
    await supabase.from("collab_sessions").update({ estado: "convergida" }).eq("id", session_id);
    sesion.estado = "convergida";
  } else if (ronda >= MAX_RONDAS) {
    await supabase.from("collab_sessions").update({ estado: "fallida" }).eq("id", session_id);
    sesion.estado = "fallida";
  } else {
    // Avanzar a la siguiente ronda
    await supabase
      .from("collab_sessions")
      .update({ ronda_actual: ronda + 1 })
      .eq("id", session_id);
    sesion.ronda_actual = ronda + 1;
  }

  return {
    session: sesion,
    turno: turnoGuardado,
    approved: aprobado,
    finished: sesion.estado !== "activa",
    modo,
  };
}

// ── HTTP handler ───────────────────────────────────────────────────────────
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { session_id } = await req.json();

    if (!session_id) {
      return new Response(JSON.stringify({ error: "session_id es requerido" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Cliente de Supabase — service role si está disponible, sino anon (RLS público)
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseKey =
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY") ?? "";

    if (!supabaseUrl || !supabaseKey) {
      throw new Error("Variables de entorno de Supabase no configuradas");
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const result = await ejecutarTurno(supabase, session_id);

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Error interno";
    console.error("collab_orchestrate:", error);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
