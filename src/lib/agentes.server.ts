import { generateText, Output, NoObjectGeneratedError } from "ai";
import { z } from "zod";

import { createLovableAiGatewayProvider } from "./ai-gateway.server";
import type { AgenteGenerado, FichaTecnica, GenerarAgenteInput } from "./agentes.tipos";

const fichaSchema = z.object({
  nombre: z.string(),
  rol: z.string(),
  objetivos: z.array(z.string()),
  herramientas: z.array(z.object({ nombre: z.string(), para_que: z.string() })),
  stack: z.array(z.object({ capa: z.string(), eleccion: z.string(), motivo: z.string() })),
  metricas: z.array(z.string()),
  riesgos: z.array(z.string()),
});

const respuestaSchema = z.object({
  system_prompt: z.string(),
  ficha: fichaSchema,
});

export function etiquetaDominio(input: GenerarAgenteInput) {
  return input.dominio === "otro" && input.dominioLibre
    ? input.dominioLibre
    : input.dominio;
}

const SISTEMA = `Eres un arquitecto de agentes de IA que trabaja con pymes y equipos técnicos de Chile y Latinoamérica.
Diseñas micro-agentes acotados, realistas y listos para prototipar.

Reglas:
- Responde SIEMPRE en español neutro con giros chilenos suaves y profesionales (nada de modismos exagerados).
- El "system_prompt" debe ser un prompt de sistema completo, en segunda persona, listo para pegar en producción: rol, alcance, tono, reglas de negocio, manejo de casos límite, criterios de escalamiento a un humano y formato de salida. Entre 180 y 400 palabras, en texto plano con secciones separadas por saltos de línea.
- La ficha debe ser concreta: 3 a 5 objetivos, 3 a 5 herramientas, 4 a 6 capas de stack, 3 a 4 métricas y 2 a 4 riesgos.
- Stack recomendado por defecto: FastAPI como capa de servicio y Gemini como modelo, salvo que el caso pida claramente otra cosa. Menciona también persistencia, orquestación/observabilidad y canal de entrada.
- Nada de relleno ni promesas de marketing.`;

function promptUsuario(input: GenerarAgenteInput) {
  return `Dominio del negocio: ${etiquetaDominio(input)}
Tipo de problema: ${input.tipoProblema}
Descripción del problema entregada por la persona:
"""
${input.problema}
"""

Diseña el micro-agente correspondiente.`;
}

export function generarDemo(input: GenerarAgenteInput): AgenteGenerado {
  const dominio = etiquetaDominio(input);
  const ficha: FichaTecnica = {
    nombre: `Agente ${input.tipoProblema} · ${dominio}`,
    rol: `Asistente operativo especializado en ${input.tipoProblema.toLowerCase()} para un negocio del rubro ${dominio.toLowerCase()}.`,
    objetivos: [
      "Resolver de forma autónoma las consultas repetitivas del flujo descrito.",
      "Escalar a una persona cuando falte información o el caso sea sensible.",
      "Registrar cada interacción para medir cobertura y calidad.",
    ],
    herramientas: [
      { nombre: "Base de conocimiento (RAG)", para_que: "Consultar políticas, precios y procedimientos internos." },
      { nombre: "API interna del negocio", para_que: "Leer estados de pedidos, casos o clientes en tiempo real." },
      { nombre: "Notificación a humano", para_que: "Derivar por correo o WhatsApp cuando se supera el alcance." },
    ],
    stack: [
      { capa: "API / orquestación", eleccion: "FastAPI (Python)", motivo: "Rápido de desplegar, tipado con Pydantic y fácil de integrar." },
      { capa: "Modelo", eleccion: "Gemini", motivo: "Buen costo por token y latencia baja para tareas conversacionales." },
      { capa: "Persistencia", eleccion: "PostgreSQL", motivo: "Historial de conversaciones, trazabilidad y métricas." },
      { capa: "Observabilidad", eleccion: "Logs estructurados + trazas por request", motivo: "Auditar respuestas y detectar alucinaciones." },
    ],
    metricas: [
      "% de casos resueltos sin intervención humana",
      "Tiempo medio de primera respuesta",
      "Tasa de escalamiento correcto",
    ],
    riesgos: [
      "Respuestas inventadas si la base de conocimiento está desactualizada.",
      "Manejo de datos personales sin política de retención definida.",
    ],
  };

  const systemPrompt = `Eres el asistente de IA de un negocio del rubro ${dominio.toLowerCase()}. Tu especialidad es ${input.tipoProblema.toLowerCase()}.

CONTEXTO DEL PROBLEMA
${input.problema}

ALCANCE
- Atiendes únicamente consultas relacionadas al flujo descrito arriba.
- Si te preguntan algo fuera de alcance, lo dices con claridad y ofreces derivar a una persona.

TONO
- Español neutro latinoamericano, cercano y directo. Frases cortas. Sin tecnicismos innecesarios.

REGLAS
1. Nunca inventes precios, plazos, stock ni políticas: si no está en tus fuentes, dilo y consulta.
2. Antes de resolver, confirma los datos mínimos necesarios (identificador del caso, cliente o pedido).
3. Si detectas molestia, urgencia, un reclamo formal o un tema legal/financiero sensible, escala de inmediato a un humano.
4. No solicites datos sensibles innecesarios (documentos de identidad completos, claves, tarjetas).

FORMATO DE SALIDA
- Respuesta breve (máximo 6 líneas).
- Cuando corresponda, agrega una lista de pasos numerados.
- Cierra siempre con el siguiente paso concreto o con la derivación realizada.

Si no puedes cumplir con seguridad lo que te piden, responde: "Prefiero derivarte con alguien del equipo para no darte información equivocada."`;

  return { systemPrompt, ficha, modo: "demo" };
}

export async function generarConIA(input: GenerarAgenteInput): Promise<AgenteGenerado> {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) return generarDemo(input);

  const gateway = createLovableAiGatewayProvider(apiKey);

  try {
    const result = await generateText({
      model: gateway("google/gemini-3.7-flash"),
      system: SISTEMA,
      prompt: promptUsuario(input),
      output: Output.object({ schema: respuestaSchema }),
    });
    const out = await result.output;
    return { systemPrompt: out.system_prompt, ficha: out.ficha, modo: "ia" };
  } catch (error) {
    if (NoObjectGeneratedError.isInstance(error)) {
      try {
        const parsed = respuestaSchema.parse(
          JSON.parse(String(error.text ?? "").replace(/^```json|```$/g, "").trim()),
        );
        return { systemPrompt: parsed.system_prompt, ficha: parsed.ficha, modo: "ia" };
      } catch {
        return generarDemo(input);
      }
    }
    const status = (error as { statusCode?: number; status?: number })?.statusCode ??
      (error as { status?: number })?.status;
    if (status === 429) throw new Error("RATE_LIMIT");
    if (status === 402) throw new Error("SIN_CREDITOS");
    console.error("Fallo de generación IA:", error);
    return generarDemo(input);
  }
}
