import boxen from 'boxen';
import type { Theme } from './color.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface BoxOptions {
  title?: string;
  padding?: number;
  borderStyle?: 'single' | 'double' | 'round' | 'bold' | 'none';
  borderColor?: 'error' | 'warning' | 'success' | 'info' | 'phase' | 'muted';
  titleColor?: 'phase' | 'info' | 'muted';
}

export interface BoxRenderer {
  render(content: string, options?: BoxOptions): string;
  renderSection(title: string, content: string, options?: BoxOptions): string;
  renderPrompt(content: string): string;
}

// ---------------------------------------------------------------------------
// Semantic color name → chalk/border color string for boxen v8
// ---------------------------------------------------------------------------

const SEMANTIC_TO_CHALK_COLOR: Record<string, string> = {
  error: 'red',
  warning: 'yellow',
  success: 'green',
  info: 'blue',
  phase: 'magenta',
  muted: 'gray',
};

// ---------------------------------------------------------------------------
// ASCII borders for no-color mode
// ---------------------------------------------------------------------------

function renderAscii(content: string, title?: string): string {
  const lines = content.split('\n');
  const maxWidth = Math.max(
    ...lines.map(l => l.length),
    title ? title.length + 4 : 0,
    1,
  );
  const top = title
    ? `+-- ${title} ${'-'.repeat(Math.max(0, maxWidth - title.length - 2))}+`
    : `+${'-'.repeat(maxWidth + 2)}+`;
  const bottom = `+${'-'.repeat(maxWidth + 2)}+`;

  const padded = lines.map(l => `| ${l}${' '.repeat(Math.max(0, maxWidth - l.length))} |`);
  return [top, ...padded, bottom].join('\n');
}

// ---------------------------------------------------------------------------
// createBox
// ---------------------------------------------------------------------------

export function createBox(theme: Theme): BoxRenderer {
  /** Map semantic borderColor to a chalk color string for boxen's borderColor option. */
  function toBorderColor(color?: BoxOptions['borderColor']): string | undefined {
    if (theme.mode === 'none' || theme.mode === 'basic') return undefined;
    if (!color) return SEMANTIC_TO_CHALK_COLOR.muted; // default: muted gray
    return SEMANTIC_TO_CHALK_COLOR[color] ?? SEMANTIC_TO_CHALK_COLOR.muted;
  }

  function render(content: string, options?: BoxOptions): string {
    const borderStyle = options?.borderStyle ?? 'single';
    const padding = options?.padding ?? 1;

    // No-color mode: ASCII borders
    if (theme.mode === 'none') {
      return renderAscii(content, options?.title);
    }

    // borderStyle 'none': just return content with padding (no border)
    if (borderStyle === 'none') {
      const pad = ' '.repeat(padding);
      return content
        .split('\n')
        .map(l => `${pad}${l}${pad}`)
        .join('\n');
    }

    return boxen(content, {
      title: options?.title,
      padding,
      borderStyle,
      borderColor: toBorderColor(options?.borderColor),
      titleAlignment: options?.title ? 'center' : undefined,
    });
  }

  function renderSection(title: string, content: string, options?: BoxOptions): string {
    return render(content, { ...options, title });
  }

  function renderPrompt(content: string): string {
    return render(content, {
      borderStyle: 'double',
      borderColor: 'info',
      padding: 1,
    });
  }

  return { render, renderSection, renderPrompt };
}
