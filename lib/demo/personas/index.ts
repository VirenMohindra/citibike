/**
 * Persona Registry
 * Maps persona IDs to persona objects
 */

import { dailyCommuterPersona } from './daily-commuter';
import type { Persona } from '@/lib/demo/types';

export const PERSONAS: Record<string, Persona> = {
  daily_commuter: dailyCommuterPersona,
} as const;

/**
 * Get persona by ID
 */
export function getPersona(personaId: string): Persona | null {
  return PERSONAS[personaId] || null;
}

/**
 * Get display name for persona
 */
export function getPersonaDisplayName(personaId: string): string {
  const persona = getPersona(personaId);
  return persona?.name || 'Demo User';
}
