import { useEffect } from "react";

import { supabase } from "@/integrations/supabase/client";
import { MAX_RONDAS, type CollabSession, type CollabTurno } from "@/lib/collab.tipos";

type RegistroMCP = {
  description?: string;
  parameters?: Record<string, { type: string; description: string; enum?: string[] }>;
};

/**
 * Hook que registra las 4 tools de la Sala de Encuentro en
 * `navigator.modelContext` (API WebMCP experimental).
 */
export function useWebMCP() {
  useEffect(() => {
    const nav = navigator as unknown as {
      modelContext?: {
        registerTool?: (
          name: string,
          schema: RegistroMCP,
          handler: (params: Record<string, unknown>) => Promise<unknown>,
        ) => void;
        unregisterTool?: (name: string) => void;
      };
    };

    const mc = nav.modelContext;
    if (!mc?.registerTool) return;

    const tools: Record<string, (params: Record<string, unknown>) => Promise<unknown>> = {
      create_session: async (params) => {
        const reto = String(params.reto ?? "");
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

      get_board_state: async (params) => {
        const session_id = String(params.session_id ?? "");
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

      post_agent_turn: async (params) => {
        const session_id = String(params.session_id ?? "");
        const rol = String(params.rol ?? "") as CollabTurno["rol"];
        const contenido = String(params.contenido ?? "");

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

      get_final_solution: async (params) => {
        const session_id = String(params.session_id ?? "");
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
    };

    const definitions: Record<string, RegistroMCP> = {
      create_session: {
        description: "Crea una nueva sesión de colaboración en la Sala de Encuentro",
        parameters: {
          reto: { type: "string", description: "El reto o problema a resolver" },
        },
      },
      get_board_state: {
        description: "Obtiene el estado actual y los turnos de una sesión",
        parameters: {
          session_id: { type: "string", description: "ID UUID de la sesión" },
        },
      },
      post_agent_turn: {
        description: "Registra un turno de un agente externo en la sesión",
        parameters: {
          session_id: { type: "string", description: "ID UUID de la sesión" },
          rol: {
            type: "string",
            description: "Rol: diagnostico, estrategia o critico",
            enum: ["diagnostico", "estrategia", "critico"],
          },
          contenido: { type: "string", description: "Texto del turno" },
        },
      },
      get_final_solution: {
        description: "Devuelve la solución validada si la sesión convergió",
        parameters: {
          session_id: { type: "string", description: "ID UUID de la sesión" },
        },
      },
    };

    Object.entries(tools).forEach(([name, handler]) => {
      mc.registerTool!(name, definitions[name] ?? {}, handler);
    });

    return () => {
      Object.keys(tools).forEach((name) => mc.unregisterTool?.(name));
    };
  }, []);
}
