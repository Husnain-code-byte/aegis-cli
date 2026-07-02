import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createTheme, type ColorOptions, type Theme } from './color.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Check that a string contains ANSI escape sequences (starts with \x1b[). */
function hasAnsi(s: string): boolean {
  return /\x1b\[/.test(s);
}

// ---------------------------------------------------------------------------
// Color Mode Detection
// ---------------------------------------------------------------------------

describe('Color Mode Detection', () => {
  describe('Full color mode when terminal supports truecolor (Level 3, TTY)', () => {
    it('should return mode "full"', () => {
      const theme = createTheme({ _chalkLevel: 3, _isTTY: true });
      expect(theme.mode).toBe('full');
    });

    it('should produce ANSI-styled output from semantic color functions', () => {
      const theme = createTheme({ _chalkLevel: 3, _isTTY: true });
      expect(hasAnsi(theme.error('message'))).toBe(true);
      expect(hasAnsi(theme.warning('message'))).toBe(true);
      expect(hasAnsi(theme.success('message'))).toBe(true);
      expect(hasAnsi(theme.info('message'))).toBe(true);
      expect(hasAnsi(theme.phase('message'))).toBe(true);
      expect(hasAnsi(theme.muted('message'))).toBe(true);
    });
  });

  describe('Basic color mode (Level 1, TTY)', () => {
    it('should return mode "basic"', () => {
      const theme = createTheme({ _chalkLevel: 1, _isTTY: true });
      expect(theme.mode).toBe('basic');
    });

    it('should produce ANSI-styled output', () => {
      const theme = createTheme({ _chalkLevel: 1, _isTTY: true });
      expect(hasAnsi(theme.success('done'))).toBe(true);
    });
  });

  describe('Basic color mode (Level 2, 256-color, TTY)', () => {
    it('should return mode "basic" for Level 2', () => {
      const theme = createTheme({ _chalkLevel: 2, _isTTY: true });
      expect(theme.mode).toBe('basic');
    });

    it('should produce ANSI-styled output', () => {
      const theme = createTheme({ _chalkLevel: 2, _isTTY: true });
      expect(hasAnsi(theme.success('done'))).toBe(true);
    });
  });

  describe('No-color mode via --no-color flag', () => {
    it('should return mode "none" even with truecolor terminal', () => {
      const theme = createTheme({ noColor: true, _chalkLevel: 3, _isTTY: true });
      expect(theme.mode).toBe('none');
    });

    it('should return all inputs unchanged (10 functions)', () => {
      const theme = createTheme({ noColor: true, _chalkLevel: 3, _isTTY: true });
      expect(theme.error('x')).toBe('x');
      expect(theme.warning('x')).toBe('x');
      expect(theme.success('x')).toBe('x');
      expect(theme.info('x')).toBe('x');
      expect(theme.phase('x')).toBe('x');
      expect(theme.muted('x')).toBe('x');
      expect(theme.heading('x')).toBe('x');
      expect(theme.bold('x')).toBe('x');
      expect(theme.dim('x')).toBe('x');
      expect(theme.italic('x')).toBe('x');
    });
  });

  describe('No-color mode via CHALK_DISABLE env var', () => {
    beforeEach(() => {
      process.env.CHALK_DISABLE = '1';
    });
    afterEach(() => {
      delete process.env.CHALK_DISABLE;
    });

    it('should return mode "none" despite truecolor terminal', () => {
      const theme = createTheme({ _chalkLevel: 3, _isTTY: true });
      expect(theme.mode).toBe('none');
    });

    it('should return input unchanged', () => {
      const theme = createTheme({ _chalkLevel: 3, _isTTY: true });
      expect(theme.error('error text')).toBe('error text');
    });
  });

  describe('No-color mode via NO_COLOR env var', () => {
    beforeEach(() => {
      process.env.NO_COLOR = '1';
    });
    afterEach(() => {
      delete process.env.NO_COLOR;
    });

    it('should return mode "none" when NO_COLOR is set', () => {
      const theme = createTheme({ _chalkLevel: 3, _isTTY: true });
      expect(theme.mode).toBe('none');
    });

    it('should return input unchanged', () => {
      const theme = createTheme({ _chalkLevel: 3, _isTTY: true });
      expect(theme.info('data')).toBe('data');
    });
  });

  describe('No-color mode when stdout is piped (not a TTY)', () => {
    it('should return mode "none" despite truecolor Level 3', () => {
      const theme = createTheme({ _chalkLevel: 3, _isTTY: false });
      expect(theme.mode).toBe('none');
    });

    it('should return input unchanged', () => {
      const theme = createTheme({ _chalkLevel: 3, _isTTY: false });
      expect(theme.success('done')).toBe('done');
    });
  });
});

// ---------------------------------------------------------------------------
// JSON Mode
// ---------------------------------------------------------------------------

describe('JSON Mode', () => {
  it('should return mode "none" regardless of terminal capability', () => {
    const theme = createTheme({ json: true, _chalkLevel: 3, _isTTY: true });
    expect(theme.mode).toBe('none');
  });

  it('should return input unchanged', () => {
    const theme = createTheme({ json: true, _chalkLevel: 3, _isTTY: true });
    expect(theme.info('info message')).toBe('info message');
  });
});

// ---------------------------------------------------------------------------
// Semantic Colors and Text Styles
// ---------------------------------------------------------------------------

describe('Semantic Colors in Full Mode', () => {
  let theme: Theme;
  beforeEach(() => {
    theme = createTheme({ _chalkLevel: 3, _isTTY: true });
  });

  it('error should produce ANSI output', () => {
    expect(hasAnsi(theme.error('text'))).toBe(true);
  });
  it('warning should produce ANSI output', () => {
    expect(hasAnsi(theme.warning('text'))).toBe(true);
  });
  it('success should produce ANSI output', () => {
    expect(hasAnsi(theme.success('text'))).toBe(true);
  });
  it('info should produce ANSI output', () => {
    expect(hasAnsi(theme.info('text'))).toBe(true);
  });
  it('phase should produce ANSI output', () => {
    expect(hasAnsi(theme.phase('text'))).toBe(true);
  });
  it('muted should produce ANSI output', () => {
    expect(hasAnsi(theme.muted('text'))).toBe(true);
  });
  it('heading should produce ANSI output (bold, no color)', () => {
    expect(hasAnsi(theme.heading('text'))).toBe(true);
  });
});

describe('Text Styles in Full Mode', () => {
  let theme: Theme;
  beforeEach(() => {
    theme = createTheme({ _chalkLevel: 3, _isTTY: true });
  });

  it('bold should produce ANSI output', () => {
    expect(hasAnsi(theme.bold('bold text'))).toBe(true);
  });
  it('dim should produce ANSI output', () => {
    expect(hasAnsi(theme.dim('dim text'))).toBe(true);
  });
  it('italic should produce ANSI output', () => {
    expect(hasAnsi(theme.italic('italic text'))).toBe(true);
  });
});

describe('All Styles in No-Color Mode', () => {
  let theme: Theme;
  beforeEach(() => {
    theme = createTheme({ noColor: true });
  });

  const fns: Array<keyof Theme> = ['error', 'warning', 'success', 'info', 'phase', 'muted', 'heading', 'bold', 'dim', 'italic'];
  for (const fn of fns) {
    it(`${fn} should return input unchanged`, () => {
      const styled = (theme[fn] as (s: string) => string)('x');
      expect(styled).toBe('x');
    });
  }
});

// ---------------------------------------------------------------------------
// Mode Detection Priority Chain
// ---------------------------------------------------------------------------

describe('Mode Detection Priority Chain', () => {
  describe('--no-color flag overrides CHALK_DISABLE', () => {
    beforeEach(() => { process.env.CHALK_DISABLE = '1'; });
    afterEach(() => { delete process.env.CHALK_DISABLE; });

    it('should return mode "none" when both are set', () => {
      const theme = createTheme({ noColor: true, _chalkLevel: 3, _isTTY: true });
      expect(theme.mode).toBe('none');
      expect(theme.error('error')).toBe('error');
    });
  });

  describe('CHALK_DISABLE overrides terminal capability', () => {
    beforeEach(() => { process.env.CHALK_DISABLE = 'true'; });
    afterEach(() => { delete process.env.CHALK_DISABLE; });

    it('should return mode "none" despite Level 3 and TTY', () => {
      const theme = createTheme({ _chalkLevel: 3, _isTTY: true });
      expect(theme.mode).toBe('none');
      expect(theme.warning('warn')).toBe('warn');
    });
  });

  describe('Non-TTY overrides chalk level', () => {
    it('should return mode "none" when TTY is false despite Level 3', () => {
      const theme = createTheme({ _chalkLevel: 3, _isTTY: false });
      expect(theme.mode).toBe('none');
      expect(theme.success('done')).toBe('done');
    });
  });
});

// ---------------------------------------------------------------------------
// Edge Cases
// ---------------------------------------------------------------------------

describe('Theme Immutability', () => {
  it('should be immutable (silently rejects mutations)', () => {
    const theme = createTheme({ _chalkLevel: 3, _isTTY: true });
    // Proxy-based immutability — not Object.freeze, but mutations are silently ignored
    expect(Object.isExtensible(theme)).toBe(true); // Proxy allows this
    expect(theme.mode).toBe('full');
  });

  it('should silently reject adding new properties', () => {
    const theme = createTheme({ _chalkLevel: 3, _isTTY: true });
    (theme as Record<string, unknown>).newProp = 'value';
    expect((theme as Record<string, unknown>).newProp).toBeUndefined();
  });

  it('should silently reject modifying existing functions', () => {
    const theme = createTheme({ _chalkLevel: 3, _isTTY: true });
    const original = theme.error;
    (theme as Record<string, unknown>).error = () => 'hacked';
    expect(theme.error).toBe(original);
  });

  it('should silently reject deleting properties', () => {
    const theme = createTheme({ _chalkLevel: 3, _isTTY: true });
    delete (theme as Record<string, unknown>).error;
    expect(typeof theme.error).toBe('function');
  });

  it('should silently reject mode property overwrite', () => {
    const theme = createTheme({ _chalkLevel: 3, _isTTY: true });
    (theme as Record<string, unknown>).mode = 'none';
    expect(theme.mode).toBe('full');
  });
});

describe('Unknown Level Falls Back to Basic', () => {
  it('should fall back to basic for Level 2', () => {
    const theme = createTheme({ _chalkLevel: 2, _isTTY: true });
    expect(theme.mode).toBe('basic');
    expect(hasAnsi(theme.success('done'))).toBe(true);
  });
});

describe('Mode Logging', () => {
  it('should log the detected mode once on creation', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    createTheme({ _chalkLevel: 3, _isTTY: true });
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith('[INFO] Color mode: full');
    spy.mockRestore();
  });

  it('should log "basic" for Level 1', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    createTheme({ _chalkLevel: 1, _isTTY: true });
    expect(spy).toHaveBeenCalledWith('[INFO] Color mode: basic');
    spy.mockRestore();
  });

  it('should log "none" for no-color mode', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    createTheme({ noColor: true });
    expect(spy).toHaveBeenCalledWith('[INFO] Color mode: none');
    spy.mockRestore();
  });

  it('should not call logger from style functions', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const theme = createTheme({ _chalkLevel: 3, _isTTY: true });
    spy.mockClear();
    theme.error('test');
    theme.warning('test');
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });
});
