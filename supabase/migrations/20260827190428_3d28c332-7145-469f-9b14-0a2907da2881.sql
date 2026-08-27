CREATE TABLE public.agentes_generados (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  dominio TEXT NOT NULL CHECK (char_length(dominio) BETWEEN 1 AND 80),
  problema TEXT NOT NULL CHECK (char_length(problema) BETWEEN 1 AND 2000),
  tipo_problema TEXT CHECK (tipo_problema IS NULL OR char_length(tipo_problema) <= 80),
  system_prompt TEXT NOT NULL,
  ficha_tecnica JSONB NOT NULL DEFAULT '{}'::jsonb,
  modo TEXT NOT NULL DEFAULT 'ia' CHECK (modo IN ('ia','demo')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT ALL ON public.agentes_generados TO service_role;
ALTER TABLE public.agentes_generados ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.contactos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre TEXT NOT NULL CHECK (char_length(nombre) BETWEEN 1 AND 120),
  email TEXT NOT NULL CHECK (char_length(email) BETWEEN 3 AND 255 AND position('@' in email) > 1),
  descripcion TEXT NOT NULL CHECK (char_length(descripcion) BETWEEN 1 AND 2000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT ALL ON public.contactos TO service_role;
ALTER TABLE public.contactos ENABLE ROW LEVEL SECURITY;