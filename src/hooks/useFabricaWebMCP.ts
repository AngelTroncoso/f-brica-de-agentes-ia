import { useEffect } from "react";
import { useServerFn } from "@tanstack/react-start";

import { generarAgente } from "@/lib/agentes.functions";
import type { GenerarAgenteInput } from "@/lib/agentes.tipos";

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
 * Hook que registra herramientas WebMCP para la Fabrica de Agentes
 * en `document.modelContext` (con fallback a navigator.modelContext).
 */
export function useFabricaWebMCP() {
  const generar = useServerFn(generarAgente);

  useEffect(() => {
    // Intentar document.modelContext primero (nueva API)
    const docMC = (document as unknown as { modelContext?: {
      registerTool?: (tool: ModelContextTool) => void;
      unregisterTool?: (name: string) => void;
    } }).modelContext;

    // Fallback a navigator.modelContext (estandar WebMCP)
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
        name: "generar_agente",
        description: "Genera un nuevo agente de IA para la Fabrica de Agentes",
        inputSchema: {
          type: "object",
          properties: {
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
          required: ["problema", "tipoProblema", "dominio"],
        },
        execute: async (params: Record<string, unknown>) => {
          const parsed = params as unknown as GenerarAgenteInput;
          const { data } = await generar({ data: parsed });
          return data;
        },
      },
      {
        name: "validar_datos_agente",
        description: "Valida los datos del formulario antes de generar un agente",
        inputSchema: {
          type: "object",
          properties: {
            problema: { type: "string", description: "Descripcion del problema" },
            tipoProblema: { type: "string", description: "Tipo de problema" },
            dominio: { type: "string", description: "Dominio del negocio" },
          },
          required: ["problema", "tipoProblema", "dominio"],
        },
        execute: async (params: Record<string, unknown>) => {
          const p = params as Record<string, unknown>;
          const problema = String(p["problema"] ?? "");
          const tipoProblema = String(p["tipoProblema"] ?? "");
          const dominio = String(p["dominio"] ?? "");

          const errores: Record<string, string> = {};
          if (problema.trim().length < 15) {
            errores["problema"] = "El problema debe tener al menos 15 caracteres.";
          }
          if (!tipoProblema) {
            errores["tipoProblema"] = "El tipo de problema es requerido.";
          }
          if (!dominio) {
            errores["dominio"] = "El dominio es requerido.";
          }
          if (Object.keys(errores).length > 0) {
            throw new Error(JSON.stringify(errores));
          }
          return { valido: true };
        },
      },
      {
        name: "listar_dominios",
        description: "Lista todos los dominios de negocio disponibles",
        inputSchema: {
          type: "object",
          properties: {},
        },
        execute: async () => {
          const { DOMINIOS } = await import("@/lib/agentes.tipos");
          return DOMINIOS.map((d) => ({ value: d.value, label: d.label }));
        },
      },
      {
        name: "listar_tipos_problema",
        description: "Lista todos los tipos de problema disponibles",
        inputSchema: {
          type: "object",
          properties: {},
        },
        execute: async () => {
          const { PROBLEMAS } = await import("@/lib/agentes.tipos");
          return PROBLEMAS.map((p) => ({
            value: p.value,
            label: p.label,
            hint: p.hint,
          }));
        },
      },
    ];

    // Registrar todas las herramientas
    tools.forEach((tool) => {
      mc.registerTool!(tool);
    });

    // Cleanup: desregistrar al desmontar
    return () => {
      tools.forEach((tool) => mc.unregisterTool?.(tool.name));
    };
  }, []);
}
