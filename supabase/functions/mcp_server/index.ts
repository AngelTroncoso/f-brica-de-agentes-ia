/**
 * Sala de Encuentro — Servidor MCP (JSON-RPC 2.0 sobre HTTP).
 *
 * Expone 4 tools para que agentes externos de cualquier plataforma
 * colaboren en la Sala de Encuentro sin pasar por el LLM interno:
 *   - create_session(reto)
 *   - get_board_state(session_id)
 *   - post_agent_turn(session_id, rol, contenido)
 *   - get_final_solution(session_id)
 *
 * Formato JSON-RPC 2.0 documentado en MCP.md (raíz del repo).
 */
import { createClient } from "@supabase/supabase-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const MAX_RONDAS = 5;
const ROLES = ["diagnostico", "estrategia", "critico"] as const;
type Rol = (typeof ROLES)[number];
function jsonRpcError(id: unknown, message: string, code = -1) {
  return { jsonrpc: "2.0", id: id ?? null, error: { code, message } };
}

function jsonRpcOk(id: unknown, result: unknown) {
  return { jsonrpc: "2.0", id: id ?? null, result };
}

function checkRol(rol: string): rol is Rol {
  return (ROLES as readonly string[]).includes(rol);
}

// ── Tools ──────────────────────────────────────────────────────────────────
async function createSession(supabase: ReturnType<typeof createClient>, reto: unknown) {
  const trimmed = String(reto ?? "").trim();
  if (trimmed.length < 15) {
    throw new Error("El reto debe tener al menos 15 caracteres.");
  }
  const { data, error } = await supabase
    .from("collab_sessions")
    .insert({ reto: trimmed })
    .select()
    .single();
  if (error || !data) throw error ?? new Error("No se pudo crear la sesión");
  return data;
}

async function getBoardState(supabase: ReturnType<typeof createClient>, session_id: string) {
  if (!session_id) throw new Error("session_id es requerido");
  const [sessionRes, turnsRes] = await Promise.all([
    supabase.from("collab_sessions").select("*").eq("id", session_id).single(),
    supabase
      .from("collab_turns")
      .select("*")
      .eq("session_id", session_id)
      .order("ronda", { ascending: true }),
  ]);
  if (sessionRes.error) throw sessionRes.error;
  if (turnsRes.error) throw turnsRes.error;
  return { session: sessionRes.data, turnos: turnsRes.data };
}
async function postAgentTurn(
  supabase: ReturnType<typeof createClient>,
  session_id: string,
  rol: string,
  contenido: string,
) {
  if (!session_id) throw new Error("session_id es requerido");
  if (!checkRol(rol)) {
    throw new Error("rol debe ser diagnostico, estrategia o critico");
  }
  const contenidoStr = String(contenido ?? "").trim();
  if (!contenidoStr) throw new Error("contenido es requerido");

  const { data: turnoData, error: turnoErr } = await supabase
    .from("collab_turns")
    .insert({ session_id, rol, contenido: contenidoStr })
    .select()
    .single();
  if (turnoErr || !turnoData) throw turnoErr ?? new Error("No se pudo guardar el turno");

  const { data: sessionData, error: sessionErr } = await supabase
    .from("collab_sessions")
    .select("ronda_actual, estado")
    .eq("id", session_id)
    .single();
  if (sessionErr || !sessionData) throw sessionErr ?? new Error("No se encontró la sesión");

  const ronda = sessionData.ronda_actual ?? 1;
  const esCritico = rol === "critico";
  const aprobado = esCritico && /^APROBADO\b/i.test(contenidoStr);

  if (aprobado) {
    await supabase.from("collab_sessions").update({ estado: "convergida" }).eq("id", session_id);
  } else if (ronda >= MAX_RONDAS) {
    await supabase.from("collab_sessions").update({ estado: "fallida" }).eq("id", session_id);
  } else {
    await supabase
      .from("collab_sessions")
      .update({ ronda_actual: ronda + 1 })
      .eq("id", session_id);
  }

  return { turn_id: turnoData.id };
}

async function getFinalSolution(supabase: ReturnType<typeof createClient>, session_id: string) {
  if (!session_id) throw new Error("session_id es requerido");
  const { data: sessionData, error: sessionErr } = await supabase
    .from("collab_sessions")
    .select("estado")
    .eq("id", session_id)
    .single();
  if (sessionErr) throw sessionErr;

  if (sessionData?.estado !== "convergida") {
    return { solucion: null, estado: sessionData?.estado ?? "desconocida" };
  }

  const { data: turnos } = await supabase
    .from("collab_turns")
    .select("contenido")
    .eq("session_id", session_id)
    .eq("rol", "critico")
    .order("ronda", { ascending: false })
    .limit(1);

  const contenido = turnos?.[0]?.contenido ?? "";
  const solucion = contenido.replace(/^APROBADO\s*/i, "").trim();
  return { solucion, estado: "convergida" };
}
// ── Router ──────────────────────────────────────────────────────────────────
async function dispatch(
  supabase: ReturnType<typeof createClient>,
  method: string,
  params: Record<string, unknown>,
): Promise<unknown> {
  switch (method) {
    case "create_session":
      return createSession(supabase, params.reto);
    case "get_board_state":
      return getBoardState(supabase, String(params.session_id ?? ""));
    case "post_agent_turn":
      return postAgentTurn(
        supabase,
        String(params.session_id ?? ""),
        String(params.rol ?? ""),
        String(params.contenido ?? ""),
      );
    case "get_final_solution":
      return getFinalSolution(supabase, String(params.session_id ?? ""));
    default:
      throw new Error(`Método no soportado: ${method}`);
  }
}

// ── HTTP handler ───────────────────────────────────────────────────────────
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return new Response(JSON.stringify(jsonRpcError(null, "Se espera POST")), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let body: { jsonrpc?: string; id?: unknown; method?: string; params?: Record<string, unknown> };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify(jsonRpcError(null, "Body inválido")), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { id, method, params } = body;
  if (body.jsonrpc !== "2.0" || typeof method !== "string") {
    return new Response(JSON.stringify(jsonRpcError(id, "Formato JSON-RPC 2.0 inválido")), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const supabaseKey =
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  if (!supabaseUrl || !supabaseKey) {
    return new Response(JSON.stringify(jsonRpcError(id, "Variables de Supabase no configuradas")), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const result = await dispatch(supabase, method, params ?? {});
    return new Response(JSON.stringify(jsonRpcOk(id, result)), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Error interno";
    console.error("mcp_server:", error);
    return new Response(JSON.stringify(jsonRpcError(id, msg)), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
