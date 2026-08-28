# ============================================================================
# Despliegue de la Sala de Encuentro (collab_sessions / collab_turns).
#
# REQUISITOS:
#   1. supabase CLI instalado (v2+)
#   2. `supabase login` ya ejecutado (access token guardado) — sin esto, los
#      comandos db push / functions deploy fallan pidiendo credencial
#      interactiva.
#   3. La variable SUPABASE_DB_PASSWORD debe estar disponible (password del
#      rol `postgres` del proyecto) para `db push`.
#
# USO (desde la raiz del repo):
#   PowerShell:  .\scripts\deploy-sala.ps1
#   Bash:        bash scripts/deploy-sala.sh
#
# Sin force push. Solo aplica lo necesario para la Sala de Encuentro.
# ============================================================================

$ErrorActionPreference = "Stop"
Set-Location (Join-Path $PSScriptRoot "..")

Write-Host "==> 1/4. Vinculando proyecto Supabase (si no estaba vinculado)..."
supabase link --project-ref "$env:SUPABASE_PROJECT_ID" --password "$env:SUPABASE_DB_PASSWORD"

if ($LASTEXITCODE -ne 0) {
  Write-Host "ERROR: supabase link fallo. Revisa SUPABASE_PROJECT_ID y SUPABASE_DB_PASSWORD."
  exit 1
}

Write-Host "==> 2/4. Aplicando migraciones (tablas + RLS + Realtime)..."
supabase db push --password "$env:SUPABASE_DB_PASSWORD"

if ($LASTEXITCODE -ne 0) {
  Write-Host "ERROR: db push fallo."
  exit 1
}

Write-Host "==> 3/4. Desplegando Edge Functions (collab_orchestrate, mcp_server)..."
supabase functions deploy collab_orchestrate
supabase functions deploy mcp_server

if ($LASTEXITCODE -ne 0) {
  Write-Host "ERROR: deploy de funciones fallo."
  exit 1
}

# Las funciones necesitan credenciales en tiempo de ejecucion.
# Con la config.local actual, usa SUPABASE_URL / SERVICE_ROLE / ANON del proyecto
# automaticamente; LOVABLE_API_KEY se define aparte (ver abajo).

Write-Host ""
Write-Host "==> VALIDACION:"
Write-Host "  1. Realtime: REVISAR en el dashboard de Supabase que las tablas"
Write-Host "     collab_sessions y collab_turns tengan 'Realtime' habilitado."
Write-Host "  2. LOVABLE_API_KEY: si quieres modo IA real (no demo), define:"
Write-Host "       supabase secrets set LOVABLE_API_KEY=<tu-key> --env-name"

Write-Host ""
Write-Host "Despliegue completado (fast-forward normal, sin fuerza)."

# ============================================================================
# NOTA: para aplicar SOLO la migracion de Realtime despues de un db push viejo,
# puedes ejecutar en el SQL Editor del dashboard:
#
#   ALTER PUBLICATION supabase_realtime ADD TABLE public.collab_sessions;
#   ALTER PUBLICATION supabase_realtime ADD TABLE public.collab_turns;
# ============================================================================