// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TerminalSize {
  columns: number;
  rows: number;
  isTTY: boolean;
}

export interface SizeOptions {
  /** Force refresh, bypassing the debounce cache. */
  refresh?: boolean;
}

// ---------------------------------------------------------------------------
// Cache
// ---------------------------------------------------------------------------

const DEBOUNCE_MS = 100;
let cachedSize: TerminalSize | null = null;
let lastCheck = 0;

// ---------------------------------------------------------------------------
// Detection
// ---------------------------------------------------------------------------

function detectSize(): TerminalSize {
  // Primary: stdout
  if (process.stdout.isTTY && typeof process.stdout.columns === 'number' && process.stdout.columns > 0) {
    return {
      columns: process.stdout.columns,
      rows: process.stdout.rows || 24,
      isTTY: true,
    };
  }

  // Fallback: stderr
  if (process.stderr.isTTY && typeof process.stderr.columns === 'number' && process.stderr.columns > 0) {
    return {
      columns: process.stderr.columns,
      rows: process.stderr.rows || 24,
      isTTY: true,
    };
  }

  // Default
  return { columns: 80, rows: 24, isTTY: false };
}

// ---------------------------------------------------------------------------
// getSize
// ---------------------------------------------------------------------------

export function getSize(options: SizeOptions = {}): TerminalSize {
  if (options.refresh) {
    const size = detectSize();
    cachedSize = size;
    lastCheck = Date.now();
    return { ...size };
  }

  const now = Date.now();
  if (cachedSize && now - lastCheck < DEBOUNCE_MS) {
    return { ...cachedSize };
  }

  const size = detectSize();
  cachedSize = size;
  lastCheck = now;
  return { ...size };
}

// ---------------------------------------------------------------------------
// Narrow detection helpers
// ---------------------------------------------------------------------------

/** True when terminal width is less than 60 columns. */
export function isNarrow(size: TerminalSize): boolean {
  return size.columns < 60;
}

/** True when terminal width is less than 50 columns. */
export function isWarnNarrow(size: TerminalSize): boolean {
  return size.columns < 50;
}
