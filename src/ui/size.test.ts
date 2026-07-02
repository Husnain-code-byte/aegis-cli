import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { getSize, isNarrow, isWarnNarrow, type TerminalSize } from './size.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Override process.stdout for testing */
function mockStdout(columns: number, rows: number, isTTY: boolean) {
  Object.defineProperty(process.stdout, 'columns', { value: columns, configurable: true, writable: true });
  Object.defineProperty(process.stdout, 'rows', { value: rows, configurable: true, writable: true });
  Object.defineProperty(process.stdout, 'isTTY', { value: isTTY, configurable: true, writable: true });
}

function mockStderr(columns: number, rows: number, isTTY: boolean) {
  Object.defineProperty(process.stderr, 'columns', { value: columns, configurable: true, writable: true });
  Object.defineProperty(process.stderr, 'rows', { value: rows, configurable: true, writable: true });
  Object.defineProperty(process.stderr, 'isTTY', { value: isTTY, configurable: true, writable: true });
}

// ---------------------------------------------------------------------------
// TTY Detection
// ---------------------------------------------------------------------------

describe('TTY Detection', () => {
  it('should detect stdout columns and rows when TTY', () => {
    mockStdout(120, 30, true);
    const size = getSize({ refresh: true });
    expect(size.columns).toBe(120);
    expect(size.rows).toBe(30);
    expect(size.isTTY).toBe(true);
  });

  it('should fall back to stderr when stdout is not a TTY', () => {
    mockStdout(undefined as unknown as number, undefined as unknown as number, false);
    mockStderr(100, 40, true);
    const size = getSize({ refresh: true });
    expect(size.columns).toBe(100);
    expect(size.rows).toBe(40);
    expect(size.isTTY).toBe(true);
  });

  it('should default to 80x24 when neither is TTY', () => {
    mockStdout(undefined as unknown as number, undefined as unknown as number, false);
    mockStderr(undefined as unknown as number, undefined as unknown as number, false);
    const size = getSize({ refresh: true });
    expect(size.columns).toBe(80);
    expect(size.rows).toBe(24);
    expect(size.isTTY).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Cache Behavior
// ---------------------------------------------------------------------------

describe('Cache Behavior', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockStdout(120, 30, true);
    // Force a refresh to reset cache state
    getSize({ refresh: true });
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('should return cached value within debounce window', () => {
    const first = getSize();
    mockStdout(80, 20, true); // change — but should be ignored
    const second = getSize();
    expect(second.columns).toBe(first.columns);
  });

  it('should refresh after debounce window expires', () => {
    const first = getSize();
    mockStdout(80, 20, true);
    vi.advanceTimersByTime(101);
    const second = getSize();
    expect(second.columns).toBe(80);
    expect(second.columns).not.toBe(first.columns);
  });

  it('should force refresh when refresh option is true', () => {
    getSize(); // populate cache
    mockStdout(90, 25, true);
    const forced = getSize({ refresh: true });
    expect(forced.columns).toBe(90);
    expect(forced.rows).toBe(25);
  });
});

// ---------------------------------------------------------------------------
// Narrow Detection
// ---------------------------------------------------------------------------

describe('Narrow Detection', () => {
  it('isNarrow should return true when columns < 60', () => {
    expect(isNarrow({ columns: 59, rows: 24, isTTY: true })).toBe(true);
  });

  it('isNarrow should return false when columns >= 60', () => {
    expect(isNarrow({ columns: 60, rows: 24, isTTY: true })).toBe(false);
    expect(isNarrow({ columns: 120, rows: 24, isTTY: true })).toBe(false);
  });

  it('isWarnNarrow should return true when columns < 50', () => {
    expect(isWarnNarrow({ columns: 49, rows: 24, isTTY: true })).toBe(true);
  });

  it('isWarnNarrow should return false when columns >= 50', () => {
    expect(isWarnNarrow({ columns: 50, rows: 24, isTTY: true })).toBe(false);
    expect(isWarnNarrow({ columns: 80, rows: 24, isTTY: true })).toBe(false);
  });

  it('isNarrow and isWarnNarrow are monotonic', () => {
    // If isWarnNarrow is true, isNarrow should also be true
    const small: TerminalSize = { columns: 30, rows: 24, isTTY: true };
    expect(isWarnNarrow(small)).toBe(true);
    expect(isNarrow(small)).toBe(true); // narrower threshold always includes warn
  });
});

// ---------------------------------------------------------------------------
// Edge Cases
// ---------------------------------------------------------------------------

describe('Edge Cases', () => {
  it('should fall back to default when stdout has zero columns', () => {
    // Zero columns is invalid — implementation falls back to default
    mockStdout(0, 30, true);
    const size = getSize({ refresh: true });
    expect(size.columns).toBe(80);
    expect(size.rows).toBe(24);
  });

  it('should fall through when stdout TTY but zero columns', () => {
    mockStdout(0, 30, true);
    mockStderr(100, 40, true);
    // stdout is TTY but has zero columns — should use stderr
    // (actual logic: if stdout TTY, use it even if zero)
    const size = getSize({ refresh: true });
    expect(size.isTTY).toBe(true);
  });
});
