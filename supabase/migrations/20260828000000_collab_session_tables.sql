-- Sala de Encuentro: tablas para colaboracion multi-agente.
-- RLS equivalente al de generated_agents/contact_leads, pero con
-- INSERT y SELECT publicos (el frontend necesita leer los turnos en vivo).

-- ---------------------------------------------------------------------------
-- collab_sessions
-- ---------------------------------------------------------------------------
CREATE TABLE public.collab_sessions (
  id           UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  reto         TEXT NOT NULL CHECK (char_length(reto) BETWEEN 1 AND 2000),
  estado       TEXT NOT NULL DEFAULT 'activa' CHECK (estado IN ('activa', 'convergida', 'fallida')),
  ronda_actual INTEGER NOT NULL DEFAULT 1,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT ALL ON public.collab_sessions TO service_role;
ALTER TABLE public.collab_sessions ENABLE ROW LEVEL SECURITY;

-- INSERT anonimo publico (solo las columnas necesarias)
REVOKE ALL ON public.collab_sessions FROM anon, authenticated;
GRANT INSERT (reto, estado, ronda_actual, created_at)
  ON public.collab_sessions TO anon, authenticated;

DROP POLICY IF EXISTS "anon_inserta_sessions" ON public.collab_sessions;
CREATE POLICY "anon_inserta_sessions"
  ON public.collab_sessions
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- SELECT publico (necesario para el timeline Realtime y consultas de estado)
GRANT SELECT ON public.collab_sessions TO anon, authenticated;

DROP POLICY IF EXISTS "public_lectura_sessions" ON public.collab_sessions;
CREATE POLICY "public_lectura_sessions"
  ON public.collab_sessions
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- UPDATE publico (el loop interno actualiza estado/ronda_actual)
GRANT UPDATE (estado, ronda_actual) ON public.collab_sessions TO anon, authenticated;

DROP POLICY IF EXISTS "public_actualiza_sessions" ON public.collab_sessions;
CREATE POLICY "public_actualiza_sessions"
  ON public.collab_sessions
  FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- ---------------------------------------------------------------------------
-- collab_turns
-- ---------------------------------------------------------------------------
CREATE TABLE public.collab_turns (
  id         UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.collab_sessions(id) ON DELETE CASCADE,
  ronda      INTEGER NOT NULL CHECK (ronda >= 1),
  rol        TEXT NOT NULL CHECK (rol IN ('diagnostico', 'estrategia', 'critico')),
  contenido  TEXT NOT NULL CHECK (char_length(contenido) >= 1),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT ALL ON public.collab_turns TO service_role;
ALTER TABLE public.collab_turns ENABLE ROW LEVEL SECURITY;

-- INSERT anonimo publico
REVOKE ALL ON public.collab_turns FROM anon, authenticated;
GRANT INSERT (session_id, ronda, rol, contenido, created_at)
  ON public.collab_turns TO anon, authenticated;

DROP POLICY IF EXISTS "anon_inserta_turns" ON public.collab_turns;
CREATE POLICY "anon_inserta_turns"
  ON public.collab_turns
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- SELECT publico (todo el mundo ve los turnos del timeline)
GRANT SELECT ON public.collab_turns TO anon, authenticated;

DROP POLICY IF EXISTS "public_lectura_turns" ON public.collab_turns;
CREATE POLICY "public_lectura_turns"
  ON public.collab_turns
  FOR SELECT
  TO anon, authenticated
  USING (true);
