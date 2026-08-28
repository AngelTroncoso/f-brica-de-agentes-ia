#!/usr/bin/env bash
# ============================================================================
# Despliegue de la Sala de Encuentro (collab_sessions / collab_turns).
# Equivalente en Bash al script deploy-sala.ps1.
#
# REQUISITOS: supabase CLI v2+, `supabase login`, y SUPABASE_DB_PASSWORD set.
#
# USO:
#   export SUPABASE_PROJECT_ID=fyxywpebejlqckzklhqd
#   export SUPABASE_DB_PASSWORD=tu_password
#   bash scripts/deploy-sala.sh
# ============================================================================
set -euo pipefail
cd "$(dirname "$0")/.."

echo "==> 1/4. Vinculando proyecto Supabase..."
supabase link --project-ref "${SUPABASE_PROJECT_ID}" --password "${SUPABASE_DB_PASSWORD}"

echo "==> 2/4. Aplicando migraciones (tablas + RLS + Realtime)..."
supabase db push --password "${SUPABASE_DB_PASSWORD}"

echo "==> 3/4. Desplegando Edge Functions..."
supabase functions deploy collab_orchestrate
supabase functions deploy mcp_server

echo ""
echo "==> VALIDACION:"
echo "  1. Realtime: revisar en el dashboard que collab_sessions/collab_turns"
echo "     tengan Realtime habilitado."
echo "  2. GOOGLE_AI_STUDIO_KEY: para modo IA real usa:"
echo "       supabase secrets set GOOGLE_AI_STUDIO_KEY=<tu-key> --env-name"
echo "       supabase secrets set GOOGLE_AI_MODEL=gemini-2.5-flash --env-name"
echo ""
echo "Despliegue completado (fast-forward normal, sin fuerza)."