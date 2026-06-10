/**
 * Handlers de búsqueda y navegación a perfiles por nombre (Sprint 5).
 *
 * E1 (find_user_profile): resuelve el nombre dicho por el usuario contra
 * Supabase y decide:
 *   - match único (o exacto por username) → navega al perfil
 *   - varios matches → pregunta "¿te refieres a @x, @y o @z?" (el usuario
 *     responde en un turno nuevo; no hay estado de espera dedicado)
 *   - sin match → mensaje claro
 *
 * E2 (search_content): abre la pestaña de búsqueda con la query
 * pre-rellenada. La búsqueda de Evo cubre usuarios y clanes (no hay servicio
 * de búsqueda de publicaciones), así que esto degrada con elegancia.
 */
import type { ActionResult } from '../../core/types';
import { getAgentAppBridge, type AgentUserSearchResult } from '../appBridge';

const NO_BRIDGE: ActionResult = {
  success: false,
  error: 'AgentAppBridge not registered',
  message: 'No he podido buscar. Inténtalo de nuevo.',
};

function asTrimmedString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

/** Normaliza el nombre dicho: sin "@", sin acentos, minúsculas. */
function normalizeName(name: string): string {
  return name
    .replace(/^@/, '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

/**
 * Decide el resultado de la resolución por nombre. Pura y testeable:
 * prioriza el match exacto de username; si no, único resultado → ese;
 * varios → ambiguo; ninguno → sin match.
 */
export function resolveUserMatches(
  query: string,
  results: AgentUserSearchResult[],
):
  | { kind: 'unique'; user: AgentUserSearchResult }
  | { kind: 'multiple'; users: AgentUserSearchResult[] }
  | { kind: 'none' } {
  if (results.length === 0) return { kind: 'none' };
  const normalizedQuery = normalizeName(query);
  const exact = results.find((r) => normalizeName(r.username) === normalizedQuery);
  if (exact) return { kind: 'unique', user: exact };
  if (results.length === 1) return { kind: 'unique', user: results[0] };
  return { kind: 'multiple', users: results.slice(0, 3) };
}

/** E1: ir al perfil de un usuario por nombre/username. */
export async function findUserProfileHandler(
  params: Record<string, unknown>,
): Promise<ActionResult> {
  const bridge = getAgentAppBridge();
  if (!bridge) return NO_BRIDGE;
  const query = asTrimmedString(params.searchQuery);
  if (!query) {
    return {
      success: false,
      error: 'Missing searchQuery parameter',
      message: 'No he entendido a qué usuario quieres ir. Dímelo otra vez.',
    };
  }

  let results: AgentUserSearchResult[];
  try {
    results = await bridge.searchUsers(query.replace(/^@/, ''));
  } catch (e) {
    return {
      success: false,
      error: `searchUsers failed: ${e instanceof Error ? e.message : 'unknown'}`,
      message: 'No he podido buscar ahora mismo. Inténtalo de nuevo.',
    };
  }

  const resolution = resolveUserMatches(query, results);
  if (resolution.kind === 'none') {
    return {
      success: false,
      error: 'No user match',
      message: `No he encontrado ningún usuario con el nombre ${query}.`,
    };
  }
  if (resolution.kind === 'multiple') {
    const names = resolution.users.map((u) => `@${u.username}`);
    const list =
      names.length > 1
        ? `${names.slice(0, -1).join(', ')} o ${names[names.length - 1]}`
        : names[0];
    return {
      success: false,
      error: 'Multiple user matches',
      message: `He encontrado varios usuarios. ¿Te refieres a ${list}? Dime el nombre completo.`,
      data: { matches: resolution.users.map((u) => u.username) },
    };
  }

  try {
    bridge.openProfile(resolution.user.id, resolution.user.username);
    return {
      success: true,
      message: `Te llevo al perfil de ${resolution.user.username}.`,
      data: { profile_id: resolution.user.id },
    };
  } catch (e) {
    return {
      success: false,
      error: `openProfile failed: ${e instanceof Error ? e.message : 'unknown'}`,
      message: 'No he podido abrir el perfil. Inténtalo de nuevo.',
    };
  }
}

/** E2: abrir el buscador con la query pre-rellenada. */
export async function openSearchWithQueryHandler(
  params: Record<string, unknown>,
): Promise<ActionResult> {
  const bridge = getAgentAppBridge();
  if (!bridge) return NO_BRIDGE;
  const query = asTrimmedString(params.searchQuery);
  try {
    bridge.openSearch(query?.replace(/^@/, ''));
    return { success: true, data: { query: query ?? null } };
  } catch (e) {
    return {
      success: false,
      error: `openSearch failed: ${e instanceof Error ? e.message : 'unknown'}`,
      message: 'No he podido abrir el buscador. Inténtalo de nuevo.',
    };
  }
}
