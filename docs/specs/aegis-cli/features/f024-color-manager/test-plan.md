# Test Plan -- F-024: Color Manager (Chalk Wrapper)

## Verification Architecture

### Test Stack

| Layer | Framework | Scope | File Pattern |
|-------|-----------|-------|-------------|
| Unit | Vitest | Pure functions: createTheme mode selection, style function behavior, theme immutability | `src/ui/**/*.test.ts` |
| Integration | Vitest | Full environment simulation: chalk Level mocking, env var injection, TTY detection, priority chain | `tests/integration/color-manager.test.ts` |
| Property-based | fast-check (via Vitest) | Invariants over style functions: idempotency, no-color identity, empty string, unicode safety | `src/ui/**/*.property.test.ts` |
| Mutation | Stryker | All production code under `src/ui/` | `src/ui/**/*.ts` (mutants) |

### Test Layers

```
+---------------------------------------------------------------+
|                 Property-Based Tests                           |
|  Invariants: idempotent styling, no-color identity,           |
|  empty string handling, string type preservation,             |
|  mode consistency across all functions in a theme             |
+---------------------------------------------------------------+
|                 Integration Tests                              |
|  chalk Level mocking (0/1/2/3), CHALK_DISABLE injection,     |
|  process.stdout.isTTY mocking, priority chain order,          |
|  full 12-combination mode detection matrix                    |
+---------------------------------------------------------------+
|                 Unit Tests                                     |
|  createTheme(options) mode selection,                         |
|  style function factory behavior, theme freezing,             |
|  mode logging, null/undefined options safety,                 |
|  empty option object handling                                 |
+---------------------------------------------------------------+
```

---

## Test Type Details

### 1. Unit Tests

Test createTheme and style functions in isolation with controlled chalk instance injection. No chalk mocking at the import level -- use a chalk.Instance with a controlled level, or inject a mock via an internal option.

| Module | Test Subject | What to Test |
|--------|-------------|-------------|
| `createTheme.ts` | Mode selection logic | Each combination of options (noColor, json, undefined) produces correct mode string; default options use auto-detection |
| `createTheme.ts` | Theme structure | Returned object has all 7 semantic functions, 3 style functions, and a read-only mode property |
| `createTheme.ts` | Theme freezing | `Object.isFrozen` after creation; add, set, delete are silently rejected (no throw, no effect) |
| `createTheme.ts` | Mode logging | Logger is called exactly once with `"[INFO] Color mode: full|basic|none"` |
| `createTheme.ts` | Edge options | `createTheme()` with `undefined`, `null`, or `{}` all produce identical auto-detection behavior |
| `createTheme.ts` | chalk level passthrough | chalk.level is NOT modified globally; uses scoped `chalk.Instance` with level isolation |
| `styles.ts` | Style function factory | Each style function returns ANSI-wrapped string in full/basic mode, identity in none mode |
| `styles.ts` | Style function type safety | Every function accepts `string`, returns `string` -- never throws, never returns undefined |
| `styles.ts` | Graceful degradation | Bold, dim, italic all work in full mode and basic mode without errors |

### 2. Integration Tests

Full environment simulation using controlled chalk instances, process.stdout mocking, and environment variable injection.

**Test Harness Interface:**
```typescript
interface ColorManagerTestHarness {
  createTheme(options?: ColorOptions): Theme;
  setChalkLevel(level: 0 | 1 | 2 | 3): void;
  setTTY(isTTY: boolean): void;
  setEnvVar(name: string, value: string | undefined): void;
  reset(): void;
}

function setupColorManagerTest(): ColorManagerTestHarness;
```

**Test Pattern (each integration test):**
1. Create a fresh harness with mocked chalk and process state
2. Set desired chalk Level, TTY state, and environment variables
3. Create theme via `createTheme(options)` with desired options
4. Assert on `theme.mode`, style function output, and log call
5. Reset harness for next test (no state leakage)

**ANSI Output Verification:**

Output in full/basic mode must contain one or more ANSI escape sequences (`\x1b[`) and must not be identical to the input string. The specific escape codes are not asserted -- only the presence/absence of ANSI sequences and the identity/non-identity of the output.

```typescript
function isAnsiStyled(output: string): boolean {
  return /\x1b\[/.test(output);
}

function isIdentity(input: string, output: string): boolean {
  return input === output;
}
```

### 3. Property-Based Tests

Using `fast-check` to verify invariants across generated string inputs. Each property runs a minimum of 100 iterations per run and must be deterministic across all runs.

| Property | Input Generator | Invariant |
|----------|---------------|-----------|
| **No-color identity (P001)** | `fc.string()` including empty, unicode, emoji, whitespace-only, control characters, null bytes | `forAll s: createTheme({ noColor: true }).error(s) === s` -- holds for all 10 functions |
| **Full-color non-identity (P002)** | `fc.string({ minLength: 1 })` non-empty strings | `forAll s.length > 0: createTheme({ __modeForTest: 'full' }).error(s) !== s` -- holds for all 10 functions |
| **Style function idempotency (P003)** | `fc.string()` + `fc.constantFrom('full', 'basic', 'none')` | `forAll s, m: theme.f(theme.f(s)) === theme.f(s)` for every style function f and mode m |
| **String type preservation (P004)** | `fc.string()` + all 3 modes | `forAll s, m: typeof theme.f(s) === 'string'` for every f -- never undefined, null, or number |
| **Mode consistency across all functions (P005)** | `fc.string()` | In a single theme, either all 10 functions produce colored output or all 10 produce identity -- no mixing of colored and identity functions within one theme |
| **Empty string identity (P006)** | `fc.constant("")` + all 3 modes | `forAll m: theme.f("") === ""` for every f -- empty input always produces empty output |

**Property execution requirements:**
- Minimum 100 iterations per property per CI run
- No `.filter()` to exclude edge cases that would cause failures -- instead document known limitations
- Properties must be independently runnable (not dependent on test order)
- Unicode surrogate pairs, emoji sequences, and bidirectional text must not cause property failures

### 4. Mutation Testing

Using Stryker with the following configuration:

| Parameter | Value |
|-----------|-------|
| Test runner | Vitest |
| Mutator plugins | TypeScript |
| Threshold | >= 80% mutation score |
| Target files | `src/ui/createTheme.ts`, `src/ui/styles.ts` |
| Ignore | Type definitions, test files, configuration files, re-export index.ts |
| CI enforcement | Build fails if score < 80% |

**Critical Mutations That Must Be Caught:**

| Mutation Type | Example | Why It Must Be Caught |
|--------------|---------|----------------------|
| Mode detection inverted | `noColor ? 'none' : 'full'` inverted to `noColor ? 'full' : 'none'` | Wrong mode breaks all downstream rendering |
| Semantic color swapped | `error: chalk.red` changed to `error: chalk.blue` | Inconsistent visual language; users learn red=errors |
| Pass-through removed | Remove `if (mode === 'none') return s` | ANSI codes leak into piped output and log files |
| Theme freezing removed | Remove `Object.freeze(theme)` | Downstream features could accidentally mutate theme, causing subtle runtime bugs |
| Logging removed | Remove `logger.info(...)` call | Debugging color issues becomes significantly harder |
| Identity function broken | Return `s + ''` instead of `s` | Style function subtly modifies string (coercion to string is acceptable, adding characters is not) |
| Color mode string wrong | `'full'` changed to `'high'` | Downstream features checking `theme.mode` break |
| Priority order inverted | Check chalk level before --no-color flag | Flag is overridden by terminal capability -- defeats user intent |
| Logger call count changed | Log called per style function invocation instead of once per theme creation | Log spam and performance regression |

---

## Test Inventory

### Gherkin Scenario Mapping

| # | Gherkin Scenario | Test IDs | Type | Key Assertions |
|---|-----------------|----------|------|---------------|
| 1 | Full color mode when terminal supports truecolor | T001 | Integration | mode === "full", output !== input, ANSI sequences present |
| 2 | Basic color mode when terminal supports only 16 colors | T002 | Integration | mode === "basic", output !== input, ANSI sequences present |
| 3 | No-color mode when --no-color flag is passed | T003 | Integration | mode === "none", all 10 functions identity |
| 4 | No-color mode when CHALK_DISABLE env var is set | T004 | Integration | mode === "none", identity functions |
| 5 | No-color mode when stdout is not a TTY | T005 | Integration | mode === "none", identity functions |
| 6 | JSON mode implies no-color | T006 | Integration | mode === "none", identity functions |
| 7 | All seven semantic colors produce colored output in full mode | T007 | Integration | All 7 return output !== input |
| 8 | Bold, dim, italic produce styled output in full mode | T008 | Integration | bold, dim, italic return output !== input |
| 9 | All styles return input unchanged in no-color mode | T009 | Integration | All 10 return input unchanged |
| 10 | --no-color flag overrides CHALK_DISABLE env var | T010 | Integration | mode === "none" despite CHALK_DISABLE + noColor: true |
| 11 | CHALK_DISABLE env var overrides terminal capability and TTY | T011 | Integration | mode === "none" despite Level 3 and TTY |
| 12 | Non-TTY overrides chalk level | T012 | Integration | mode === "none" despite Level 3 |
| 13 | Theme object is immutable after creation | T013 | Unit | isFrozen, add/set/delete rejected |
| 14 | Unknown or intermediate chalk level falls back to basic | T014 | Integration | mode === "basic", output !== input, Level 2 treated as basic |
| 15 | Color mode is logged once on theme creation | T015 | Unit + Integration | Logger called exactly once with correct message |

### Additional Unit Tests

| Test ID | Test Case | Type | Assertions |
|---------|-----------|------|------------|
| U001 | createTheme with undefined options | Unit | Same result as createTheme() with auto-detection (no crash) |
| U002 | createTheme with null options | Unit | Same result as createTheme() with auto-detection (no crash) |
| U003 | createTheme with empty object `{}` | Unit | Same result as createTheme() with auto-detection (no crash) |
| U004 | createTheme with `noColor: false` | Unit | Auto-detection behavior (no-color is NOT forced) |
| U005 | createTheme with `json: false` | Unit | Auto-detection behavior (JSON mode is NOT forced) |
| U006 | createTheme with both `noColor: true` and `json: true` | Unit | mode === "none" (both independently imply no-color, no conflict) |
| U007 | Theme function names match the Theme interface exactly | Unit | All 10 expected functions present, no extra functions, no missing functions |
| U008 | Theme mode property is read-only string | Unit | mode is `"full" | "basic" | "none"`, cannot be overwritten |
| U009 | Logging records correct mode each time | Unit | Logger called with exact mode string matching `theme.mode` |
| U010 | No-color identity holds for all common string types | Unit | Empty string, unicode, whitespace, HTML tags, numbers coered to string all return unchanged |
| U011 | Style function never throws on any input type | Unit | Passing any value that coerces to string produces no error |

### Additional Integration Tests

| Test ID | Test Case | Type | Assertions |
|---------|-----------|------|------------|
| I001 | chalk Level 0 (no color) with TTY true | Integration | mode === "none" (Level 0 means chalk cannot produce any color) |
| I002 | chalk Level 1 with TTY false | Integration | mode === "none" (non-TTY overrides level detection) |
| I003 | chalk Level 1 with CHALK_DISABLE set and TTY true | Integration | mode === "none" (env var overrides level detection) |
| I004 | chalk Level 1 with --no-color and TTY true | Integration | mode === "none" (flag overrides everything) |
| I005 | chalk Level 3 with all disable signals active: TTY false, CHALK_DISABLE set, --no-color true | Integration | mode === "none" (all disable signals together still produce none) |
| I006 | CHALK_DISABLE set to empty string `""` | Integration | mode === "none" (chalk v5 treats presence of key as disable signal, even with empty value) |
| I007 | CHALK_DISABLE set to `"0"` | Integration | mode === "none" (non-empty string is truthy in JS; chalk treats any value as disabled) |
| I008 | Repeated createTheme calls with different isolated options | Integration | Each theme returns correct mode for its own options; no global state leakage between invocations |
| I009 | chalk Level 2 (256-color) with TTY true, CHALK_DISABLE not set | Integration | mode === "basic" (Level 2 is not Level 3, falls to basic) |
| I010 | createTheme with noColor, json, and _chalkInstance options all set | Integration | Mode selection respects priority: noColor=true always wins |

### Property-Based Tests

| Test ID | Property | Generator | Invariant | Runs |
|---------|----------|-----------|-----------|------|
| P001 | No-color identity for all 10 functions | `fc.string()` | `forall s: theme.f(s) === s` -- every function returns input unchanged | >= 100 |
| P002 | Full-color non-identity for all 10 functions | `fc.string({ minLength: 1 })` | `forall s: theme.f(s) !== s` -- every function modifies the string | >= 100 |
| P003 | Style function idempotency per mode | `fc.string()`, `fc.constantFrom('full','basic','none')` | `forall s, m: theme.f(theme.f(s)) === theme.f(s)` -- double application equals single application | >= 100 |
| P004 | String type preservation | `fc.string()`, `fc.constantFrom('full','basic','none')` | `forall s, m: typeof theme.f(s) === 'string'` -- never undefined/null/number | >= 100 |
| P005 | Mode consistency within a theme | `fc.string()` | `forall s: (isColored(f1(s)) === isColored(f2(s)))` for all function pairs -- all colored or all identity | >= 100 |
| P006 | Empty string identity across all functions and modes | `fc.constant("")`, `fc.constantFrom('full','basic','none')` | `forall m: theme.f("") === ""` for every function f | >= 100 |

---

## Mocking Strategy

### chalk Level Detection

chalk v5 (ESM-only) exports a `chalk` instance with a `.level` property. For testing, the level must be controlled without checking the real terminal.

| Approach | Mechanism | Used In |
|----------|-----------|---------|
| **chalk.Instance injection** | Production code accepts an optional internal `_chalkInstance` parameter in ColorOptions. Tests pass a `new chalk.Instance({ level: N })` with controlled level. | Unit tests, integration tests |
| **vi.mock('chalk', ...)** | Mock the entire ESM chalk module to return a chalk instance with controlled `.level` | Property tests (if Instance approach is insufficient) |
| **vi.spyOn** | Spy on chalk's level setter to verify the Color Manager uses the correct level strategy | Verification tests for chalk global isolation |

**Recommended (first choice):** Inject a `_chalkInstance` via ColorOptions for testability. This avoids complex ESM mocking:

```typescript
interface ColorOptions {
  noColor?: boolean;
  json?: boolean;
  // Testing only: inject a chalk instance with controlled level
  // Not part of the public API; not documented for end users
  // eslint-disable-next-line @typescript-eslint/naming-convention
  _chalkInstance?: Chalk;
}
```

If injection is deemed undesirable, use `vi.mock('chalk', () => ({ default: mockChalkInstance }))` at the test file level with `vi.hoisted()` for ESM support.

### Environment Variables

```typescript
// Set before each test
vi.stubEnv('CHALK_DISABLE', '1');

// Reset after each test
vi.unstubAllEnvs();
```

Each test must reset env vars after running. Never leave `CHALK_DISABLE` set for subsequent tests.

### TTY Detection

```typescript
// Mock process.stdout.isTTY
function setTTY(isTTY: boolean): void {
  Object.defineProperty(process.stdout, 'isTTY', {
    value: isTTY,
    configurable: true,
    writable: false,
  });
}

// Restore after test (in afterEach or teardown)
function restoreTTY(): void {
  delete (process.stdout as any).isTTY;
}
```

Each test must restore `process.stdout.isTTY` to its original state. Test isolation is mandatory -- a test that leaves `isTTY=false` will break subsequent tests in the same file.

### Logging

```typescript
const loggerSpy = vi.fn();

// Inject spy via module-level mock
vi.mock('../src/ui/logger', () => ({
  info: loggerSpy,
}));
```

Logging assertions:
- After theme creation: `expect(loggerSpy).toHaveBeenCalledTimes(1)`
- After theme creation: `expect(loggerSpy).toHaveBeenCalledWith('[INFO] Color mode: full')`
- Style function calls must NOT trigger log calls: call `theme.error('x')`, assert spy count unchanged

---

## Edge Cases Beyond Gherkin

### Mode Detection Boundary Conditions

| Edge Case | Scenario | Expected Behavior | Test ID |
|-----------|----------|-------------------|---------|
| chalk Level 0 (no color) with TTY true | Chalk completely disabled, terminal is a TTY | mode "none" (Level 0 implies chalk cannot produce color; safest fallback) | I001 |
| chalk Level 1 with TTY false | Basic terminal, but output is piped | mode "none" (non-TTY takes priority over level detection) | I002 |
| chalk Level 1 with CHALK_DISABLE and TTY true | All signals present, different directions | mode "none" (env var takes priority over level and TTY) | I003 |
| chalk Level 2 (256-color) | Intermediate color support | mode "basic" (only Level 3 is "full"; Levels 1 and 2 are both "basic") | I009, T014 |
| CHALK_DISABLE set to "0" | Non-empty string that is falsy in some languages | mode "none" (JS treats "0" as truthy; chalk treats any CHALK_DISABLE presence as disable) | I007 |
| CHALK_DISABLE set to "" (empty string) | Env var exists but has no value | mode "none" (chalk v5 checks `'CHALK_DISABLE' in process.env`, not the value) | I006 |
| Both --no-color and CHALK_DISABLE set | Redundant disable signals | mode "none" regardless (both indicate same intent; flag wins priority but result is identical) | T010 |
| noColor: false but CHALK_DISABLE is set | Flag explicitly says "do not disable" but env disagrees | mode "none" (flag == false means "don't force disable via flag", but env var is a separate signal checked next) | U004 |
| createTheme called before chalk level is initialized | chalk.level may be undefined or null | Default to "basic" mode (safe fallback, never crash, never default to full) | U003 |
| Repeated createTheme calls with different options | Multiple themes created in same process | Each theme is independent; option sets do not leak between themes | I008 |

### String Handling Edge Cases

| Edge Case | Input | Expected Behavior |
|-----------|-------|-------------------|
| Empty string | `""` | Returns `""` unchanged in all modes for all functions |
| Null | `null` | Coerces to `"null"` string, then styled normally (chalk calls String()) |
| Undefined | `undefined` | Coerces to `"undefined"` string, then styled normally |
| Unicode (emoji, CJK, RTL) | `"Hello  world"` with mixed scripts | ANSI codes wrap the entire string; no splitting of multi-byte UTF-8 sequences |
| Very long string (>10k chars) | `"a".repeat(10000)` | Styling applied correctly; no performance degradation; no memory issues |
| String with existing ANSI codes | `"\x1b[31mred\x1b[0m"` | Outer ANSI codes wrap inner ANSI codes; nested ANSI is valid per spec (chalk wraps, does not strip) |
| Newlines in string | `"line1\nline2"` | Chalk applies codes at string level; entire string including newlines is wrapped |
| Template literal result | `` `count: ${n}` `` | Works normally (standard JS string passing; no special handling needed) |
| Whitespace-only string | `"   "` | Styled as normal string with ANSI wrapping in full/basic mode; identity in no-color |
| Very short string (1 char) | `"x"` | Works normally; no minimum length requirement |

### Environment Interaction Edge Cases

| Edge Case | Scenario | Expected Behavior |
|-----------|----------|-------------------|
| CHALK_DISABLE set after theme creation | Env var changed mid-process | No effect on already-created theme (theme is immutable; mode is fixed at creation time) |
| process.stdout.isTTY changes mid-process | stdout redirected after CLI start | No effect on already-created theme |
| Multiple chalk instances in same process | Another library uses chalk directly | Color Manager does not modify global `chalk.level`; uses `chalk.Instance` for scoped level isolation |
| TERM env var set to "dumb" | Terminal reports no capability | chalk auto-detects Level 0, resulting in mode "none" (no special handling needed beyond chalk's native behavior) |
| NO_COLOR env var (cross-platform standard) | Industry standard no-color convention | chalk v5 natively supports `NO_COLOR`. If set, chalk internally disables colors. The Color Manager also checks `CHALK_DISABLE` explicitly. Document that `NO_COLOR` is handled by chalk at the library level. |
| Windows Terminal with legacy mode | Old Windows console with limited ANSI | chalk auto-detects capability; falls to Level 1 (basic) or Level 0 (none). No special Windows handling needed. |

### Concurrency and State

| Edge Case | Scenario | Expected Behavior |
|-----------|----------|-------------------|
| Multiple themes created simultaneously | Async race condition (theoretical) | Each `createTheme()` call is synchronous; no shared mutable state -- safe by construction |
| Theme functions called from async callbacks | Promise chain styling in async/await | Style functions are pure (`string => string`), safe from any async context |
| Global chalk level mutated externally | Another library directly sets `chalk.level = 0` | Color Manager uses `chalk.Instance({ level })` -- isolated from global chalk |
| Logger called from multiple theme creations | createTheme called N times | Logger called N times (once per creation), each with correct mode for that specific call |

---

## Mode Detection Matrix (Complete Coverage)

This matrix covers all 12 combinations of the four binary signals. Every combination must produce the documented mode.

| # | chalk Level >= 3? | isTTY? | CHALK_DISABLE? | --no-color? | Expected Mode | Priority Rule | Test ID |
|---|-------------------|--------|----------------|-------------|---------------|---------------|---------|
| 1 | Yes | Yes | No | No | full | Default: highest capability | T001 |
| 2 | No (Level 1-2) | Yes | No | No | basic | Fallback: limited terminal | T002, T014, I009 |
| 3 | No (Level 0) | Yes | No | No | none | Level 0 = no color | I001 |
| 4 | Yes | No | No | No | none | Non-TTY disables color | T005, T012 |
| 5 | Yes | Yes | Yes | No | none | CHALK_DISABLE overrides Level + TTY | T004, T011 |
| 6 | Yes | Yes | No | Yes | none | --no-color overrides everything | T003, T010 |
| 7 | No (Level 1-2) | No | No | No | none | Non-TTY overrides Level | I002 |
| 8 | No (Level 1-2) | Yes | Yes | No | none | Env var overrides Level + TTY | I003 |
| 9 | No (Level 1-2) | Yes | No | Yes | none | Flag overrides everything | I004 |
| 10 | Yes | No | Yes | No | none | Non-TTY + env = none | I005 |
| 11 | Yes | Yes | Yes | Yes | none | All disable = none (consistent) | I005 |
| 12 | No (Level 0) | No | Yes | Yes | none | All signals none = none | I005 |

**Key insight from the matrix:**
- Only combination #1 produces "full" mode (Level >= 3, TTY, no env, no flag)
- Only combination #2 produces "basic" mode (Level 1-2, TTY, no env, no flag)
- All 10 other combinations produce "none" mode

This is correct per the priority-based detection algorithm: any single disabling signal (flag, env, non-TTY, Level 0) overrides all positive capability signals.

---

## Verification Gates

All gates must pass before F-024 is considered complete. Gates are ordered -- stop at the first failure.

### Gate 1: TypeScript Compilation (Strict Mode)

```
$ pnpm typecheck
> No errors in src/ui/
```

Requirements:
- TypeScript strict mode enabled
- No `any` types in color manager source files
- All exported functions have explicit return types
- Theme interface correctly typed with all 10 style functions and read-only mode union
- No `@ts-ignore` or `@ts-expect-error` in production code

### Gate 2: Unit Tests Pass

```
$ pnpm test:unit -- --run src/ui/
> PASS  All unit tests
```

Requirements:
- All unit tests (U001-U011) pass
- Coverage threshold: >= 90% statements, >= 80% branches
- Test files in `src/ui/__tests__/*.test.ts`
- Every semantic color and style function tested in at least one mode
- Theme immutability verified through explicit mutation attempts

### Gate 3: Integration Tests Pass

```
$ pnpm test -- --run tests/integration/color-manager.test.ts
> PASS  All integration tests
```

Requirements:
- All integration tests (T001-T015, I001-I010) pass
- Covers all 15 Gherkin scenarios
- Full mode detection matrix: all 12 combinations tested
- ANSI output verified by `\x1b[` escape sequence presence (not by specific code values)
- Identity verified by strict equality (`===`)
- Priority chain verified by testing each signal in isolation and in combination with higher/lower signals

### Gate 4: Property-Based Tests Pass

```
$ pnpm test:property -- --run src/ui/
> PASS  All property tests
```

Requirements:
- All property-based tests (P001-P006) pass
- Minimum 100 runs per property
- No flaky tests (3 consecutive CI runs green with >= 100 iterations each)
- Unicode, emoji, and edge string inputs do not cause property failures
- Properties are independently runnable (no shared state, no test ordering dependencies)

### Gate 5: Mutation Score >= 80%

```
$ pnpm test:mutation
> Mutation score: >= 80%
```

Requirements:
- Stryker mutates all production code under `src/ui/createTheme.ts` and `styles.ts`
- Threshold: >= 80% mutation score (killed mutants / total mutants)
- All surviving mutants reviewed and either:
  - Accepted as equivalent mutants (functionally identical code, no test can distinguish), documented in `mutation-exemptions.md`
  - OR new test case added to kill the mutant
- Pipeline fails if score < 80%

### Gate 6: All Gherkin Scenarios Executable

```
$ pnpm test:specs -- f024-color-manager
> PASS  All 15 scenarios pass
```

Requirements:
- Gherkin scenarios are wired to test code (manual mapping via Vitest test runner, or Gherkin runner)
- Each scenario is independently runnable -- no shared state between scenarios
- Scenario-to-test mapping is documented and kept in sync with the feature file

---

## Test File Structure

```
src/ui/
  createTheme.ts              # createTheme(): mode detection, theme assembly
  styles.ts                   # Style function factory: wraps chalk with mode awareness
  types.ts                    # ColorOptions, Theme interfaces
  logger.ts                   # Internal logging for color mode reporting

  __tests__/
    createTheme.test.ts        # U001-U011: theme creation, options, mode detection, logging
    styles.test.ts             # Style function unit tests (individual function behavior)

    createTheme.property.test.ts  # P001-P006: property invariants
    styles.property.test.ts       # Property tests for style functions

tests/integration/
  color-manager.test.ts        # T001-T015, I001-I010: full integration and mode detection matrix

tests/mutation/
  stryker.config.json          # Stryker configuration (targets, thresholds, ignore patterns)
```

---

## Scenario-to-Test Mapping

| # | Gherkin Scenario | Test IDs | Type | Verification Gate |
|---|-----------------|----------|------|-------------------|
| 1 | Full color mode detection | T001, (P002 partial) | Integration + Property | Gate 3 + 4 |
| 2 | Basic color mode detection | T002, T014, I009 | Integration | Gate 3 |
| 3 | No-color via --no-color flag | T003 | Integration | Gate 3 |
| 4 | No-color via CHALK_DISABLE | T004, I006, I007 | Integration | Gate 3 |
| 5 | No-color via non-TTY pipe | T005 | Integration | Gate 3 |
| 6 | JSON mode no-color | T006 | Integration | Gate 3 |
| 7 | All 7 semantic colors produce colored output | T007 | Integration | Gate 3 |
| 8 | Bold, dim, italic produce styled output | T008 | Integration | Gate 3 |
| 9 | All styles return input unchanged in no-color | T009, P001 | Integration + Property | Gate 3 + 4 |
| 10 | --no-color overrides CHALK_DISABLE | T010, I004 | Integration | Gate 3 |
| 11 | CHALK_DISABLE overrides terminal capability | T011, I003 | Integration | Gate 3 |
| 12 | Non-TTY overrides chalk level | T012, I002 | Integration | Gate 3 |
| 13 | Theme immutability | T013, U007, U008 | Unit | Gate 2 |
| 14 | Unknown/intermediate level falls to basic | T014, I009 | Integration | Gate 3 |
| 15 | Color mode logged once | T015, U009 | Unit + Integration | Gate 2 + 3 |
| -- | Edge cases: Level 0, empty env, repeated calls | I001, I005-I008, I010 | Integration | Gate 3 |
| -- | Property invariants: idempotency, type, consistency | P001-P006 | Property | Gate 4 |
| -- | Unit edge cases: null/undefined options | U001-U006, U010-U011 | Unit | Gate 2 |

---

## Dependencies and Mocking

### External Dependencies (to mock in unit tests)

| Dependency | Reason to Mock | Mock Strategy |
|-----------|---------------|--------------|
| `chalk` (v5, ESM) | Tests need controlled chalk.Level | `vi.mock('chalk', () => ({ default: new Chalk({ level: TEST_LEVEL }) }))` or inject via `_chalkInstance` option |
| `process.stdout.isTTY` | Tests need controlled TTY state | `Object.defineProperty(process.stdout, 'isTTY', { value: boolean, configurable: true })` |
| `process.env.CHALK_DISABLE` | Tests need controlled env var | `vi.stubEnv('CHALK_DISABLE', value)` / `vi.unstubAllEnvs()` |
| Logger module | Capture log call count and message | `vi.mock('./logger', () => ({ info: vi.fn() }))` |

### External Dependencies (NOT to mock)

| Dependency | Reason |
|-----------|--------|
| `chalk.Instance` constructor | Integration tests use real chalk Instance with controlled level to verify actual ANSI output |
| `Object.freeze` | Core JS runtime behavior; never mock |
| ANSI escape sequence handling | Tests verify real ANSI output is produced -- not a mocked version |

---

## Assumptions and Open Questions

### Assumptions

1. **chalk Level mapping:** chalk Level 0 = no color, Level 1 = 16 colors (basic ANSI), Level 2 = 256 colors (8-bit), Level 3 = 16.7M colors (truecolor). F-024 maps Level 3 to "full" mode and Levels 1-2 to "basic" mode. Level 0 is treated as "none".

2. **chalk Instance isolation:** The Color Manager uses `new chalk.Instance({ level: N })` to create a scoped chalk instance rather than mutating the global `chalk.level`. This prevents interference with other chalk consumers in the same process.

3. **CHALK_DISABLE behavior:** chalk v5 natively checks `CHALK_DISABLE` env var. If the key is present in `process.env` (regardless of value), chalk internally disables colors. F-024's own detection also checks this for consistency, so `theme.mode` reflects intent even if chalk handles the strip internally.

4. **No global state in theme:** Each `createTheme()` call produces an independent, frozen theme. There is no singleton, no module-level cache of the theme, and no shared mutable state between themes. Multiple themes can coexist in the same process.

5. **Sync-only execution:** All style functions are synchronous. No async behavior, no promises, no callbacks. Input string is processed and returned in the same call stack.

6. **Logger format:** The log message uses `[INFO] Color mode: <mode>` format where `<mode>` is exactly one of `full`, `basic`, or `none`. No trailing punctuation, no additional metadata, no newline formatting decisions.

7. **heading uses bold only:** The `heading` semantic function applies `chalk.bold` without any color. In no-color mode, this means heading text is plain. In basic/full mode, it is bold. This is intentional for visual hierarchy without depending on color perception.

### Open Questions

1. **CHALK_DISABLE empty string behavior:** Does chalk v5 treat `CHALK_DISABLE=""` as disabled or enabled? Resolved: chalk v5 checks `'CHALK_DISABLE' in process.env` -- the presence of the key alone (even with empty string value) disables chalk. F-024 matches this behavior.

2. **Logging mechanism:** Should the logger be a configurable dependency (injected via options) or a hard-coded internal module? Resolution: Use an internal module (`src/ui/logger.ts`) that can be mocked in tests. Do not add logger to the public ColorOptions interface.

3. **mode property type:** Should `mode` be a string literal union (`'full' | 'basic' | 'none'`) or a numeric enum? Resolution: Use string literal union for TypeScript ergonomics, JSON serialization compatibility, and consistency with the log message format.

4. **NO_COLOR env var interaction:** The cross-platform `NO_COLOR` standard is now widely adopted. chalk v5 natively supports it. Should F-024 also explicitly check `NO_COLOR` in addition to `CHALK_DISABLE`? Resolution: chalk v5 handles `NO_COLOR` natively at the library level. F-024 does not need to check it separately. Document this in the source code comment for maintainers.

5. **Performance of repeated style calls:** What is the acceptable performance budget for a style function call? Resolution: Style functions should complete in < 1 microsecond per call (ballpark). chalk v5 is highly optimized; the wrapper adds negligible overhead. If performance becomes a concern, style functions can be curried at theme creation time.

---

*Last updated: 2026-07-02. Status: Draft. Part of ANSDLC Phase 5A (Specification).*
