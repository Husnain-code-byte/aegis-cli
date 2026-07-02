# F-026 -- Terminal Size Detection (Terminal UI Subsystem)

> Amazon Working Backwards format. Detects terminal width/height for responsive layout decisions in the dashboard and other UI features.
> Build Order #8: foundation for responsive Terminal UI features (F-025 Phase Progress Bar, F-028 Dashboard Layout). Appetite: Small (1-2 AI sessions).

---

## Press Release

**Aegis CLI -- Terminals of Every Size, Beautifully Rendered**

Aegis now detects your terminal dimensions automatically and adapts its layout to fit. Whether you are on a wide 120-column terminal with room for side-by-side sections or a narrow 40-column mobile SSH session, every dashboard, progress bar, and status display fits the available space without horizontal scrollbars, broken alignment, or truncated text.

Resize your terminal while Aegis is running and the next `getSize()` call picks up the new dimensions within 100 milliseconds -- fast enough that layout reflects the current window state without polling or unnecessary I/O. Pipe output through a pager like `less` and the detection degrades gracefully: Aegis detects that stdout is not a terminal and falls back to the standard 80x24 default dimensions.

Two helper functions make responsive layout simple: `isNarrow(size)` returns `true` when the terminal has fewer than 60 columns, signaling that features should switch to a compact layout. `isWarnNarrow(size)` returns `true` below 50 columns, signaling that even the compact layout may not render correctly and a warning should be shown.

Terminal size detection is invisible by design. Every rendering feature in Aegis uses `getSize()` to make layout decisions. No feature hard-codes width assumptions. One change in terminal width cascades through the entire CLI -- no configuration, no flags, no manual adjustment.

---

## FAQ

### Q: How does Aegis detect terminal size?

A: The detection uses a two-tier fallback chain:

1. **Primary** -- `process.stdout.columns` and `process.stdout.rows` (available since Node.js 0.x). When stdout is connected to a TTY, these return the current terminal dimensions.
2. **Fallback** -- `process.stderr.columns` and `process.stderr.rows`. Used when stdout is not a TTY but stderr is (e.g., stdout piped to a file while stderr still goes to the terminal).
3. **Default** -- `{ columns: 80, rows: 24, isTTY: false }`. Returned when neither stdout nor stderr is connected to a TTY.

The `isTTY` field in the result indicates whether a real terminal was detected.

### Q: How does caching work?

A: `getSize()` caches the detected size after the first call. Subsequent calls within a 100ms debounce window return the cached value without re-probing `process.stdout`/`process.stderr`. This prevents unnecessary work during rapid layout recalculations.

If more than 100ms has elapsed since the last detection, `getSize()` re-probes the streams to pick up terminal resize events. Pass `{ refresh: true }` to force immediate re-detection regardless of the debounce window.

### Q: What happens when the terminal is resized?

A: Terminal resize events update `process.stdout.columns` and `process.stdout.rows` automatically on most platforms. The next `getSize()` call that occurs after the 100ms debounce window elapses picks up the new dimensions. There is no SIGWINCH listener or polling -- the detection relies on the fact that Node.js stream properties reflect the current terminal state at the time of access.

### Q: What is considered "narrow" and "warning narrow"?

A: Two helper functions provide semantic labels:

| Function | Returns `true` when | Use Case |
|----------|-------------------|----------|
| `isNarrow(size)` | `columns < 60` | Switch to compact layout (e.g., stacked sections instead of side-by-side) |
| `isWarnNarrow(size)` | `columns < 50` | Show a warning that the terminal may be too narrow for proper rendering |

The thresholds (60 and 50) are chosen to align with common terminal widths: 60 columns accommodates most compact layouts without wrapping, while 50 columns is the minimum viable width for structured output.

### Q: Does this work cross-platform?

A: Yes. `process.stdout.columns`/`.rows` work on Windows Terminal, PowerShell, CMD, Git Bash, WSL, and all Unix terminals (Linux, macOS) via the native `TIOCGWINSZ` ioctl or Windows console API that Node.js wraps internally. No platform-specific code is needed in the Aegis module -- Node.js handles the platform abstraction.

### Q: What happens if `process.stdout.columns` is undefined or zero?

A: If `process.stdout.columns` is `undefined` or `0` (possible in some non-standard environments like certain CI systems or embedded Node.js), the detection treats this the same as "not a TTY" and falls through the fallback chain: stderr if available, then the 80x24 default. The returned `isTTY` is `false` in this case.

---

## Success Criteria

1. **Stdout TTY detection** -- When `process.stdout` is connected to a TTY with known dimensions, `getSize()` returns `{ columns, rows, isTTY: true }` matching stdout's values
2. **Stderr fallback** -- When stdout is not a TTY but stderr is, `getSize()` returns stderr's dimensions with `isTTY: true`
3. **Default fallback** -- When neither stdout nor stderr is a TTY, `getSize()` returns `{ columns: 80, rows: 24, isTTY: false }`
4. **Cache debounce** -- Two `getSize()` calls within 100ms return the same cached object reference; no re-probe occurs
5. **Force refresh** -- `getSize({ refresh: true })` bypasses the cache and returns freshly detected values
6. **Cache expiry** -- A `getSize()` call more than 100ms after the last detection re-probes the streams and returns up-to-date dimensions
7. **isNarrow threshold** -- `isNarrow(size)` returns `true` for `columns < 60` and `false` for `columns >= 60`
8. **isWarnNarrow threshold** -- `isWarnNarrow(size)` returns `true` for `columns < 50` and `false` for `columns >= 50`

---

## Anti-Goals

1. **NOT a SIGWINCH listener** -- No signal handlers for terminal resize events; polling via debounced access is sufficient
2. **NOT a terminal capability reporter** -- No `aegis --term-info` or similar diagnostic command exposing columns, rows, color depth, or terminal type
3. **NOT a layout engine** -- Provides raw dimensions and narrow/warn helpers; does not compute layouts, positions, or responsive breakpoints itself
4. **NOT a cross-process size broadcaster** -- Size is detected and consumed in-process; no IPC, no file-based size sharing, no websocket broadcasts
5. **NOT a custom terminal escape sequence parser** -- Relies solely on `process.stdout.columns`/`.rows`; does not parse `\x1b[18t` or other Device Status Report sequences
6. **NOT a configurable threshold system** -- Narrow (60) and warn-narrow (50) thresholds are fixed; no user override, no config file support, no `aegis config narrow.threshold 70`

---

## Measurable Outcomes

| Metric | Target | How Measured |
|--------|--------|-------------|
| Detection accuracy (stdout) | Returns stdout columns/rows correctly in TTY mode | Integration tests with mocked stdout |
| Detection accuracy (stderr fallback) | Returns stderr columns/rows when stdout is non-TTY | Integration tests with mocked stdout/stderr |
| Default fallback correctness | 80x24 returned when both streams are non-TTY | Integration test |
| Cache hit rate | Repeated calls within 100ms return cached object (reference equality) | Integration test with timer control |
| Force refresh bypass | `{ refresh: true }` returns freshly detected object (not cached) | Integration test |
| Cache expiry after 100ms | Call after 100ms returns new detection | Integration test with `vi.advanceTimersByTime` |
| Narrow threshold | `isNarrow` matches `columns < 60` boundary exactly | Unit tests at boundaries (59, 60) |
| Warn-narrow threshold | `isWarnNarrow` matches `columns < 50` boundary exactly | Unit tests at boundaries (49, 50) |
| Mutation score | >= 80% | Stryker mutation testing on `getSize.ts` |

---

*Last updated: 2026-07-02. Status: Draft. Part of ANSDLC Phase 5A (Specification).*
