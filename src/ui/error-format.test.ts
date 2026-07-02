import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { formatError, printError, printWarning } from './error-format.js';
import { createTheme, type Theme } from './color.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fullTheme(): Theme {
  return createTheme({ _chalkLevel: 3, _isTTY: true });
}

function noneTheme(): Theme {
  return createTheme({ noColor: true });
}

function hasAnsi(s: string): boolean {
  return /\x1b\[/.test(s);
}

// ---------------------------------------------------------------------------
// formatError — String Output
// ---------------------------------------------------------------------------

describe('formatError', () => {
  it('should return formatted string with [ERROR] prefix', () => {
    const result = formatError(fullTheme(), 'Directory not found');
    expect(result).toContain('[ERROR]');
    expect(result).toContain('Directory not found');
  });

  it('should not write to stdout or stderr', () => {
    const stderrSpy = vi.spyOn(process.stderr, 'write');
    formatError(fullTheme(), 'pure function', { severity: 'error' });
    expect(stderrSpy).not.toHaveBeenCalled();
    stderrSpy.mockRestore();
  });

  it('should be idempotent (same input → same output)', () => {
    const a = formatError(fullTheme(), 'test', { severity: 'error' });
    const b = formatError(fullTheme(), 'test', { severity: 'error' });
    expect(a).toBe(b);
  });

  it('should produce [FATAL] for severity fatal', () => {
    const result = formatError(fullTheme(), 'msg', { severity: 'fatal' });
    expect(result).toContain('[FATAL]');
  });

  it('should produce [WARN] for severity warn', () => {
    const result = formatError(fullTheme(), 'msg', { severity: 'warn' });
    expect(result).toContain('[WARN]');
  });

  it('should default to severity error', () => {
    const result = formatError(fullTheme(), 'msg');
    expect(result).toContain('[ERROR]');
  });

  it('should style only the prefix, not the body', () => {
    const result = formatError(fullTheme(), 'file not found', { severity: 'error' });
    // In full mode: prefix has ANSI, body does not
    const idx = result.indexOf(']') + 2; // after "] "
    expect(hasAnsi(result.substring(0, idx))).toBe(true);
    expect(hasAnsi(result.substring(idx))).toBe(false);
  });

  it('should handle empty message (full mode — styled prefix)', () => {
    const result = formatError(fullTheme(), '', { severity: 'error' });
    expect(result).toContain('[ERROR]');
    expect(result).toContain(' '); // space after prefix
  });
});

// ---------------------------------------------------------------------------
// formatError — No-Color Mode
// ---------------------------------------------------------------------------

describe('formatError in no-color mode', () => {
  it('should produce plain text without ANSI', () => {
    const result = formatError(noneTheme(), 'Directory not found', { severity: 'error' });
    expect(result).toBe('[ERROR] Directory not found');
    expect(hasAnsi(result)).toBe(false);
  });

  it('should produce plain [WARN] text', () => {
    const result = formatError(noneTheme(), 'Session missing', { severity: 'warn' });
    expect(result).toBe('[WARN] Session missing');
    expect(hasAnsi(result)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// printError — stderr + exit
// ---------------------------------------------------------------------------

describe('printError', () => {
  let stderrSpy: ReturnType<typeof vi.spyOn>;
  let exitSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    stderrSpy = vi.spyOn(process.stderr, 'write').mockReturnValue(true);
    exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);
  });

  afterEach(() => {
    stderrSpy.mockRestore();
    exitSpy.mockRestore();
  });

  function runPrintError(theme: Theme, msg: string, opts?: Parameters<typeof printError>[2]) {
    try { printError(theme, msg, opts); } catch (e) { /* process.exit mock doesn't throw */ }
  }

  it('should write styled output to stderr and exit with default code', () => {
    runPrintError(fullTheme(), 'Missing directory', { severity: 'error' });
    const output = stderrSpy.mock.calls[0][0] as string;
    expect(output).toContain('[ERROR]');
    expect(output).toContain('Missing directory');
    expect(output.endsWith('\n')).toBe(true);
    expect(exitSpy).toHaveBeenCalledWith(2);
  });

  it('should exit with code 3 for fatal', () => {
    runPrintError(fullTheme(), 'Corrupted file', { severity: 'fatal' });
    expect(exitSpy).toHaveBeenCalledWith(3);
  });

  it('should exit with code 2 for error', () => {
    runPrintError(fullTheme(), 'Invalid state', { severity: 'error' });
    expect(exitSpy).toHaveBeenCalledWith(2);
  });

  it('should allow exitCode override', () => {
    runPrintError(fullTheme(), 'Unknown command', { severity: 'error', exitCode: 1 });
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it('should default to error severity', () => {
    runPrintError(fullTheme(), 'Something broke');
    const output = stderrSpy.mock.calls[0][0] as string;
    expect(output).toContain('[ERROR]');
    expect(exitSpy).toHaveBeenCalledWith(2);
  });
});

// ---------------------------------------------------------------------------
// printError — No-Color Mode
// ---------------------------------------------------------------------------

describe('printError in no-color mode', () => {
  it('should write plain text to stderr and exit', () => {
    const stderrSpy = vi.spyOn(process.stderr, 'write').mockReturnValue(true);
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);
    try { printError(noneTheme(), 'Missing directory', { severity: 'error' }); } catch (e) { /* */ }
    const output = stderrSpy.mock.calls[0][0] as string;
    expect(hasAnsi(output)).toBe(false);
    expect(output).toBe('[ERROR] Missing directory\n');
    expect(exitSpy).toHaveBeenCalledWith(2);
    stderrSpy.mockRestore();
    exitSpy.mockRestore();
  });
});

// ---------------------------------------------------------------------------
// printWarning
// ---------------------------------------------------------------------------

describe('printWarning', () => {
  let stderrSpy: ReturnType<typeof vi.spyOn>;
  let exitSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    stderrSpy = vi.spyOn(process.stderr, 'write').mockReturnValue(true);
    exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);
  });

  afterEach(() => {
    stderrSpy.mockRestore();
    exitSpy.mockRestore();
  });

  it('should write [WARN] to stderr but not exit', () => {
    printWarning(fullTheme(), 'No session log found');
    const output = stderrSpy.mock.calls[0][0] as string;
    expect(output).toContain('[WARN]');
    expect(output).toContain('No session log found');
    expect(output.endsWith('\n')).toBe(true);
    expect(exitSpy).not.toHaveBeenCalled();
  });

  it('should use yellow styling in full color mode', () => {
    printWarning(fullTheme(), 'warning message');
    const output = stderrSpy.mock.calls[0][0] as string;
    expect(hasAnsi(output)).toBe(true);
  });

  it('should produce plain text in no-color mode', () => {
    printWarning(noneTheme(), 'warning message');
    const output = stderrSpy.mock.calls[0][0] as string;
    expect(output).toBe('[WARN] warning message\n');
    expect(hasAnsi(output)).toBe(false);
  });
});
