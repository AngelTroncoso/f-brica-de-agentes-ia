# Despliegue manual de la Sala de Encuentro (Supabase Dashboard)

Guía para aplicar las tablas, el RLS y el Realtime de la Sala de Encuentro
**sin usar el CLI de Supabase**. Acciones manuales desde el Dashboard.

---

## Requisitos previos

- Acceso al proyecto Supabase `fyxywpebejlqckzklhqd`
  (URL: `https://fyxywpebejlqckzklhqd.supabase.co`)
- Sesión iniciada en el Dashboard de Supabase

---

## Paso 1 — Crear tablas + RLS (SQL Editor)

1. En el sidebar: **SQL Editor** → *New query*.
2. Pega el contenido de este archivo de migración:

   ```
   supabase/migrations/20260828000000_collab_session_tables.sql
   ```

   (Crea `collab_sessions` y `collab_turns` + políticas RLS de INSERT/SELECT/UPDATE público.)

3. Ejecuta (botón **Run** o `Ctrl/Cmd + Enter`).

---

## Paso 2 — Activar Realtime (SQL Editor)

1. En el **SQL Editor**, ejecuta este bloque (o usa el toggle del dashboard):

   ```sql
   ALTER PUBLICATION supabase_realtime ADD TABLE public.collab_sessions;
   ALTER PUBLICATION supabase_realtime ADD TABLE public.collab_turns;
   ```

2. **Alternativa visual**: Dashboard → Database → *Replication* → *Realtime* →
   activa el toggle de las tablas `collab_sessions` y `collab_turns`.

> Sin esto, `supabase.channel().on('postgres_changes', ...)` no dispara eventos
> y el timeline en vivo no actualizará los turnos ni el estado.

---

## Paso 3 — Verificar tablas y RLS

En SQL Editor, corre:

```sql
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('collab_sessions', 'collab_turns');

SELECT polname, tablename, cmd, permissive
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('collab_sessions', 'collab_turns')
ORDER BY tablename, polname;
```

Debes ver:
- `rowsafety = t` en ambas tablas.
- Las políticas `anon_inserta_*`, `public_lectura_*` y `public_actualiza_sessions`.

---

## Paso 4 — Desplegar Edge Functions

Las funciones **no se despliegan desde el Dashboard** (requieren CLI o
integración con GitHub). Dos opciones:

### Opción A — CLI (recomendada)

```bash
supabase login                      # una vez, guarda access token
supabase link --project-ref fyxywpebejlqckzklhqd --password "<DB_PASSWORD>"
supabase functions deploy collab_orchestrate
supabase functions deploy mcp_server
```

Las variables de entorno de las funciones se toman automáticamente del
proyecto (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY`).
Para IA real (no demo), además:

```bash
supabase secrets set GOOGLE_AI_STUDIO_KEY=<tu-key> --env-name
supabase secrets set GOOGLE_AI_MODEL=gemini-2.5-flash --env-name
```

### Opción B — GitHub integration

1. Conecta el repo `AngelTroncoso/f-brica-de-agentes-ia` a Supabase
   (Project Settings → Integrations → GitHub).
2. La ruta por defecto `supabase/functions` con `.github/workflows/deploy.yml`
   permite auto-deploy desde `main`. Los secrets se configuran en:
   Project Settings → Edge Functions → Secrets.

---

## Paso 5 — Smoke test

1. Arranca el frontend local:

   ```bash
   npm run dev
   ```

2. Abre `http://localhost:3000/sala-de-encuentro`.
3. Escribe un reto (≥ 15 caracteres) y *Iniciar sala*.
4. Debes ver las tarjetas de turnos aparecer progresivamente (Diagnóstico →
   Estrategia → Crítico → …) sin recargar la página.
5. Al final: tarjeta de **Solución validada** con botones copiar/descargar
   (si converge) o invitación a **Reformular el reto** (si falla).

---

## Rollback (si algo falla)

```sql
DROP TABLE IF EXISTS public.collab_turns;
DROP TABLE IF EXISTS public.collab_sessions;
```

(El `DROP` heredado de `collab_turns` con `CASCADE` elimina también las
políticas; elimina ambas tablas. No afecta a `generated_agents` ni
`contact_leads`.)