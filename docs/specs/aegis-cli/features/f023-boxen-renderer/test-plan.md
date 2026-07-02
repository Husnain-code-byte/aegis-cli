# Test Plan -- F-023: Boxen Renderer (Bordered Containers)

## Verification Architecture

### Test Stack

| Layer | Framework | Scope | File Pattern |
|-------|-----------|-------|-------------|
| Unit | Vitest | Pure functions: createBox, render, renderSection, renderPrompt, border style mapping, mode-aware behavior | `src/ui/**/*.test.ts` |
| Integration | Vitest | Full boxen v8.0.1 integration with controlled Theme: mode detection, border styles, padding, multi-line, all color modes | `tests/integration/boxen-renderer.test.ts` |
| Property-based | fast-check (via Vitest) | Invariants over string inputs: no-color identity, output contains input, deterministic output, valid box structure | `src/ui/**/*.property.test.ts` |
| Mutation | Stryker | All production code under `src/ui/boxen-renderer/` | `src/ui/boxen-renderer/**/*.ts` (mutants) |

### Test Layers

```
+---------------------------------------------------------------+
|                 Property-Based Tests                           |
|  Invariants: output contains input, no ANSI in no-color mode, |
|  deterministic output, valid box structure for all strings,   |
|  no border characters for borderStyle 'none'                  |
+---------------------------------------------------------------+
|                 Integration Tests                              |
|  Boxen v8.0.1 with real boxen import, Theme mock,            |
|  full/basic/none mode rendering, all 5 border styles,        |
|  all 6 borderColor values, 3 titleColor values,              |
|  renderSection and renderPrompt output verification           |
+---------------------------------------------------------------+
|                 Unit Tests                                     |
|  createBox(theme) factory, option defaults,                   |
|  border style name-to-boxen mapping,                         |
|  mode-to-rendering-strategy mapping,                         |
|  borderColor semantic-to-theme-function resolution,          |
|  edge option combinations                                    |
+---------------------------------------------------------------+
```

---

## Test Type Details

### 1. Unit Tests

Test the BoxRenderer factory and individual rendering strategies in isolation. Boxen itself is mocked at the module level for unit tests -- the integration tests verify real boxen behavior.

| Module | Test Subject | What to Test |
|--------|-------------|-------------|
| `createBox.ts` | Factory function | Returns a BoxRenderer object with render, renderSection, renderPrompt methods |
| `createBox.ts` | Theme acceptance | Throws on null/undefined theme; accepts valid Theme; rejects missing style functions |
| `createBox.ts` | Theme immutability | Does not mutate the theme object it receives |
| `createBox.ts` | Return type | Returns object with exactly 3 function properties: render, renderSection, renderPrompt |
| `render.ts` | Option defaults | No options → borderStyle: 'single', padding: 1, borderColor: 'muted' |
| `render.ts` | Mode 'none' strategy | Delegates to ASCII border renderer, passes content and options |
| `render.ts` | Mode 'basic' strategy | Delegates to boxen with borderStyle but suppresses border color |
| `render.ts` | Mode 'full' strategy | Delegates to boxen with full styling, resolves borderColor via theme |
| `render.ts` | borderStyle mapping | Each string name ('single', 'double', 'round', 'bold', 'none') maps to correct boxen borderStyle value |
| `render.ts` | borderColor resolution | Each semantic name ('error', 'warning', 'success', 'info', 'phase', 'muted') resolves to correct theme function |
| `render.ts` | titleColor resolution | Each semantic name ('phase', 'info', 'muted') resolves to correct theme function |
| `render.ts` | padding passthrough | Padding value is passed to boxen correctly |
| `render.ts` | title passthrough | Title string is passed to boxen correctly |
| `renderSection.ts` | Title position | Calls render with title set and content forwarded |
| `renderSection.ts` | Options merge | Accepts additional options and merges with the title option |
| `renderPrompt.ts` | Pre-styled defaults | Calls render with hardcoded options: borderStyle 'double', borderColor 'info' |
| `renderPrompt.ts` | No options accepted | Ignores or does not accept user-provided options (single param only) |
| `ascii-renderer.ts` | ASCII border rendering | Produces `+`, `-`, `|` borders with correct width based on content and padding |
| `ascii-renderer.ts` | ASCII padding | Respects padding option in ASCII mode |
| `ascii-renderer.ts` | ASCII multi-line | Handles multi-line content with ASCII borders |
| `ascii-renderer.ts` | ASCII empty content | Produces valid minimal ASCII box for empty input |
| `ascii-renderer.ts` | ASCII no extras | Output contains no box-drawing characters (`---`, `|||`, `+++`) |

### 2. Integration Tests

Real boxen v8.0.1 integration with a controlled Theme object. These tests verify that the renderer produces correct visual output.

**Test Harness Interface:**
```typescript
interface BoxenRendererTestHarness {
  createBox(theme: Theme): BoxRenderer;
  createTheme(mode: 'full' | 'basic' | 'none', styleFn?: (s: string) => string): Theme;
  captureOutput(): string[];
  reset(): void;
}

function setupBoxenRendererTest(): BoxenRendererTestHarness;
```

**Test Pattern (each integration test):**
1. Create a fresh harness
2. Create a Theme with desired mode and style function behavior
3. Create a BoxRenderer via `createBox(theme)`
4. Call render/renderSection/renderPrompt with specific content and options
5. Assert on the output string: border characters, content presence, ANSI presence/absence, structure
6. Reset harness for next test

**Output Verification Helpers:**
```typescript
function hasAnsiCodes(output: string): boolean {
  return /\x1b\[/.test(output);
}

function hasNoAnsiCodes(output: string): boolean {
  return !/\x1b\[/.test(output);
}

function getFirstChar(output: string): string {
  return output.trimStart()[0];
}

function getLastChar(output: string): string {
  return output.trimEnd()[output.trimEnd().length - 1];
}

function getContentLine(output: string, lineIndex: number): string {
  return output.split('\n')[lineIndex];
}

function getBorderCharacterSet(output: string): BorderStyle {
  // Inspect first/last line to determine which border style was used
}
```

**Mode Integration Test Matrix:**

| # | Mode | Content | Expected Border Chars | Expected ANSI |
|---|------|---------|----------------------|---------------|
| 1 | full | "Hello" | Unicode box (single default) | Present |
| 2 | full | "Hello" with double style | Unicode double | Present |
| 3 | full | "Hello" with round style | Unicode round | Present |
| 4 | full | "Hello" with bold style | Unicode bold | Present |
| 5 | full | "Hello" with none style | No border | Present (content only) |
| 6 | basic | "Hello" | Unicode box (single) | Absent on border lines |
| 7 | basic | "Hello" with double style | Unicode double | Absent on border lines |
| 8 | none | "Hello" | ASCII (+ - \|) | Absent entirely |
| 9 | none | "Hello" with double style | ASCII (+ - \|) | Absent entirely (mode overrides style) |
| 10 | none | "Hello" with none style | No border | Absent entirely |

### 3. Property-Based Tests

Using `fast-check` to verify invariants across generated string inputs. Each property runs a minimum of 100 iterations per run.

| Property | Input Generator | Invariant |
|----------|---------------|-----------|
| **No-color ANSI absence (P001)** | `fc.string()` including empty, unicode, emoji, whitespace, control chars | `forAll s: render(s, themeNone).hasNoAnsi()` -- no ANSI escape sequences in output when mode is 'none' |
| **Output contains input (P002)** | `fc.string({ minLength: 1 })` + all 3 modes | `forAll s, m: render(s, theme(m)).contains(s)` -- the original content string appears in the output for all modes |
| **Deterministic output (P003)** | `fc.string()` + all 5 borderStyles + padding 0-5 | `forAll s, opts: render(s, opts) === render(s, opts)` -- same input always produces same output |
| **Box structure validity (P004)** | `fc.string()` + all 3 modes | `forAll s, m: firstChar(render(s, m)) === expectedFirstChar(m)` and `lastChar(render(s, m)) === expectedLastChar(m)` -- output starts and ends with expected border character for the mode |
| **No border for 'none' style (P005)** | `fc.string()` + all 3 modes | `forAll s, m: render(s, { borderStyle: 'none' }, m)` contains no box-drawing characters from any border set |
| **Content line count (P006)** | `fc.string({ minLength: 1 })` with `\n` included | `forAll s: countContentLines(render(s)) >= countNewlines(s) + 1` -- every content line produces a corresponding padded output line |
| **Empty string minimal box (P007)** | `fc.constant("")` + all 3 modes | `forAll m: lines(render("", theme(m))).length >= 3` -- empty content still produces top border, padded line, bottom border |

**Property execution requirements:**
- Minimum 100 iterations per property per CI run
- No `.filter()` to exclude edge cases that would cause failures
- Properties must be independently runnable (not dependent on test order)
- Unicode surrogate pairs, emoji sequences, and bidirectional text must not cause property failures

### 4. Mutation Testing

Using Stryker with the following configuration:

| Parameter | Value |
|-----------|-------|
| Test runner | Vitest |
| Mutator plugins | TypeScript |
| Threshold | >= 80% mutation score |
| Target files | `src/ui/boxen-renderer/` |
| Ignore | Type definitions, test files, configuration files, re-export index.ts |
| CI enforcement | Build fails if score < 80% |

**Critical Mutations That Must Be Caught:**

| Mutation Type | Example | Why It Must Be Caught |
|--------------|---------|----------------------|
| Mode check inverted | `mode === 'none'` changed to `mode !== 'none'` | ANSI codes leak into piped output; ASCII fallback never activates |
| Default border style changed | `'single'` changed to `'round'` | Section visual language breaks; all output uses wrong style |
| Default borderColor changed | `'muted'` changed to `'error'` | All default boxes render in red instead of muted gray |
| Default padding changed | `padding: 1` changed to `padding: 0` | Content hugs borders; visual consistency breaks |
| Border color function not called | Remove `theme.phase(text)` call | Border rendered without color in full mode |
| ASCII fallback uses box chars | Render '+' as '---' in none mode | ANSI-free output still contains Unicode characters |
| renderSection title omitted | Remove title parameter from boxen call | Title never appears in top border |
| renderPrompt style changed | `borderStyle: 'double'` changed to `'single'` | Prompt display loses visual distinction from other boxes |
| Multi-line handling broken | `content.split('\n')` removed or wrong | Newlines raw in output, padding breaks |
| borderStyle 'none' still renders border | Remove early return for 'none' | Content gets box-drawing characters when 'none' requested |
| Error thrown on empty content | `if (!content) throw` instead of rendering minimal box | Empty content crashes instead of rendering valid empty box |

---

## Test Inventory

### Gherkin Scenario Mapping

| # | Gherkin Scenario | Test IDs | Type | Key Assertions |
|---|-----------------|----------|------|---------------|
| 1 | Default render uses single border, padding 1, muted color | T001 | Integration | Output starts with "---", ends with "++", contains "| Ready |", has ANSI |
| 2 | Custom border style "double" | T002 | Integration | Output starts with "+++", ends with "++", contains "|| Ready ||" |
| 3 | Custom border style "round" | T003 | Integration | Output starts with "++", ends with "++", contains "| Ready |" |
| 4 | Custom border style "bold" | T004 | Integration | Output starts with "++", ends with "++", contains "|| Ready ||" |
| 5 | borderStyle "none" no border | T005 | Integration | No box-drawing chars, content with padding only |
| 6 | renderSection with title | T006 | Integration | Title in top border line, content in middle |
| 7 | renderPrompt pre-styled double border | T007 | Integration | Starts with "+++", has ANSI, contains content |
| 8 | No-color mode ASCII borders | T008 | Integration | Starts with "+", uses "|", no ANSI |
| 9 | Basic mode box chars without color | T009 | Integration | Uses "---" / "|||", border lines have no ANSI |
| 10 | Multi-line content preserves line breaks | T010 | Integration | 3 content lines, each padded consistently |
| 11 | Custom padding value | T011 | Integration | Padding 3 produces 3 spaces around content |
| 12 | Empty content minimal box | T012 | Integration | 3 lines: top border, padded empty, bottom border |
| 13 | Unicode/emoji content renders | T013 | Integration | Unicode preserved, box structure intact |
| 14 | All six borderColor values | T014 | Integration | Each produces distinct ANSI-wrapped output |

### Unit Tests

| Test ID | Test Case | Type | Assertions |
|---------|-----------|------|------------|
| U001 | createBox with valid theme | Unit | Returns object with render, renderSection, renderPrompt as functions |
| U002 | createBox with null theme | Unit | Throws TypeError with descriptive message |
| U003 | createBox with undefined theme | Unit | Throws TypeError |
| U004 | createBox with theme missing mode | Unit | Throws or gracefully defaults (document behavior) |
| U005 | createBox does not mutate theme | Unit | Theme functions and mode unchanged after createBox call |
| U006 | render with no options uses defaults | Unit | Options defaults: borderStyle 'single', padding 1, borderColor 'muted' |
| U007 | render with empty options object | Unit | Same behavior as no options |
| U008 | render with partial options | Unit | Provided options override defaults, missing options use defaults |
| U009 | render with undefined content | Unit | Coerces to "undefined" string, renders box normally |
| U010 | borderColor 'phase' maps to theme.phase | Unit | Theme spy confirms theme.phase is called for border rendering |
| U011 | borderColor 'info' maps to theme.info | Unit | Theme spy confirms theme.info is called |
| U012 | borderColor 'muted' maps to theme.muted | Unit | Theme spy confirms theme.muted is called |
| U013 | borderColor 'success' maps to theme.success | Unit | Theme spy confirms theme.success is called |
| U014 | borderColor 'warning' maps to theme.warning | Unit | Theme spy confirms theme.warning is called |
| U015 | borderColor 'error' maps to theme.error | Unit | Theme spy confirms theme.error is called |
| U016 | titleColor 'phase' maps to theme.phase for title | Unit | Theme spy confirms theme.phase called for title text |
| U017 | titleColor 'info' maps to theme.info for title | Unit | Theme spy confirms theme.info called for title text |
| U018 | titleColor 'muted' maps to theme.muted for title | Unit | Theme spy confirms theme.muted called for title text |
| U019 | renderSection merges title into options | Unit | Title passed as boxen 'title' option |
| U020 | renderPrompt hardcodes borderStyle 'double' | Unit | Always renders with double border regardless of caller options |
| U021 | renderPrompt hardcodes borderColor 'info' | Unit | Always renders with info-colored border |
| U022 | ASCII renderer with single line content | Unit | Produces +---+ style box with correct width |
| U023 | ASCII renderer with multi-line content | Unit | Each content line has correct padding |
| U024 | ASCII renderer with padding 0 | Unit | No extra spaces, minimal width |
| U025 | ASCII renderer with empty content | Unit | Produces valid minimal ASCII box |

### Integration Tests

| Test ID | Test Case | Type | Assertions |
|---------|-----------|------|------------|
| T001 | Default render in full mode | Integration | Single border chars, ANSI present, content preserved |
| T002 | Double border style in full mode | Integration | Double border chars, ANSI present |
| T003 | Round border style in full mode | Integration | Round corner chars, ANSI present |
| T004 | Bold border style in full mode | Integration | Bold border chars, ANSI present |
| T005 | No border style in full mode | Integration | No border chars, ANSI might be in content |
| T006 | renderSection with title in full mode | Integration | Title in top border line, content preserved |
| T007 | renderPrompt in full mode | Integration | Double border, ANSI present, content preserved |
| T008 | No-color mode ASCII fallback | Integration | ASCII borders (+ - |), no ANSI anywhere |
| T009 | Basic mode box without border color | Integration | Box chars, no ANSI on border lines |
| T010 | Multi-line content handling | Integration | All lines preserved, consistent padding |
| T011 | Custom padding value | Integration | Correct spacing based on padding value |
| T012 | Empty content rendering | Integration | Valid 3-line box structure |
| T013 | Unicode/emoji in content | Integration | Unicode characters preserved, box intact |
| T014 | All six borderColor values | Integration | Each produces output with ANSI codes in full mode |
| T015 | renderSection with long title | Integration | Title appears in top border, truncation by boxen is acceptable |
| T016 | renderPrompt shows no extra options | Integration | renderPrompt(content) only, no options param accepted |
| T017 | Padding 0 renders no extra spacing | Integration | Content directly adjacent to border, no blank lines |
| T018 | Padding 5 renders wide spacing | Integration | 5 spaces on each side, 5 blank lines above/below |
| T019 | renderSection with empty title | Integration | Empty string title renders box without title in border |
| T020 | renderSection with empty content | Integration | Valid box with title in border and empty content area |
| T021 | Mode 'none' with borderStyle 'double' | Integration | ASCII borders used despite double setting (mode overrides) |
| T022 | Mode 'basic' with all five borderStyles | Integration | Each borderStyle produces correct character set, no color on borders |
| T023 | Content with leading/trailing newlines | Integration | Extra blank lines inside box are padded correctly |
| T024 | Content with only whitespace | Integration | Whitespace preserved inside box |
| T025 | Color mode switch between renders | Integration | Two render calls with different themes produce correct output per mode |

### Property-Based Tests

| Test ID | Property | Generator | Invariant | Runs |
|---------|----------|-----------|-----------|------|
| P001 | No-color mode has no ANSI | `fc.string()` | `forall s: hasNoAnsi(render(s, themeNone))` | >= 100 |
| P002 | Output contains original content | `fc.string({ minLength: 1 })` | `forall s: output contains s` | >= 100 |
| P003 | Deterministic output | `fc.string()`, `fc.constantFrom('single','double','round','bold','none')` | `forall s, bs: render(s, bs) === render(s, bs)` | >= 100 |
| P004 | Valid box structure per mode | `fc.string()`, `fc.constantFrom('full','basic','none')` | `forall s, m: firstChar matches m and lastChar matches m` | >= 100 |
| P005 | No border chars for 'none' style | `fc.string()`, `fc.constantFrom('full','basic','none')` | `forall s, m: borderChars(render(s,{none}))` is empty | >= 100 |
| P006 | Content line count matches input | `fc.string()` | `forall s: contentLines >= split(s).length` | >= 100 |
| P007 | Empty string produces at least 3 lines | `fc.constant("")`, all 3 modes | `forall m: lines(render("", theme(m))).length >= 3` | >= 100 |

---

## Mocking Strategy

### Boxen v8.0.1 (ESM)

Boxen v8.0.1 is ESM-only. The unit tests mock it; integration tests use the real import.

| Approach | Mechanism | Used In |
|----------|-----------|---------|
| **vi.mock('boxen', ...)** | Mock the entire ESM boxen module. Return a spy that records calls and returns a predictable string. | Unit tests for option mapping, default behavior |
| **vi.importActual('boxen')** | Import the real boxen for integration tests. Must use dynamic import or ESM-compatible test config. | Integration tests for visual output verification |

**Unit test mock pattern:**
```typescript
import { vi } from 'vitest';
const mockBoxen = vi.fn((text, opts) => `[boxen: ${text}, style: ${opts.borderStyle}]`);
vi.mock('boxen', () => ({ default: mockBoxen }));

// After each test
afterEach(() => {
  mockBoxen.mockClear();
});
```

**Integration test pattern (real boxen):**
```typescript
// Dynamic import for ESM
const boxen = await import('boxen');
// Used indirectly through render() -- we test the output, not boxen calls
```

### Theme Object

Theme mocks are created per test to simulate specific modes.

```typescript
function createMockTheme(mode: 'full' | 'basic' | 'none', colorize = true): Theme {
  const wrap = colorize
    ? (s: string) => `\x1b[31m${s}\x1b[0m`  // Simple ANSI wrap
    : (s: string) => s;                         // Identity

  return {
    mode,
    error: wrap,
    warning: wrap,
    success: wrap,
    info: wrap,
    phase: wrap,
    muted: wrap,
    heading: wrap,
    bold: wrap,
    dim: wrap,
    italic: wrap,
  };
}
```

For spy-based assertions (verifying which theme function is called):
```typescript
function createSpyTheme(mode: 'full' | 'basic' | 'none'): Theme & { spies: Record<string, ReturnType<typeof vi.fn>> } {
  const spies = {
    error: vi.fn((s: string) => s),
    warning: vi.fn((s: string) => s),
    success: vi.fn((s: string) => s),
    info: vi.fn((s: string) => s),
    phase: vi.fn((s: string) => s),
    muted: vi.fn((s: string) => s),
    heading: vi.fn((s: string) => s),
    bold: vi.fn((s: string) => s),
    dim: vi.fn((s: string) => s),
    italic: vi.fn((s: string) => s),
  };

  return { mode, ...spies, spies };
}
```

### ASCII Renderer

The ASCII renderer is a separate module that handles `mode === 'none'`. It can be tested independently from boxen.

```typescript
// ASCII renderer module (internal, not exported)
function renderAsciiBox(content: string, options: BoxOptions): string {
  // Pure function: no boxen, no chalk, no theme
  // Produces:
  // +-------+
  // | Hello |
  // +-------+
}
```

---

## Edge Cases Beyond Gherkin

### String and Content Edge Cases

| Edge Case | Input | Expected Behavior | Test ID |
|-----------|-------|-------------------|---------|
| Null content | `null` | Coerces to "null" string, renders box normally | U009 |
| Undefined content | `undefined` | Coerces to "undefined" string, renders box normally | U009 |
| Very long content (10k+ chars) | `"a".repeat(10000)` | Box renders without performance degradation, box width matches longest line | P003 |
| Content with existing ANSI codes | `"\x1b[31mred\x1b[0m"` | Existing ANSI preserved inside box | P002 |
| Content with tabs | `"col1\tcol2"` | Tabs rendered as-is by boxen (caller should expand if needed) | P002 |
| Content with only newlines | `"\n\n\n"` | Empty lines inside box, consistent padding | T023 |
| Mixed CJK and Latin | `"Hello 世界"` | Correct width calculation (boxen uses string length, not display width) | T013 |
| Title longer than content | title: "A very long title here", content: "Hi" | Box width expands to accommodate title | T015 |
| Title with special characters | title: "Phase [5A]" | Title rendered as-is in top border | T006 |

### Mode Transition Edge Cases

| Edge Case | Scenario | Expected Behavior | Test ID |
|-----------|----------|-------------------|---------|
| Mode 'none' with all borderStyles | All 5 styles in no-color mode | All produce ASCII borders (mode overrides style) | T021 |
| Mode 'basic' with borderColor | borderColor 'error' in basic mode | Box chars used, no ANSI on borders | T022 |
| Theme mode changed after createBox | Theme mutated externally | No effect (renderer reads mode at call time, or stores reference) | U004 |
| Two renderers with different themes | Same createBox call, different themes | Each renderer produces correct mode-specific output | T025 |

### Box Structure Edge Cases

| Edge Case | Scenario | Expected Behavior | Test ID |
|-----------|----------|-------------------|---------|
| Padding 0 | `padding: 0` | No blank lines, content flush with borders horizontally | T017 |
| Negative padding | `padding: -1` | Clamp to 0 or throw (decide at implementation, document) | U009 edge |
| Float options not exposed | Attempting float/align/dimBorder | Not part of BoxOptions; no effect if passed (TypeScript rejects) | Anti-goal |
| renderSection called as render | `renderer.render(sectionTitle, content)` | Only 2 params; treated as render(content, options) | API contract |

### Concurrency and State

| Edge Case | Scenario | Expected Behavior |
|-----------|----------|-------------------|
| Synchronous only | All render calls | No async behavior; render called from Promise chain works synchronously |
| Shared global boxen state | Multiple imports of boxen | boxen v8 is a pure function; no global state concerns |
| Theme passed to multiple renderers | Single Theme used by many BoxRenderer instances | Stateless read-only access; safe by construction |

---

## Verification Gates

All gates must pass before F-023 is considered complete. Gates are ordered -- stop at the first failure.

### Gate 1: TypeScript Compilation (Strict Mode)

```
$ pnpm typecheck
> No errors in src/ui/boxen-renderer/
```

Requirements:
- TypeScript strict mode enabled
- All exported BoxRenderer interface types explicit
- `BoxOptions`, `BoxRenderer`, and `createBox` have fully typed signatures
- No `any` types in renderer source files
- No `@ts-ignore` or `@ts-expect-error` in production code

### Gate 2: Unit Tests Pass

```
$ pnpm test:unit -- --run src/ui/boxen-renderer/
> PASS  All unit tests
```

Requirements:
- All unit tests (U001-U025) pass
- Coverage threshold: >= 90% statements, >= 80% branches
- Test files in `src/ui/boxen-renderer/__tests__/*.test.ts`
- Every render function tested in at least one mode
- All six borderColor values verified via theme spy
- Border style name mapping fully covered

### Gate 3: Integration Tests Pass

```
$ pnpm test -- --run tests/integration/boxen-renderer.test.ts
> PASS  All integration tests
```

Requirements:
- All integration tests (T001-T025) pass
- Covers all 14 Gherkin scenarios
- All 5 border styles verified with actual boxen output
- All 3 color modes verified with actual character output
- Multi-line, empty content, unicode verified with real boxen
- renderSection and renderPrompt verified for structural correctness

### Gate 4: Property-Based Tests Pass

```
$ pnpm test:property -- --run src/ui/boxen-renderer/
> PASS  All property tests
```

Requirements:
- All property-based tests (P001-P007) pass
- Minimum 100 runs per property
- No flaky tests (3 consecutive CI runs green with >= 100 iterations each)
- Unicode, emoji, and edge string inputs do not cause property failures
- Properties are independently runnable

### Gate 5: Mutation Score >= 80%

```
$ pnpm test:mutation
> Mutation score: >= 80%
```

Requirements:
- Stryker mutates all production code under `src/ui/boxen-renderer/`
- Threshold: >= 80% mutation score (killed mutants / total mutants)
- All surviving mutants reviewed and either:
  - Accepted as equivalent mutants, documented in `mutation-exemptions.md`
  - OR new test case added to kill the mutant
- Pipeline fails if score < 80%

### Gate 6: All Gherkin Scenarios Executable

```
$ pnpm test:specs -- f023-boxen-renderer
> PASS  All 14 scenarios pass
```

Requirements:
- Gherkin scenarios are wired to test code
- Each scenario is independently runnable -- no shared state between scenarios
- Scenario-to-test mapping is documented and kept in sync with the feature file

---

## Test File Structure

```
src/ui/boxen-renderer/
  createBox.ts               # Factory: createBox(theme) => BoxRenderer
  render.ts                  # render() implementation: delegates to boxen or ASCII renderer per mode
  renderSection.ts           # renderSection(): wraps render(title + content)
  renderPrompt.ts            # renderPrompt(): pre-styled render call
  ascii-renderer.ts          # ASCII border renderer for mode 'none'
  types.ts                   # BoxOptions, BoxRenderer interfaces
  index.ts                   # Re-exports public API

  __tests__/
    createBox.test.ts         # U001-U005: factory function, error handling, immutability
    render.test.ts            # U006-U018: option defaults, border style mapping, color resolution
    renderSection.test.ts     # U019: section rendering with title
    renderPrompt.test.ts      # U020-U021: pre-styled prompt rendering
    ascii-renderer.test.ts    # U022-U025: ASCII border rendering

    render.property.test.ts     # P001-P007: property invariants

tests/integration/
  boxen-renderer.test.ts     # T001-T025: full integration with boxen and Theme

tests/mutation/
  stryker.config.json        # Stryker configuration (targets, thresholds, ignore patterns)
```

---

## Scenario-to-Test Mapping

| # | Gherkin Scenario | Test IDs | Type | Verification Gate |
|---|-----------------|----------|------|-------------------|
| 1 | Default render single border, padding 1, muted color | T001, U006, U007 | Integration + Unit | Gate 3 + 2 |
| 2 | Custom border style "double" | T002, U010 (partial) | Integration | Gate 3 |
| 3 | Custom border style "round" | T003 | Integration | Gate 3 |
| 4 | Custom border style "bold" | T004 | Integration | Gate 3 |
| 5 | borderStyle "none" no border | T005, P005 | Integration + Property | Gate 3 + 4 |
| 6 | renderSection with title | T006, U019 | Integration + Unit | Gate 3 + 2 |
| 7 | renderPrompt pre-styled double border | T007, U020, U021 | Integration + Unit | Gate 3 + 2 |
| 8 | No-color mode ASCII borders | T008, T021, P001 | Integration + Property | Gate 3 + 4 |
| 9 | Basic mode box without color | T009, T022 | Integration | Gate 3 |
| 10 | Multi-line content preserves line breaks | T010, P006 | Integration + Property | Gate 3 + 4 |
| 11 | Custom padding value | T011, T017, T018 | Integration | Gate 3 |
| 12 | Empty content minimal box | T012, P007 | Integration + Property | Gate 3 + 4 |
| 13 | Unicode/emoji content renders | T013 | Integration | Gate 3 |
| 14 | All six borderColor values | T014, U010-U015 | Integration + Unit | Gate 3 + 2 |
| -- | Edge: long title, whitespace, null content | T015, T023, T024, U009 | Integration + Unit | Gate 3 + 2 |
| -- | Defaults and option handling | U006-U009 | Unit | Gate 2 |
| -- | Color mode transitions | T025 | Integration | Gate 3 |
| -- | Property invariants | P001-P007 | Property | Gate 4 |
| -- | ASCII renderer standalone | U022-U025 | Unit | Gate 2 |

---

## Dependencies and Mocking

### External Dependencies (to mock in unit tests)

| Dependency | Reason to Mock | Mock Strategy |
|-----------|---------------|--------------|
| `boxen` (v8.0.1, ESM) | Tests need to verify options passed, not actual rendering | `vi.mock('boxen', () => ({ default: vi.fn() }))` -- capture call args |
| Theme functions | Verify correct semantic function is called for each color option | Theme spy functions via `vi.fn()` |

### External Dependencies (NOT to mock)

| Dependency | Reason |
|-----------|--------|
| `boxen` in integration tests | Integration tests need real boxen output to verify border characters, padding, layout |
| String methods (split, trim, repeat) | Core JS runtime behavior; never mock |
| ANSI escape sequences | Tests verify real ANSI codes are present/absent -- not mocked |

---

## Assumptions and Open Questions

### Assumptions

1. **Boxen v8.0.1 border style names:** boxen v8 supports 'single', 'double', 'round', 'bold' as built-in border style names. The `'none'` style is not native to boxen -- the renderer handles it by not calling boxen or by passing an empty border definition.

2. **Title rendering:** boxen v8 natively supports a `title` option that centers the title text in the top border. The renderer passes this through directly. No custom title positioning logic is needed.

3. **Color passthrough:** boxen v8's `borderColor` option accepts a chalk color name (string) that boxen resolves internally via chalk. When the renderer resolves a semantic color name to a theme function, it must pass the resulting chalk-wrapped string or equivalent color reference to boxen.

4. **Mode 'none' bypasses boxen entirely:** In no-color mode, the renderer must produce ASCII borders without importing or calling boxen at all. This ensures no ANSI codes can leak through boxen's rendering pipeline.

5. **Mode 'basic' uses boxen without border color:** In basic mode, boxen is called with the specified border style but without any `borderColor` option. The content inside may use basic ANSI colors if the theme provides them, but border lines are plain.

6. **Synchronous rendering:** All three render functions are synchronous. No async behavior, no promise returns, no callbacks. The output is a complete string ready for stdout.

7. **renderPrompt ignores caller options:** `renderPrompt(content)` accepts only content, not options. Any attempt to pass options TypeScript-compile-time error for type safety. The pre-styled configuration is hardcoded.

8. **Single-line and multi-line content:** Boxen handles `\n` characters by splitting into lines and rendering each line with consistent padding. The renderer does not perform any line splitting or wrapping.

### Open Questions

1. **Mode 'none' and title rendering:** When `theme.mode === 'none'`, should `renderSection` still include the title in the ASCII border? Resolution: Yes -- the title is a structural element. In ASCII mode, the title appears in the top border line with ASCII characters (e.g., `+-- Status --+`).

2. **Boxen borderColor interface:** How does boxen v8 accept border colors? Does it accept a Chalk instance, a string name, or a hex color? Resolution: boxen v8's `borderColor` accepts a chalk-compatible color name string (e.g., 'red', '#ff0000'). The renderer must map semantic names to color name strings that boxen understands, or extract the color from the theme function's chalk instance. Settle this implementation detail during design.

3. **ASCII renderer for mode 'none':** Should the ASCII renderer be a separate module or inline in render.ts? Resolution: Separate module (`ascii-renderer.ts`) for independent testability and clean separation of concerns.

4. **borderStyle 'none' in mode 'none':** When both borderStyle is 'none' and mode is 'none', should the output be completely unstyled content with no borders and no padding? Resolution: borderStyle 'none' removes borders but preserves padding. Mode 'none' uses ASCII characters for borders. When both are active, no borders and no ANSI codes -- just padded content. The behavior is additive: 'none' style takes priority over border rendering, 'none' mode strips ANSI.

5. **Handling of very long single-line content:** If a single line of content is very long (exceeding terminal width), boxen does not wrap it. The caller is responsible for wrapping. Should the renderer add a warning? Resolution: No. The renderer is a pure formatting function. Content preparation is the caller's responsibility. Document this in the interface contract.

6. **Boxen ESM import in unit tests:** Since boxen v8 is ESM-only, `vi.mock('boxen', ...)` must use ESM-compatible pattern. With Vitest, this works via `vi.mock` at the top level. Verify that Vitest's ESM handling is configured correctly for the project.

---

*Last updated: 2026-07-02. Status: Draft. Part of ANSDLC Phase 5A (Specification).*
