/**
 * Tipos compartidos para la Sala de Encuentro.
 */
export type EstadoSesion = "activa" | "convergida" | "fallida";
export type RolTurno = "diagnostico" | "estrategia" | "critico";

export interface CollabSession {
  id: string;
  reto: string;
  estado: EstadoSesion;
  ronda_actual: number;
  created_at: string;
}

export interface CollabTurno {
  id: string;
  session_id: string;
  ronda: number;
  rol: RolTurno;
  contenido: string;
  created_at: string;
}

export interface OrchestrateResponse {
  session: CollabSession;
  turno: CollabTurno | null;
  approved: boolean;
  finished: boolean;
  modo: "ia" | "demo";
}

/** Secuencia fija de roles por ronda: Diag → Est → Crit → Est → Crit */
export const SECUENCIA_ROLES: RolTurno[] = [
  "diagnostico",
  "estrategia",
  "critico",
  "estrategia",
  "critico",
];
export const MAX_RONDAS = SECUENCIA_ROLES.length;
