# F-024 -- Color Manager (Terminal UI Subsystem)

> Amazon Working Backwards format. Chalk v5 wrapper with --no-color, CHALK_DISABLE, and TTY detection.
> Build Order #7: foundation for all other Terminal UI features (F-023 Boxen, F-025 Progress, F-027 Error Formatter, F-028 Dashboard). Appetite: Small (1-2 AI sessions).

---

## Press Release

**Aegis CLI -- Colors That Work Everywhere, No Configuration Required**

Aegis now ships with a color management system that works correctly on every terminal without configuration. Whether you are on a modern terminal emulator with truecolor support, an SSH session over a slow link with basic 16-color ANSI, or piping output into a file or a log aggregator, every character is styled exactly as it should be -- vivid when the terminal supports it, readable when limited, and plain text when colors are impossible.

Type `aegis status --no-color` and every colored element becomes plain text instantly. Set `CHALK_DISABLE=1` in your environment and all output across every command is stripped of ANSI sequences. Pipe `aegis start` into a file and the entire dashboard renders without escape codes. No flickering, no garbage characters, no manual toggling of settings.

Inside every other Terminal UI feature, the Color Manager provides seven semantic color functions -- error, warning, success, info, phase, muted, and heading -- plus three text styles: bold, dim, and italic. Every rendering feature in Aegis uses these functions. One environment change propagates consistently through the entire CLI; there is no feature that hard-codes its own color logic.

The Color Manager is invisible by design. When it works correctly, you never think about it -- every command output looks polished on every terminal, every pipe produces clean text, and every log file is free of escape code noise.

---

## FAQ

### Q: How does Aegis decide whether to use colors?

A: The Color Manager checks signals in priority order — highest priority first:

1. **`--no-color` flag** (from CLI, highest priority) — disables all colors
2. **`CHALK_DISABLE` env var** (any truthy value including empty string, per chalk v5) — disables all colors
3. **`NO_COLOR` env var** (any value, per no-color.org convention) — chalk v5 handles this internally by setting its level to 0; the Color Manager does not need to check it separately but documents it here for completeness
4. **Piped stdout** (`process.stdout.isTTY` is `false`) — disables colors for machine-readable output
5. **Terminal capability** (chalk Level detection): Level 3 = full 16M truecolor mode; Level 1 or 2 = basic color mode (256 or 16 colors depending on terminal); Level 0 = no color

If both `--no-color` and `CHALK_DISABLE` are active, the result is the same: no-color mode.

### Q: What does `--no-color` actually disable?

A: Every stylistic enhancement. In no-color mode, all seven semantic color functions and all three text style functions return the input string with no ANSI escape sequences added. The output is plain text suitable for piping, file redirection, or terminals that do not support ANSI. Error messages use `[ERROR]` and `[WARN]` text prefixes (plain text, not colored), so the contextual meaning is preserved even when color is stripped.

### Q: What colors are available and what do they mean?

A: The Color Manager defines seven semantic color mappings and three text styles:

| Function | Visual | Usage |
|----------|--------|-------|
| `error` | Red | Error messages, failure states, fatal conditions |
| `warning` | Yellow | Warnings, non-fatal issues, degraded states |
| `success` | Green | Success confirmations, completed actions, positive states |
| `info` | Blue | Informational messages, hints, neutral guidance |
| `phase` | Magenta | Current phase highlighting, active item emphasis |
| `muted` | Gray | Secondary text, de-emphasized content, metadata |
| `heading` | Bold (no color) | Section headings, titles, subsection labels |
| `bold` | Bold weight | Emphasis on key terms |
| `dim` | Reduced intensity | Secondary information, less important text |
| `italic` | Italic style | Quotes, references, citations |

In full and basic modes, all ten functions produce ANSI-wrapped output. In no-color mode, all ten are identity functions. The heading function uses bold without color so it works as a visual hierarchy element in all color modes.

### Q: Does JSON output mode affect color?

A: Yes. When `createTheme({ json: true })` is used, the Color Manager treats this the same as `--no-color` -- all styles are stripped. JSON output must be machine-readable without ANSI control characters embedded in string values. This is not configurable; JSON output is always plain text.

### Q: What happens when multiple disabling signals conflict?

A: The priority chain is absolute: `--no-color` flag overrides everything, then `CHALK_DISABLE` env var, then non-TTY stdout, then chalk level detection. A signal higher in the chain causes lower signals to be ignored entirely. For example, if `CHALK_DISABLE` is set and `--no-color` is not passed, the env var determines the mode regardless of TTY status or terminal capability. If both `CHALK_DISABLE` and `--no-color` are set together, the flag wins (but both indicate the same intent, so the result is the same: no-color).

### Q: Can I customize the color palette?

A: No. The palette is fixed by design. Aegis is not a theme engine. The seven semantic colors are chosen for consistency across all CLI output: errors are always red, warnings always yellow, success always green, and so on. This ensures that every command, dashboard, and error message has a consistent visual language that users can learn once and rely on everywhere. If you need custom colors, the Color Manager is not the right layer for that customization -- and no such feature is planned.

### Q: What happens if my terminal does not support italic or dim?

A: Style degradation is silent and graceful. Chalk applies ANSI escape sequences without checking terminal capability. If a terminal does not support italic, the text appears as-is (plain) or with a fallback rendering determined by the terminal emulator. No error is thrown. This is standard ANSI terminal behavior and matches how chalk works natively. The Color Manager does not probe terminal capability beyond the level check that chalk already performs.

---

## Success Criteria

1. **Full color mode** -- `createTheme()` in a truecolor-capable terminal (chalk Level 3, TTY true) returns `mode: "full"` and all ten style functions produce ANSI-wrapped output that differs from the input string
2. **Basic color fallback** -- `createTheme()` in a terminal with only basic ANSI color support (chalk Level 1 or 2, TTY true) returns `mode: "basic"` and produces ANSI-wrapped output
3. **No-color via flag** -- `createTheme({ noColor: true })` returns `mode: "none"` and all ten style functions return the input string unchanged (identity)
4. **No-color via env var** -- `createTheme()` with `CHALK_DISABLE` set to any truthy value returns `mode: "none"` with identity function behavior. `NO_COLOR` also disables color (handled by chalk v5 internally, setting its Level to 0).
5. **No-color via pipe** -- `createTheme()` when `process.stdout.isTTY` is `false` returns `mode: "none"` with identity function behavior
6. **JSON mode forces no-color** -- `createTheme({ json: true })` returns `mode: "none"` regardless of terminal capability or TTY state
7. **Priority chain correct** -- `--no-color` flag overrides `CHALK_DISABLE` env var; `CHALK_DISABLE` overrides non-TTY detection; non-TTY overrides chalk level. A signal higher in the chain always wins over lower signals
8. **Theme immutability** -- The object returned by `createTheme()` is frozen; adding, modifying, or deleting properties is silently rejected and the theme's mode string cannot be changed after creation
9. **Text style output** -- bold, dim, and italic produce ANSI-wrapped output in full and basic modes, and return the input unchanged in no-color mode
10. **Mode logged on creation** -- Each `createTheme()` call logs the detected mode once with format `[INFO] Color mode: full|basic|none`

---

## Anti-Goals

1. **NOT a general-purpose chalk wrapper** -- Only exposes the semantic palette and styles needed by Aegis Terminal UI features, not all chalk capabilities (strikethrough, underline, inverse, background colors, etc.)
2. **NOT a user-customizable theme system** -- Palette is fixed and immutable; no user overrides of color mappings, no config file for colors, no `aegis config color.error blue` support
3. **NOT a gradient or effect renderer** -- Gradient-string is a separate feature (part of the dashboard banner, F-028); the Color Manager does not provide gradients, rainbows, animations, or any multi-color effects
4. **NOT a terminal capability reporter** -- No `aegis --color-info` or similar diagnostic command; color mode is logged internally but not exposed as a user-facing inspection command
5. **NOT a cross-process color pipeline** -- Colors are computed and rendered in-process; no IPC, no serialization of styled strings across process boundaries, no color data in the prompt template output
6. **NOT an image renderer** -- No support for Sixel, Kitty, iTerm2 native image protocols, or any bitmap rendering inside terminal output
7. **NOT a global chalk modifier** -- The Color Manager does not modify the global chalk instance or chalk level; it creates scoped chalk instances so other code in the same process using chalk directly is unaffected
8. **NOT responsible for ANSI stripping in non-Aegis output** -- The Color Manager only strips ANSI from strings passed through its style functions; it does not scan or sanitize output from external commands or libraries

---

## Measurable Outcomes

| Metric | Target | How Measured |
|--------|--------|-------------|
| Semantic color coverage | 7/7 semantic colors produce correct ANSI output per mode | Integration tests with ANSI assertion helpers |
| Text style coverage | 3/3 text styles produce correct output per mode | Integration tests for bold, dim, italic |
| Mode detection accuracy | 100% correct mode for all 12 combinations of Level, TTY, env, and flag | Integration tests covering the full mode detection matrix |
| No-color pass-through | All 10 style functions return input identity in no-color mode | Unit tests comparing input and output with `===` |
| Theme immutability | Frozen theme rejects all mutations without error | Unit test with `Object.isFrozen` and mutation attempts (add, modify, delete) |
| Mode logging | Exactly 1 log call per `createTheme()` invocation | Spy assertion on logging function; assert no additional log calls from style functions |
| Mutation score | >= 80% | Stryker mutation testing on `createTheme.ts` and `styles.ts` |

---

*Last updated: 2026-07-02. Status: Draft. Part of ANSDLC Phase 5A (Specification).*
