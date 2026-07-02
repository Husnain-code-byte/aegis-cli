# F-023 -- Boxen Renderer (Terminal UI Subsystem)

> Amazon Working Backwards format. Boxen v8.0.1 wrapper integrated with Color Manager (F-024).
> Build Order #6: core output primitive for all Terminal UI features (F-025 Progress, F-027 Error Formatter, F-028 Dashboard). Appetite: Small (1-2 AI sessions).

---

## Press Release

**Aegis CLI -- Bordered Containers That Adapt to Every Terminal**

Aegis now renders every section of its terminal output inside clean, bordered boxes. Status summaries, agent cards, prompt displays, error panels -- every piece of information is visually grouped inside a container that matches the terminal's capabilities. On modern terminals with truecolor support, boxes render with Unicode box-drawing characters in semantic colors. On limited terminals, they degrade to simple box-drawing characters without color. On piped output or when `--no-color` is active, every box becomes a clean ASCII-bordered section with `+`, `-`, and `|` characters -- no ANSI codes, no garbage in log files.

Type `aegis status` and your project summary appears inside a muted-bordered box. Type `aegis phase` and the phase progress bar sits inside a phase-colored container. Type `aegis prompt` and the generated prompt displays inside a double-bordered, highlighted box optimized for copy-paste. Every command produces visually structured output that separates sections, guides the eye, and works correctly on every terminal from Windows Terminal to SSH to piped file output.

The Boxen Renderer wraps the `boxen` npm package (v8.0.1, ESM-only) and translates the Color Manager's semantic theme -- mode, color functions, style functions -- into boxen's options. No feature that renders bordered output touches boxen directly. Every box goes through a single `BoxRenderer` interface with three functions: `render()`, `renderSection()`, and `renderPrompt()`. This ensures consistent border styles, padding, and color behavior across the entire CLI.

---

## FAQ

### Q: What problem does the Boxen Renderer solve?

A: Before the Boxen Renderer, every Terminal UI feature that wanted a bordered container would either import `boxen` directly or build ad-hoc border rendering logic. This meant inconsistent border styles, duplicated padding logic, and scattered color handling. Some features would use boxen's default single border, others might try double borders, and none would consistently respect `--no-color` or piped output. The Boxen Renderer provides a single, consistent interface for all bordered container needs, integrating with the Color Manager's mode detection so that border rendering always matches the terminal's capabilities.

### Q: How does the Boxen Renderer integrate with the Color Manager?

A: The `createBox(theme)` function accepts a `Theme` object from the Color Manager. The renderer reads `theme.mode` to determine border rendering strategy and maps semantic color names to chalk color strings that boxen v8 accepts natively via its `borderColor` option. The mapping is: error→'red', warning→'yellow', success→'green', info→'blue', phase→'magenta', muted→'gray'. Border color is applied by passing these strings directly to boxen's borderColor — theme functions are NOT called for borders (boxen applies the ANSI internally). Content inside boxes still uses theme functions for styling.

- **`mode: 'full'`**: Boxen renders with full Unicode box-drawing characters and ANSI color on borders via boxen's borderColor option.
- **`mode: 'basic'`**: Boxen renders with Unicode box-drawing characters but borderColor is set to undefined (no ANSI on borders). Content inside may still use ANSI from theme functions.
- **`mode: 'none'`**: Boxen is bypassed entirely. Borders are rendered as plain ASCII characters (`+`, `-`, `|`) with no ANSI escape sequences anywhere. Content is rendered via theme identity functions.

### Q: What border styles are available?

A: Five border styles map to boxen's built-in styles:

| Option     | Characters      | Usage                              |
|------------|-----------------|------------------------------------|
| `single`   | `--- ||| +++ ` | Default. Clean, minimal borders.   |
| `double`   | `=== ||| \|\| `| Prominent sections (prompts, highlights). |
| `round`    | `--- ||| +++ ` | Softer corners for content sections. |
| `bold`     | `=== ||| +++ ` | Heavy borders for emphasis.          |
| `none`     | (no border)     | Content with padding only.          |

Each style is available in all color modes (with appropriate degradation).

### Q: What is the difference between render(), renderSection(), and renderPrompt()?

A: These three functions serve different use cases:

- **`render(content, options)`**: General-purpose box. Wraps content in a bordered container. Defaults to single border, padding 1, muted border color. Use for status boxes, data displays, and any section that needs a border.
- **`renderSection(title, content, options)`**: Titled section box. Renders a box with the title centered in the top border. Use for agent cards, phase details, and any section with a heading baked into the border.
- **`renderPrompt(content)`**: Pre-styled prompt box. No options -- the style is hardcoded for the `aegis prompt` use case. Uses double border with info-colored border. Optimized for the prompt display where visual distinction is critical.

### Q: How does the renderer handle multi-line content?

A: Boxen natively handles multi-line content. Each line is padded consistently with the specified padding value. Line breaks in the input string are preserved in the output. Empty lines within multi-line content remain as padded empty lines inside the box. The renderer does not perform any wrapping or truncation -- that is the caller's responsibility.

### Q: What happens when borderStyle is 'none'?

A: The content is rendered with the specified padding but without any border characters. No `---`, no `|||`, no corners. This is useful for inline content that needs consistent padding with other boxed sections but without visual borders. In all three color modes, borderStyle 'none' produces identical content padding -- only the presence or absence of border characters changes.

### Q: How are borderColor and titleColor resolved?

A: The `borderColor` and `titleColor` option values are semantic names that map to theme color functions:

| Value     | Theme Function | Visual    |
|-----------|---------------|-----------|
| `phase`   | `theme.phase`  | Magenta   |
| `info`    | `theme.info`   | Blue      |
| `muted`   | `theme.muted`  | Gray      |
| `success` | `theme.success`| Green     |
| `warning` | `theme.warning`| Yellow    |
| `error`   | `theme.error`  | Red       |

In full mode, the corresponding theme function is called to color the border. In basic mode, the border is rendered without color. In no-color mode, no theme function is called -- borders are ASCII. Invalid color names are rejected at the TypeScript level (the union type enforces valid values).

---

## Success Criteria

1. **Default render** -- `render("content")` with no options produces a single-bordered box with padding 1, muted border color, and correct box-drawing characters
2. **All five border styles** -- Each of `single`, `double`, `round`, `bold`, `none` produces the expected border character set or no border
3. **renderSection with title** -- Title text appears centered in the top border of the box
4. **renderPrompt pre-styled** -- Output uses double border, info-colored border, with appropriate ANSI codes for the current mode
5. **No-color mode ASCII fallback** -- When `theme.mode === 'none'`, borders use `+`, `-`, `|` characters with no ANSI escape sequences
6. **Basic mode no-border-color** -- When `theme.mode === 'basic'`, borders use Unicode box-drawing characters without ANSI color on border lines
7. **Multi-line content** -- Line breaks are preserved and each content line has consistent padding
8. **Custom padding** -- The specified `padding` value correctly increases or decreases the space around content
9. **Empty content** -- An empty string produces a valid minimal box structure (borders with one empty padded line)
10. **Unicode content** -- Content with emoji, CJK characters, and extended Unicode renders without breaking the box structure
11. **All borderColor values accepted** -- Each of the six semantic border color values produces ANSI-colored output in full mode
12. **All titleColor values accepted** -- Each of the three semantic title color values renders without error in full mode

## Anti-Goals

1. **NOT a general-purpose boxen wrapper** -- Only exposes the three render functions needed by Aegis Terminal UI features, not all boxen options (dimBorder, float, align, backgroundColor, etc.)
2. **NOT a text wrapping engine** -- Does not wrap or truncate long content; the caller must pre-process content to fit within desired width
3. **NOT a layout system** -- Does not support side-by-side boxes, nested box alignment, or grid-based layout
4. **NOT an ANSI stripping library** -- Only controls its own output; does not strip ANSI codes from content passed to render functions
5. **NOT independently styleable** -- All styling goes through the Theme from Color Manager; no direct chalk or boxen color API exposure
6. **NOT a buffer or streaming renderer** -- Each render call produces a complete string synchronously; no streaming, no partial output, no progressive rendering
7. **NOT configurable at runtime** -- No global configuration for default border style, padding, or colors; all options are per-call

---

## Measurable Outcomes

| Metric | Target | How Measured |
|--------|--------|-------------|
| Border style coverage | 5/5 styles produce correct output per mode | Integration tests with character-level assertions on first/last line |
| Color mode coverage | 3/3 modes produce correct border rendering (full/basic/none) | Integration tests with ANSI presence and character set assertions |
| Semantic color mapping | 6/6 borderColor values map to correct theme functions | Unit tests with spy theme functions |
| Semantic title color mapping | 3/3 titleColor values map to correct theme functions | Unit tests with spy theme functions |
| Section rendering | Title appears in top border for all modes | Integration tests for renderSection output |
| Prompt rendering | Pre-styled output consistent across modes | Integration tests for renderPrompt output |
| Multi-line integrity | Line breaks preserved, padding consistent across all lines | Integration tests with known multi-line input |
| Empty content handling | Valid box with no content error | Integration tests with empty string input |
| No ANSI in no-color mode | 0 ANSI escape sequences in output | Property-based tests for all string inputs |
| Mutation score | >= 80% | Stryker mutation testing on renderer source files |

---

*Last updated: 2026-07-02. Status: Draft. Part of ANSDLC Phase 5A (Specification).*
