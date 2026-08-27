import { z } from "zod";

export const DOMINIOS = [
  { value: "pyme_servicios", label: "Pyme de servicios" },
  { value: "ecommerce", label: "E-commerce" },
  { value: "estudio_contable", label: "Estudio contable" },
  { value: "freelance", label: "Freelance" },
  { value: "otro", label: "Otro" },
] as const;

export const PROBLEMAS = [
  {
    value: "soporte",
    label: "Atención a clientes",
    hint: "Responder dudas frecuentes y derivar casos complejos.",
  },
  {
    value: "leads",
    label: "Calificación de leads",
    hint: "Filtrar y priorizar prospectos según intención de compra.",
  },
  {
    value: "reportes",
    label: "Generación de reportes",
    hint: "Resumir datos y entregar informes periódicos.",
  },
  {
    value: "custom",
    label: "Otro (lo describo yo)",
    hint: "Cuéntanos con tus palabras qué debería resolver.",
  },
] as const;

export const generarAgenteInput = z.object({
  dominio: z.string().trim().min(1, "Elige un dominio").max(80),
  dominioLibre: z.string().trim().max(80).optional(),
  tipoProblema: z.string().trim().min(1).max(80),
  problema: z
    .string()
    .trim()
    .min(15, "Cuéntanos un poco más (mínimo 15 caracteres)")
    .max(2000, "Máximo 2000 caracteres"),
});
export type GenerarAgenteInput = z.infer<typeof generarAgenteInput>;

export const contactoInput = z.object({
  nombre: z.string().trim().min(2, "Ingresa tu nombre").max(120),
  email: z.string().trim().email("Ingresa un email válido").max(255),
  descripcion: z
    .string()
    .trim()
    .min(10, "Cuéntanos brevemente tu caso")
    .max(2000, "Máximo 2000 caracteres"),
});
export type ContactoInput = z.infer<typeof contactoInput>;

export type FichaTecnica = {
  nombre: string;
  rol: string;
  objetivos: string[];
  herramientas: { nombre: string; para_que: string }[];
  stack: { capa: string; eleccion: string; motivo: string }[];
  metricas: string[];
  riesgos: string[];
};

export type AgenteGenerado = {
  systemPrompt: string;
  ficha: FichaTecnica;
  modo: "ia" | "demo";
};
