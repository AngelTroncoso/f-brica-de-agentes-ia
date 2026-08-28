-- Sala de Encuentro: activa Realtime (Postgres Changes) para el timeline en vivo.
-- Sin estas tablas en la publication, supabase.channel().on('postgres_changes')
-- jamás dispara eventos → el frontend no vería los turnos aparecer sin recargar.

-- Debe ejecutarse después de crear las tablas collab_sessions/collab_turns.
ALTER PUBLICATION supabase_realtime ADD TABLE public.collab_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.collab_turns;

-- RLS: realtime replica el flujo del emisor (service_role en la Edge Function).
-- Con RLS habilitado, los suscriptores deben tener permiso de SELECT para recibir
-- los cambios (ya configurado en la migración base: public_lectura_*).