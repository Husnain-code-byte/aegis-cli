# Design System

> Design tokens, component catalog, and responsive breakpoints. Created during Phase 4 (Design System).

---

## Design Tokens

### Colors
```css
:root {
  /* Surface */
  --color-surface-primary: #1A1A2E;
  --color-surface-secondary: #16213E;
  --color-surface-tertiary: #0F3460;

  /* Text */
  --color-text-primary: #FFFFFF;
  --color-text-secondary: #A0A0B0;
  --color-text-muted: #6B6B80;

  /* Accent */
  --color-accent-primary: #6366F1;
  --color-accent-hover: #818CF8;
  --color-accent-active: #4F46E5;

  /* Semantic */
  --color-success: #22C55E;
  --color-warning: #F59E0B;
  --color-error: #EF4444;
  --color-info: #3B82F6;

  /* Border */
  --color-border-default: #2A2A4A;
  --color-border-focus: #6366F1;
}
```

### Typography
```css
:root {
  --font-family-sans: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  --font-family-mono: 'JetBrains Mono', 'Fira Code', monospace;

  --typography-heading-xl: 700 32px/1.2 var(--font-family-sans);
  --typography-heading-lg: 700 24px/1.3 var(--font-family-sans);
  --typography-heading-md: 600 20px/1.4 var(--font-family-sans);
  --typography-heading-sm: 600 16px/1.5 var(--font-family-sans);
  --typography-body-lg: 400 18px/1.6 var(--font-family-sans);
  --typography-body-md: 400 16px/1.6 var(--font-family-sans);
  --typography-body-sm: 400 14px/1.5 var(--font-family-sans);
  --typography-code: 400 14px/1.5 var(--font-family-mono);
}
```

### Spacing
```css
:root {
  --spacing-xs: 4px;
  --spacing-sm: 8px;
  --spacing-md: 16px;
  --spacing-lg: 24px;
  --spacing-xl: 32px;
  --spacing-2xl: 48px;
  --spacing-3xl: 64px;
}
```

### Shadows
```css
:root {
  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.1);
  --shadow-md: 0 4px 6px rgba(0, 0, 0, 0.15);
  --shadow-lg: 0 10px 25px rgba(0, 0, 0, 0.2);
  --shadow-xl: 0 20px 50px rgba(0, 0, 0, 0.3);
}
```

### Border Radius
```css
:root {
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --radius-xl: 16px;
  --radius-full: 9999px;
}
```

### Breakpoints
```css
:root {
  --breakpoint-sm: 640px;   /* Mobile landscape */
  --breakpoint-md: 768px;   /* Tablet */
  --breakpoint-lg: 1024px;  /* Desktop */
  --breakpoint-xl: 1280px;  /* Wide desktop */
  --breakpoint-2xl: 1536px; /* Ultra-wide */
}
```

---

## Component Catalog

| Component | Status | Storybook | Accessibility | Variants |
|-----------|--------|-----------|---------------|----------|
| Button | Planned | — | — | primary, secondary, ghost, danger, sizes |
| Input | Planned | — | — | text, email, password, number, textarea |
| Modal | Planned | — | — | default, large, fullscreen |
| Card | Planned | — | — | default, interactive, elevated |
| [Add components as they are built] | | | | |

---

## Non-Negotiable Rules
- NEVER hardcode hex, RGB, HSL, or pixel values — ALWAYS use design tokens
- ALWAYS use semantic token names — no raw color values in components
- ALL colors must pass WCAG 2.1 AA contrast (4.5:1 normal, 3:1 large)
- Mobile-first development — smallest breakpoint first, enhance up
- Every component gets a Storybook story before it's considered done

---

*Last updated: [Date]. Managed by: design-system-builder agent.*
