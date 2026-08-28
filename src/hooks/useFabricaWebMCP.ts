import { useEffect } from "react";
import { useServerFn } from "@tanstack/react-start";

import { generarAgente } from "@/lib/agentes.functions";
import type { GenerarAgenteInput } from "@/lib/agentes.tipos";

type RegistroMCP = {
  description?: string;
  parameters?: Record<string, { type: string; description: string; enum?: string[] }>;
};

/**
 * Hook que registra herramientas WebMCP para la Fabrica de Agentes
 * en `document.modelContext` (con fallback a navigator.modelContext).
 */
export function useFabricaWebMCP() {
  const generar = useServerFn(generarAgente);

  useEffect(() => {
    // Intentar document.modelContext primero (como pidio el usuario)
    const docMC = (document as unknown as { modelContext?: any }).modelContext;

    // Fallback a navigator.modelContext (estandar WebMCP)
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

    const mc = docMC ?? nav.modelContext;
    if (!mc?.registerTool) return;

    const tools: Record<
      string,
      (params: Record<string, unknown>) => Promise<unknown>
    > = {
      // Herramienta 1: Generar agente completo
      generar_agente: async (params: unknown) => {
        const parsed = params as GenerarAgenteInput;
        const { data } = await generar({ data: parsed });
        return data;
      },

      // Herramienta 2: Validar datos del formulario
      validar_datos_agente: async (params: Record<string, unknown>) => {
        const problema = String(params.problema ?? "");
        const tipoProblema = String(params.tipoProblema ?? "");
        const dominio = String(params.dominio ?? "");

        const errores: Record<string, string> = {};
        if (problema.trim().length < 15) {
          errores.problema = "El problema debe tener al menos 15 caracteres.";
        }
        if (!tipoProblema) {
          errores.tipoProblema = "El tipo de problema es requerido.";
        }
        if (!dominio) {
          errores.dominio = "El dominio es requerido.";
        }
        if (Object.keys(errores).length > 0) {
          throw new Error(JSON.stringify(errores));
        }
        return { valido: true };
      },

      // Herramienta 3: Obtener dominios disponibles
      listar_dominios: async () => {
        const { DOMINIOS } = await import("@/lib/agentes.tipos");
        return DOMINIOS.map((d) => ({ value: d.value, label: d.label }));
      },

      // Herramienta 4: Obtener tipos de problema disponibles
      listar_tipos_problema: async () => {
        const { PROBLEMAS } = await import("@/lib/agentes.tipos");
        return PROBLEMAS.map((p) => ({
          value: p.value,
          label: p.label,
          hint: p.hint,
        }));
      },
    };

    const definitions: Record<string, RegistroMCP> = {
      generar_agente: {
        description: "Genera un nuevo agente de IA para la Fabrica de Agentes",
        parameters: {
          problema: {
            type: "string",
            description: "Descripcion detallada del problema (minimo 15 caracteres)",
          },
          tipoProblema: {
            type: "string",
            description: "Tipo de problema a resolver",
          },
          dominio: {
            type: "string",
            description: "Dominio del negocio",
          },
          dominioLibre: {
            type: "string",
            description: "Dominio personalizado (opcional, si dominio es 'otro')",
          },
        },
      },
      validar_datos_agente: {
        description:
          "Valida los datos del formulario antes de generar un agente",
        parameters: {
          problema: { type: "string", description: "Descripcion del problema" },
          tipoProblema: { type: "string", description: "Tipo de problema" },
          dominio: { type: "string", description: "Dominio del negocio" },
        },
      },
      listar_dominios: {
        description: "Lista todos los dominios de negocio disponibles",
      },
      listar_tipos_problema: {
        description: "Lista todos los tipos de problema disponibles",
      },
    };

    // Registrar todas las herramientas
    Object.entries(tools).forEach(([name, handler]) => {
      mc.registerTool!(name, definitions[name] ?? {}, handler);
    });

    // Cleanup: desregistrar al desmontar
    return () => {
      Object.keys(tools).forEach((name) => mc.unregisterTool?.(name));
    };
  }, []);
}
