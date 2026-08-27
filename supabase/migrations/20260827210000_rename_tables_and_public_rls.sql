-- Renombra las tablas a los nombres definitivos del producto y configura el
-- acceso publico: insercion anonima restringida a las columnas necesarias,
-- lectura y edicion publicas bloqueadas por RLS (sin politicas de SELECT).

ALTER TABLE IF EXISTS public.agentes_generados RENAME TO generated_agents;
ALTER TABLE IF EXISTS public.contactos RENAME TO contact_leads;

ALTER TABLE public.generated_agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_leads ENABLE ROW LEVEL SECURITY;

-- generated_agents: INSERT anonimo permitido, lectura y edicion bloqueadas.
REVOKE ALL ON public.generated_agents FROM anon, authenticated;
GRANT INSERT (dominio, problema, tipo_problema, system_prompt, ficha_tecnica, modo)
  ON public.generated_agents TO anon, authenticated;

DROP POLICY IF EXISTS "anon_inserta_generaciones" ON public.generated_agents;
CREATE POLICY "anon_inserta_generaciones"
  ON public.generated_agents
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- contact_leads: INSERT anonimo permitido, lectura y edicion bloqueadas.
REVOKE ALL ON public.contact_leads FROM anon, authenticated;
GRANT INSERT (nombre, email, descripcion)
  ON public.contact_leads TO anon, authenticated;

DROP POLICY IF EXISTS "anon_inserta_leads" ON public.contact_leads;
CREATE POLICY "anon_inserta_leads"
  ON public.contact_leads
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);