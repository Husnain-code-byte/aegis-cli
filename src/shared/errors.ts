import levenshteinPkg from 'fast-levenshtein';
import { EXIT_OK_CODES, EXIT_ERR_CODES, EXIT_SENTINEL } from './constants.js';

// fast-levenshtein is CJS — extract `get` from default import
const levenshteinDistance = (levenshteinPkg as unknown as { get: (a: string, b: string) => number }).get;

// ---------------------------------------------------------------------------
// UnknownCommandError
// ---------------------------------------------------------------------------

/**
 * Error thrown when an unknown command is entered.
 * Carries Levenshtein-based suggestions for the closest matching commands.
 * Uses fast-levenshtein for distance computation (per F-002 anti-goal: integrate, don't implement).
 */
export class UnknownCommandError extends Error {
  public readonly input: string;
  public readonly suggestions: string[];

  constructor(input: string, suggestions: string[]) {
    const hasSuggestions = suggestions.length > 0;
    const suggestionClause = hasSuggestions
      ? `. Did you mean '${suggestions.join("', '")}'?`
      : '.';
    super(`[ERROR] Unknown command '${input}'${suggestionClause}`);
    this.name = 'UnknownCommandError';
    this.input = input;
    this.suggestions = suggestions;
  }
}

// ---------------------------------------------------------------------------
// findSuggestions
// ---------------------------------------------------------------------------

/**
 * Find up to `maxSuggestions` command names within `maxDistance` of `input`.
 * Uses fast-levenshtein for distance computation.
 */
export function findSuggestions(
  input: string,
  candidates: string[],
  maxDistance = 3,
  maxSuggestions = 3,
): string[] {
  return candidates
    .map((candidate) => ({
      name: candidate,
      distance: levenshteinDistance(input, candidate),
    }))
    .filter((r) => r.distance <= maxDistance)
    .sort((a, b) => a.distance - b.distance)
    .slice(0, maxSuggestions)
    .map((r) => r.name);
}

// ---------------------------------------------------------------------------
// classifyCommanderError — shared error classification for DRY compliance
// ---------------------------------------------------------------------------

export interface ClassifiedError {
  exitCode: number;
  /** true = re-throw (unexpected), false = exit with exitCode (expected) */
  isFatal: boolean;
}

/**
 * Classify a Commander error thrown via exitOverride.
 * Shared by both main() and parseAndCapture() to eliminate duplication.
 */
export function classifyCommanderError(err: unknown): ClassifiedError {
  // Guard against null/undefined/primitive throws
  if (err === null || err === undefined || typeof err !== 'object') {
    return { exitCode: 1, isFatal: false };
  }

  const ce = err as { code?: string; exitCode?: number; message?: string };

  // Expected: help or version displayed
  if (EXIT_OK_CODES.includes(ce.code as (typeof EXIT_OK_CODES)[number])) {
    return { exitCode: ce.exitCode ?? 0, isFatal: false };
  }

  // Expected: error codes that already output a message
  if (
    EXIT_ERR_CODES.includes(ce.code as (typeof EXIT_ERR_CODES)[number]) ||
    ce.message === EXIT_SENTINEL
  ) {
    return { exitCode: ce.exitCode ?? 1, isFatal: false };
  }

  // Unexpected — should be re-thrown
  return { exitCode: ce.exitCode ?? 1, isFatal: true };
}

// ---------------------------------------------------------------------------
// WorkspaceError
// ---------------------------------------------------------------------------

/**
 * Error thrown when workspace detection fails.
 * Exit codes: 2 = missing directories/not a workspace, 3 = filesystem/permission error.
 */
export class WorkspaceError extends Error {
  public readonly exitCode: number;

  constructor(message: string, exitCode = 2) {
    super(message);
    this.name = 'WorkspaceError';
    this.exitCode = exitCode;
  }
}
