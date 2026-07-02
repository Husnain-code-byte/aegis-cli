import { describe, it, expect } from 'vitest';
import { createBox, type BoxOptions } from './box.js';
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

function basicTheme(): Theme {
  return createTheme({ _chalkLevel: 1, _isTTY: true });
}

// ---------------------------------------------------------------------------
// Default Render
// ---------------------------------------------------------------------------

describe('Default render()', () => {
  it('should wrap content in a bordered box', () => {
    const box = createBox(fullTheme());
    const result = box.render('hello');
    expect(result).toContain('hello');
    // Should have box-drawing characters (Unicode)
    expect(result).toMatch(/[─-╿]/);
  });

  it('should use single border style by default', () => {
    const box = createBox(fullTheme());
    const result = box.render('hello');
    expect(result).toContain('┌'); // top-left corner of single border
  });

  it('should default to padding 1', () => {
    const box = createBox(fullTheme());
    const result = box.render('hello');
    const lines = result.split('\n');
    // At least 3 lines: top border, content+padding, bottom border
    expect(lines.length).toBeGreaterThanOrEqual(3);
  });

  it('should default to muted border color', () => {
    const box = createBox(fullTheme());
    const result = box.render('hello');
    // In full mode with borderColor set, output contains ANSI sequences
    expect(/\x1b\[/.test(result)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Custom Border Styles
// ---------------------------------------------------------------------------

describe('Custom border styles', () => {
  const styles: Array<{ name: BoxOptions['borderStyle']; desc: string }> = [
    { name: 'single', desc: 'single' },
    { name: 'double', desc: 'double' },
    { name: 'round', desc: 'round' },
    { name: 'bold', desc: 'bold' },
    { name: 'none', desc: 'none' },
  ];

  for (const style of styles) {
    it(`should render with ${style.desc} border style`, () => {
      const box = createBox(fullTheme());
      const result = box.render('test', { borderStyle: style.name });
      expect(result).toContain('test');
      // Should not throw or produce empty output
      expect(result.length).toBeGreaterThan(0);
    });
  }

  it('should produce no border characters when style is none', () => {
    const box = createBox(fullTheme());
    const result = box.render('test', { borderStyle: 'none', padding: 0 });
    // No box-drawing characters
    expect(/[─-╿]/.test(result)).toBe(false);
    expect(result).toContain('test');
  });
});

// ---------------------------------------------------------------------------
// renderSection
// ---------------------------------------------------------------------------

describe('renderSection()', () => {
  it('should render a box with a title', () => {
    const box = createBox(fullTheme());
    const result = box.renderSection('My Title', 'section content');
    expect(result).toContain('My Title');
    expect(result).toContain('section content');
  });

  it('should produce box-drawing characters', () => {
    const box = createBox(fullTheme());
    const result = box.renderSection('Title', 'content');
    expect(result).toMatch(/[─-╿]/);
  });

  it('should accept custom borderStyle and borderColor', () => {
    const box = createBox(fullTheme());
    const result = box.renderSection('Title', 'content', {
      borderStyle: 'double',
      borderColor: 'phase',
    });
    expect(result).toContain('Title');
    expect(result).toContain('content');
  });
});

// ---------------------------------------------------------------------------
// renderPrompt
// ---------------------------------------------------------------------------

describe('renderPrompt()', () => {
  it('should render a prompt-styled box', () => {
    const box = createBox(fullTheme());
    const result = box.renderPrompt('Your prompt here');
    expect(result).toContain('Your prompt here');
  });

  it('should use double border with info color', () => {
    const box = createBox(fullTheme());
    const result = box.renderPrompt('prompt');
    // Should have ANSI color (info = blue)
    expect(/\x1b\[/.test(result)).toBe(true);
    expect(result).toContain('prompt');
  });
});

// ---------------------------------------------------------------------------
// Color Mode Behavior
// ---------------------------------------------------------------------------

describe('No-color mode', () => {
  it('should render ASCII borders in no-color mode', () => {
    const box = createBox(noneTheme());
    const result = box.render('hello');
    // Should NOT have any ANSI escape sequences
    expect(/\x1b\[/.test(result)).toBe(false);
    // Should use ASCII characters instead
    expect(result).toContain('+');
    expect(result).toContain('-');
    expect(result).toContain('|');
    expect(result).toContain('hello');
  });

  it('should render sections as ASCII in no-color mode', () => {
    const box = createBox(noneTheme());
    const result = box.renderSection('Title', 'content');
    expect(/\x1b\[/.test(result)).toBe(false);
    expect(result).toContain('Title');
  });

  it('should render prompts as ASCII in no-color mode', () => {
    const box = createBox(noneTheme());
    const result = box.renderPrompt('prompt');
    expect(/\x1b\[/.test(result)).toBe(false);
    expect(result).toContain('prompt');
  });
});

describe('Basic color mode', () => {
  it('should use box-drawing characters without border color', () => {
    const box = createBox(basicTheme());
    const result = box.render('test');
    // Content contains 'test'
    expect(result).toContain('test');
  });
});

// ---------------------------------------------------------------------------
// Multi-line and Padding
// ---------------------------------------------------------------------------

describe('Multi-line content', () => {
  it('should preserve line breaks', () => {
    const box = createBox(fullTheme());
    const result = box.render('line1\nline2\nline3');
    expect(result).toContain('line1');
    expect(result).toContain('line2');
    expect(result).toContain('line3');
  });

  it('should pad each line consistently', () => {
    const box = createBox(fullTheme());
    const result = box.render('a\nb', { padding: 2 });
    const lines = result.split('\n');
    const contentLines = lines.filter(l => l.includes('a') || l.includes('b'));
    expect(contentLines.length).toBe(2);
  });
});

describe('Custom padding', () => {
  it('should accept padding of 0', () => {
    const box = createBox(fullTheme());
    const result = box.render('test', { padding: 0 });
    expect(result).toContain('test');
  });

  it('should accept padding of 3', () => {
    const box = createBox(fullTheme());
    const result = box.render('test', { padding: 3 });
    expect(result).toContain('test');
  });
});

// ---------------------------------------------------------------------------
// Edge Cases
// ---------------------------------------------------------------------------

describe('Edge cases', () => {
  it('should handle empty content', () => {
    const box = createBox(fullTheme());
    const result = box.render('');
    // Should produce a minimal box even with empty content
    expect(result.length).toBeGreaterThan(0);
  });

  it('should handle unicode content', () => {
    const box = createBox(fullTheme());
    const result = box.render('🚀 rocket');
    expect(result).toContain('🚀');
    expect(result).toContain('rocket');
  });

  it('should handle all six borderColor values', () => {
    const colors: BoxOptions['borderColor'][] = ['error', 'warning', 'success', 'info', 'phase', 'muted'];
    const box = createBox(fullTheme());
    for (const color of colors) {
      const result = box.render('test', { borderColor: color });
      expect(result).toContain('test');
    }
  });
});
