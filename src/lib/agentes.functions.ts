import { createServerFn } from "@tanstack/react-start";

import { contactoInput, generarAgenteInput } from "./agentes.tipos";
import type { AgenteGenerado } from "./agentes.tipos";

export const generarAgente = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => generarAgenteInput.parse(input))
  .handler(async ({ data }): Promise<AgenteGenerado> => {
    const { generarConIA, etiquetaDominio } = await import("./agentes.server");
    const resultado = await generarConIA(data);

    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      await supabaseAdmin.from("agentes_generados").insert({
        dominio: etiquetaDominio(data),
        problema: data.problema,
        tipo_problema: data.tipoProblema,
        system_prompt: resultado.systemPrompt,
        ficha_tecnica: resultado.ficha,
        modo: resultado.modo,
      });
    } catch (error) {
      console.error("No se pudo registrar el agente:", error);
    }

    return resultado;
  });

export const enviarContacto = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => contactoInput.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("contactos").insert({
      nombre: data.nombre,
      email: data.email,
      descripcion: data.descripcion,
    });
    if (error) {
      console.error("Error guardando contacto:", error);
      throw new Error("No pudimos guardar tu mensaje. Inténtalo de nuevo.");
    }
    return { ok: true as const };
  });
