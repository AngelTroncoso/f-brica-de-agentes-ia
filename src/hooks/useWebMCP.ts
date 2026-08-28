import { useEffect } from "react";

import { supabase } from "@/integrations/supabase/client";
import { MAX_RONDAS, type CollabSession, type CollabTurno } from "@/lib/collab.tipos";

/**
 * Tipo que cumple con la especificacion WebMCP para ModelContextTool
 */
type ModelContextTool = {
  name: string;
  description: string;
  inputSchema: {
    type: "object";
    properties: Record<string, {
      type: string;
      description: string;
      enum?: string[];
    }>;
    required?: string[];
  };
  execute: (args: Record<string, unknown>) => Promise<unknown>;
};

/**
 * Hook que registra las 4 tools de la Sala de Encuentro en
 * `document.modelContext` (API WebMCP).
 */
export function useWebMCP() {
  useEffect(() => {
    // Intentar document.modelContext primero (nueva API)
    const docMC = (document as unknown as { modelContext?: {
      registerTool?: (tool: ModelContextTool) => void;
      unregisterTool?: (name: string) => void;
    } }).modelContext;

    // Fallback a navigator.modelContext (legacy)
    const nav = navigator as unknown as {
      modelContext?: {
        registerTool?: (tool: ModelContextTool) => void;
        unregisterTool?: (name: string) => void;
      };
    };

    const mc = docMC ?? nav.modelContext;
    if (!mc?.registerTool) return;

    const tools: ModelContextTool[] = [
      {
        name: "create_session",
        description: "Crea una nueva sesión de colaboración en la Sala de Encuentro",
        inputSchema: {
          type: "object",
          properties: {
            reto: { type: "string", description: "El reto o problema a resolver" },
          },
          required: ["reto"],
        },
        execute: async (params: Record<string, unknown>) => {
          const p = params as Record<string, unknown>;
          const reto = String(p["reto"] ?? "");
          if (reto.trim().length < 15) {
            throw new Error("El reto debe tener al menos 15 caracteres.");
          }
          const { data, error } = await supabase
            .from("collab_sessions")
            .insert({ reto: reto.trim() })
            .select()
            .single();
          if (error || !data) throw error ?? new Error("No se pudo crear la sesión");
          return data as unknown as CollabSession;
        },
      },
      {
        name: "get_board_state",
        description: "Obtiene el estado actual y los turnos de una sesión",
        inputSchema: {
          type: "object",
          properties: {
            session_id: { type: "string", description: "ID UUID de la sesión" },
          },
          required: ["session_id"],
        },
        execute: async (params: Record<string, unknown>) => {
          const p = params as Record<string, unknown>;
          const session_id = String(p["session_id"] ?? "");
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
          return {
            session: sessionRes.data as CollabSession | null,
            turnos: turnsRes.data as CollabTurno[],
          };
        },
      },
      {
        name: "post_agent_turn",
        description: "Registra un turno de un agente externo en la sesión",
        inputSchema: {
          type: "object",
          properties: {
            session_id: { type: "string", description: "ID UUID de la sesión" },
            rol: {
              type: "string",
              description: "Rol: diagnostico, estrategia o critico",
              enum: ["diagnostico", "estrategia", "critico"],
            },
            contenido: { type: "string", description: "Texto del turno" },
          },
          required: ["session_id", "rol", "contenido"],
        },
        execute: async (params: Record<string, unknown>) => {
          const p = params as Record<string, unknown>;
          const session_id = String(p["session_id"] ?? "");
          const rol = String(p["rol"] ?? "") as CollabTurno["rol"];
          const contenido = String(p["contenido"] ?? "");

          const { data: turnoData, error: turnoErr } = await supabase
            .from("collab_turns")
            .insert({ session_id, rol, contenido })
            .select()
            .single();
          if (turnoErr || !turnoData) throw turnoErr ?? new Error("No se pudo guardar el turno");

          const { data: sessionData } = await supabase
            .from("collab_sessions")
            .select("ronda_actual, estado")
            .eq("id", session_id)
            .single();

          const ronda = sessionData?.ronda_actual ?? 1;
          const aprobado = rol === "critico" && /^APROBADO\b/i.test(contenido.trim());

          if (aprobado) {
            await supabase
              .from("collab_sessions")
              .update({ estado: "convergida" })
              .eq("id", session_id);
          } else if (ronda >= MAX_RONDAS) {
            await supabase.from("collab_sessions").update({ estado: "fallida" }).eq("id", session_id);
          } else {
            await supabase
              .from("collab_sessions")
              .update({ ronda_actual: ronda + 1 })
              .eq("id", session_id);
          }
          return { turn_id: turnoData.id };
        },
      },
      {
        name: "get_final_solution",
        description: "Devuelve la solución validada si la sesión convergió",
        inputSchema: {
          type: "object",
          properties: {
            session_id: { type: "string", description: "ID UUID de la sesión" },
          },
          required: ["session_id"],
        },
        execute: async (params: Record<string, unknown>) => {
          const p = params as Record<string, unknown>;
          const session_id = String(p["session_id"] ?? "");
          const { data: sessionData } = await supabase
            .from("collab_sessions")
            .select("estado")
            .eq("id", session_id)
            .single();
          if (sessionData?.estado !== "convergida") {
            return {
              solucion: null,
              estado: sessionData?.estado ?? "desconocida",
            };
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
        },
      },
    ];

    tools.forEach((tool) => {
      mc.registerTool!(tool);
    });

    return () => {
      tools.forEach((tool) => mc.unregisterTool?.(tool.name));
    };
  }, []);
}
