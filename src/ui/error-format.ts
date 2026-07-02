import type { Theme } from './color.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type Severity = 'fatal' | 'error' | 'warn';

export interface ErrorFormatOptions {
  severity?: Severity;
  exitCode?: number;
}

// ---------------------------------------------------------------------------
// Severity metadata
// ---------------------------------------------------------------------------

const SEVERITY_META: Record<Severity, { prefix: string; defaultExit: number }> = {
  fatal: { prefix: '[FATAL]', defaultExit: 3 },
  error: { prefix: '[ERROR]', defaultExit: 2 },
  warn: { prefix: '[WARN]', defaultExit: 0 },
};

// ---------------------------------------------------------------------------
// Pure formatting (no I/O)
// ---------------------------------------------------------------------------

/**
 * Format an error/warning message with a styled prefix.
 * Returns a string with the form `[LEVEL] message`.
 * Prefix is styled via theme.error or theme.warning; message body is plain.
 * Pure function — no I/O, no side effects.
 */
export function formatError(
  theme: Theme,
  message: string,
  options: ErrorFormatOptions = {},
): string {
  const severity: Severity = options.severity ?? 'error';
  const { prefix } = SEVERITY_META[severity];
  const styledPrefix =
    severity === 'warn' ? theme.warning(prefix) : theme.error(prefix);
  return `${styledPrefix} ${message}`;
}

// ---------------------------------------------------------------------------
// printError — writes to stderr, then exits
// ---------------------------------------------------------------------------

/**
 * Write a formatted error to stderr and call process.exit().
 * Does NOT return — calls process.exit() with the severity's default code
 * or a custom exitCode if provided.
 */
export function printError(
  theme: Theme,
  message: string,
  options: ErrorFormatOptions = {},
): never {
  const severity: Severity = options.severity ?? 'error';
  const formatted = formatError(theme, message, options);
  process.stderr.write(`${formatted}\n`);
  process.exit(options.exitCode ?? SEVERITY_META[severity].defaultExit);
}

// ---------------------------------------------------------------------------
// printWarning — writes to stderr, no exit
// ---------------------------------------------------------------------------

/**
 * Write a warning to stderr. Does NOT call process.exit().
 * Always uses severity 'warn' regardless of options.
 */
export function printWarning(theme: Theme, message: string): void {
  const formatted = formatError(theme, message, { severity: 'warn' });
  process.stderr.write(`${formatted}\n`);
}
