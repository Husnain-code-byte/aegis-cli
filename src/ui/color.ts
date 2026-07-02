import chalk from 'chalk';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ColorOptions {
  /** --no-color flag from CLI. Highest priority: disables all styling. */
  noColor?: boolean;
  /** JSON mode implies no-color (machine-readable output, no ANSI). */
  json?: boolean;
  /** Internal: override chalk level for testing. */
  _chalkLevel?: number;
  /** Internal: override TTY detection for testing. */
  _isTTY?: boolean;
}

export interface Theme {
  readonly mode: 'full' | 'basic' | 'none';
  error(text: string): string;
  warning(text: string): string;
  success(text: string): string;
  info(text: string): string;
  phase(text: string): string;
  muted(text: string): string;
  heading(text: string): string;
  bold(text: string): string;
  dim(text: string): string;
  italic(text: string): string;
}

// ---------------------------------------------------------------------------
// Mode detection
// ---------------------------------------------------------------------------

function detectMode(options: ColorOptions): 'full' | 'basic' | 'none' {
  if (options.noColor === true) return 'none';
  if (options.json === true) return 'none';
  if (process.env.CHALK_DISABLE) return 'none';
  if (process.env.NO_COLOR) return 'none';

  const isTTY = options._isTTY ?? process.stdout.isTTY;
  if (isTTY === false) return 'none';

  const level = options._chalkLevel ?? chalk.level;
  if (level === 3) return 'full';
  if (level === 0) return 'none';
  return 'basic';
}

/** Map detected mode to chalk level value. */
function modeToChalkLevel(mode: 'full' | 'basic' | 'none'): number {
  if (mode === 'full') return 3;
  if (mode === 'none') return 0;
  return 1; // basic
}

// ---------------------------------------------------------------------------
// Immutable wrapper — silently rejects mutations in strict mode
// ---------------------------------------------------------------------------

/**
 * Wraps an object in a Proxy that silently rejects property addition,
 * modification, and deletion. Unlike Object.freeze() which throws TypeError
 * in strict mode (ESM), this provides the silent-rejection behavior per spec.
 */
function immutable<T extends object>(obj: T): T {
  return new Proxy(obj, {
    set(_target, prop, _value): boolean {
      // Silently reject — return true to avoid TypeError, but don't actually set
      if (prop in obj) {
        return true; // existing property: claim success, don't mutate
      }
      return true; // new property: claim success, don't mutate
    },
    deleteProperty(_target, prop): boolean {
      if (prop in obj) {
        return true; // claim deleted, but property still exists
      }
      return true;
    },
    defineProperty(_target, prop, _desc): boolean {
      // Prevent Object.defineProperty from adding/modifying
      return true;
    },
  });
}

// ---------------------------------------------------------------------------
// Theme functions (created once — level applied at call time via chalk.level)
// ---------------------------------------------------------------------------

function makeThemeFunctions(): Omit<Theme, 'mode'> {
  return {
    error: (text: string): string => chalk.red(text),
    warning: (text: string): string => chalk.yellow(text),
    success: (text: string): string => chalk.green(text),
    info: (text: string): string => chalk.blue(text),
    phase: (text: string): string => chalk.magenta(text),
    muted: (text: string): string => chalk.gray(text),
    heading: (text: string): string => chalk.bold(text),
    bold: (text: string): string => chalk.bold(text),
    dim: (text: string): string => chalk.dim(text),
    italic: (text: string): string => chalk.italic(text),
  };
}

/** Pre-built theme functions — level is determined by chalk.level at call time. */
const themeFns = makeThemeFunctions();

// ---------------------------------------------------------------------------
// createTheme
// ---------------------------------------------------------------------------

export function createTheme(options: ColorOptions = {}): Theme {
  const mode = detectMode(options);

  // Apply the correct chalk level for this theme
  chalk.level = modeToChalkLevel(mode);

  // Log once at creation time
  console.log(`[INFO] Color mode: ${mode}`);

  return immutable({
    mode,
    ...themeFns,
  }) as unknown as Theme;
}
