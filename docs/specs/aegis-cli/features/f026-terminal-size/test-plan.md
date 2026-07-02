# Test Plan -- F-026: Terminal Size Detection

## Verification Architecture

### Test Stack

| Layer | Framework | Scope | File Pattern |
|-------|-----------|-------|-------------|
| Unit | Vitest | Pure functions: getSize mode selection, isNarrow, isWarnNarrow, cache logic | `src/ui/__tests__/terminal-size.test.ts` |
| Integration | Vitest | Full environment simulation: stdout/stderr mocking, timer control, fallback chain, cache debounce | `tests/integration/terminal-size.test.ts` |
| Property-based | fast-check (via Vitest) | Invariants over isNarrow/isWarnNarrow: threshold boundaries, type safety, total order | `src/ui/__tests__/terminal-size.property.test.ts` |
| Mutation | Stryker | All production code under `src/ui/terminal-size/` | `src/ui/terminal-size/**/*.ts` (mutants) |

### Test Layers

```
+---------------------------------------------------------------+
|                 Property-Based Tests                           |
|  Invariants: isNarrow implies isWarnNarrow when columns < 50, |
|  threshold boundary stability, type preservation,             |
|  monotonicity of narrow checks                                |
+---------------------------------------------------------------+
|                 Integration Tests                              |
|  stdout/stderr mocking, timer advance/clock control,          |
|  fallback chain correctness, cache debounce,                  |
|  force refresh, terminal resize reflection                    |
+---------------------------------------------------------------+
|                 Unit Tests                                     |
|  getSize(options) mode selection, cache state machine,        |
|  isNarrow/isWarnNarrow boundary values, undefined options,    |
|  default fallback construction                                |
+---------------------------------------------------------------+
```

---

## Test Type Details

### 1. Unit Tests

Test getSize, isNarrow, and isWarnNarrow in isolation with controlled stream injection. No process mocking at the import level -- inject stream mocks via an internal option.

| Module | Test Subject | What to Test |
|--------|-------------|-------------|
| `getSize.ts` | Primary detection | When stdout is TTY, returns stdout columns/rows with isTTY=true |
| `getSize.ts` | Stderr fallback | When stdout is non-TTY but stderr is TTY, returns stderr columns/rows |
| `getSize.ts` | Default fallback | When neither is TTY, returns 80x24 with isTTY=false |
| `getSize.ts` | Cache hit | Second call within 100ms returns same object reference |
| `getSize.ts` | Cache expiration | Call after 100ms re-probes streams |
| `getSize.ts` | Force refresh | `{ refresh: true }` returns new object regardless of timing |
| `getSize.ts` | Options edge cases | `undefined`, `null`, `{}` all produce same auto-detection behavior |
| `getSize.ts` | Call without options | `getSize()` without arguments works identically to `getSize({})` |
| `narrow.ts` | isNarrow boundary | Returns true for 59, false for 60 |
| `narrow.ts` | isWarnNarrow boundary | Returns true for 49, false for 50 |
| `narrow.ts` | Zero columns handling | isNarrow returns true for 0; isWarnNarrow returns true for 0 |
| `narrow.ts` | Very large values | isNarrow/isWarnNarrow false for large column counts (e.g., 200) |

### 2. Integration Tests

Full environment simulation using controlled process.stdout/process.stderr mocks and virtual timer control.

**Test Harness Interface:**
```typescript
interface TerminalSizeTestHarness {
  getSize(options?: SizeOptions): TerminalSize;
  setStdout(columns: number | undefined, rows: number | undefined, isTTY: boolean): void;
  setStderr(columns: number | undefined, rows: number | undefined, isTTY: boolean): void;
  advanceTime(ms: number): void;
  resetTime(): void;
  reset(): void;
}

function setupTerminalSizeTest(): TerminalSizeTestHarness;
```

**Test Pattern (each integration test):**
1. Create a fresh harness with mocked process streams and virtual timer
2. Set desired stdout/stderr dimensions and TTY states
3. Call `getSize(options)` with desired options
4. Optionally advance time and/or change stream dimensions
5. Assert on result fields, reference equality, and timing
6. Reset harness for next test (no state leakage)

### 3. Property-Based Tests

Using `fast-check` to verify invariants across generated TerminalSize inputs. Each property runs a minimum of 100 iterations per run and must be deterministic across all runs.

| Property | Input Generator | Invariant |
|----------|---------------|-----------|
| **Narrow implies warn-narrow below 50 (P001)** | `fc.integer({ min: 0, max: 49 })` | `forAll c < 50: isNarrow({ columns: c, rows: 24, isTTY: true }) === true AND isWarnNarrow({ columns: c, rows: 24, isTTY: true }) === true` |
| **Non-narrow for wide terminals (P002)** | `fc.integer({ min: 60, max: 500 })` | `forAll c >= 60: isNarrow({ columns: c, ... }) === false` |
| **Non-warn-narrow for >= 50 (P003)** | `fc.integer({ min: 50, max: 500 })` | `forAll c >= 50: isWarnNarrow({ columns: c, ... }) === false` |
| **Between 50 and 59: narrow but not warn-narrow (P004)** | `fc.integer({ min: 50, max: 59 })` | `forAll 50 <= c < 60: isNarrow(c) === true AND isWarnNarrow(c) === false` |
| **Boolean return type (P005)** | `fc.record({ columns: fc.integer(), rows: fc.integer(), isTTY: fc.boolean() })` | `forAll s: typeof isNarrow(s) === 'boolean' AND typeof isWarnNarrow(s) === 'boolean'` |
| **Monotonicity (P006)** | `fc.tuple(fc.integer(), fc.integer()).map(([a,b]) => [Math.min(a,b), Math.max(a,b)])` | `forAll c1 <= c2: isNarrow(c1) >= isNarrow(c2)` -- if narrow at wider width, also narrow at narrower width |

**Property execution requirements:**
- Minimum 100 iterations per property per CI run
- No `.filter()` to exclude edge cases that would cause failures
- Properties must be independently runnable (not dependent on test order)

### 4. Mutation Testing

Using Stryker with the following configuration:

| Parameter | Value |
|-----------|-------|
| Test runner | Vitest |
| Mutator plugins | TypeScript |
| Threshold | >= 80% mutation score |
| Target files | `src/ui/terminal-size/getSize.ts`, `src/ui/terminal-size/narrow.ts` |
| Ignore | Type definitions, test files, configuration files, re-export index.ts |
| CI enforcement | Build fails if score < 80% |

**Critical Mutations That Must Be Caught:**

| Mutation Type | Example | Why It Must Be Caught |
|--------------|---------|----------------------|
| Default fallback wrong | Return `{ 80, 24 }` changed to `{ 80, 25 }` | Wrong default breaks all downstream layout on non-TTY terminals |
| Fallback order inverted | Check stderr before stdout | Stderr overrides stdout even when stdout is available |
| Cache removed | Always re-probe | Performance regression in rapid layout recalculations |
| Debounce window removed | Never refresh cache | Terminal resize never reflected |
| Debounce window too long | 100ms changed to 10000ms | Layout uses stale dimensions for 10 seconds |
| Force refresh ignored | `refresh: true` does nothing | Caller cannot override stale cache |
| isNarrow threshold changed | `< 60` changed to `<= 60` | Columns=60 incorrectly reported as narrow |
| isWarnNarrow threshold changed | `< 50` changed to `<= 50` | Columns=50 incorrectly triggers warning |
| isTTY always false | Never propagate TTY status | Downstream features cannot distinguish TTY from pipe |
| Rows ignored in fallback | Only columns read from stderr | Incomplete fallback data |

---

## Test Inventory

### Gherkin Scenario Mapping

| # | Gherkin Scenario | Test IDs | Type | Key Assertions |
|---|-----------------|----------|------|---------------|
| 1 | Returns stdout dimensions when stdout is a TTY | T001, U001 | Integration + Unit | columns=120, rows=30, isTTY=true |
| 2 | Falls back to stderr when stdout is not a TTY | T002, U003 | Integration + Unit | columns=80, rows=25, isTTY=true |
| 3 | Returns default dimensions when neither is a TTY | T003, U005 | Integration + Unit | columns=80, rows=24, isTTY=false |
| 4 | Returns cached result within debounce window | T004, U006 | Integration + Unit | Reference equality, same values |
| 5 | Refreshes result after debounce window expires | T005 | Integration | New columns value after 150ms |
| 6 | Force refresh bypasses cache | T006, U008 | Integration + Unit | New object, new values |
| 7 | isNarrow returns true when columns < 60 | T007, U009 | Integration + Unit | columns=59 => true |
| 8 | isNarrow returns false when columns >= 60 | T008, U010 | Integration + Unit | columns=60 => false |
| 9 | isWarnNarrow returns true when columns < 50 | T009, U011 | Integration + Unit | columns=49 => true |
| 10 | isWarnNarrow returns false when columns >= 50 | T010, U012 | Integration + Unit | columns=50 => false |
| 11 | Undefined/zero columns falls through fallback chain | T011, U014 | Integration + Unit | columns=0 => 80x24 fallback |
| 12 | Mixed stdout TTY with zero columns falls back to stderr | T012 | Integration | columns=0, isTTY=true => stderr 100x40 |

### Unit Tests

| Test ID | Test Case | Assertions |
|---------|-----------|------------|
| U001 | getSize with stdout TTY | Returns stdout columns, rows, isTTY=true |
| U002 | getSize with stdout TTY -- rows match | Returns stdout.rows exactly |
| U003 | getSize with stdout non-TTY, stderr TTY | Returns stderr columns, rows, isTTY=true |
| U004 | getSize with stdout non-TTY, stderr TTY -- isTTY true | isTTY=true reflects stderr terminal |
| U005 | getSize with both non-TTY | Returns 80, 24, isTTY=false |
| U006 | getSize cache hit within 100ms | Same object reference, same values |
| U007 | getSize cache expires after 100ms | New object after 150ms |
| U008 | getSize force refresh bypasses cache | New object with { refresh: true } regardless of timing |
| U009 | isNarrow with columns=0 | true |
| U010 | isNarrow with columns=59 | true |
| U011 | isNarrow with columns=60 | false |
| U012 | isNarrow with columns=500 | false |
| U013 | isWarnNarrow with columns=0 | true |
| U014 | isWarnNarrow with columns=49 | true |
| U015 | isWarnNarrow with columns=50 | false |
| U016 | isWarnNarrow with columns=100 | false |
| U017 | getSize with undefined options | Same as getSize() (auto-detection) |
| U018 | getSize with null options | Same as getSize() (auto-detection, no crash) |
| U019 | getSize with empty object `{}` | Same as getSize() (auto-detection) |
| U020 | isNarrow with isTTY=false | Narrow depends only on columns, not isTTY |
| U021 | isWarnNarrow with isTTY=false | Warn-narrow depends only on columns, not isTTY |

### Integration Tests

| Test ID | Test Case | Assertions |
|---------|-----------|------------|
| T001 | Stdout TTY with full dimensions | columns=120, rows=30, isTTY=true |
| T002 | Stderr fallback when stdout non-TTY | columns=80, rows=25, isTTY=true |
| T003 | Default fallback when both non-TTY | columns=80, rows=24, isTTY=false |
| T004 | Cache hit within 100ms debounce | Reference equality, values unchanged |
| T005 | Cache expiry after 100ms debounce | New object with updated columns |
| T006 | Force refresh bypasses cache | New object, current values |
| T007 | isNarrow true at boundary 59 | true |
| T008 | isNarrow false at boundary 60 | false |
| T009 | isWarnNarrow true at boundary 49 | true |
| T010 | isWarnNarrow false at boundary 50 | false |
| T011 | Stdout columns=0 treated as non-TTY fallthrough | Falls to default 80x24 if stderr also unavailable |
| T012 | Stdout columns=0 with stderr available | Falls to stderr dimensions |
| T013 | Stderr columns=0 and undefined stderr falls through to default | Default 80x24 returned |
| T014 | Repeated getSize with force refresh returns unique objects | Each call returns different object |
| T015 | getSize called three times rapidly (30ms apart) all return cached object | All three return same reference |

### Property-Based Tests

| Test ID | Property | Generator | Invariant | Runs |
|---------|----------|-----------|-----------|------|
| P001 | Narrow implies warn-narrow below 50 | `fc.integer({ min: 0, max: 49 })` | `forall c < 50: isNarrow(c) && isWarnNarrow(c)` | >= 100 |
| P002 | Non-narrow for columns >= 60 | `fc.integer({ min: 60, max: 500 })` | `forall c >= 60: !isNarrow(c)` | >= 100 |
| P003 | Non-warn-narrow for columns >= 50 | `fc.integer({ min: 50, max: 500 })` | `forall c >= 50: !isWarnNarrow(c)` | >= 100 |
| P004 | Middle zone: narrow but not warn-narrow | `fc.integer({ min: 50, max: 59 })` | `forall 50 <= c < 60: isNarrow(c) && !isWarnNarrow(c)` | >= 100 |
| P005 | Boolean return type | `fc.record(...)` | `forall s: typeof isNarrow(s) === 'boolean' && typeof isWarnNarrow(s) === 'boolean'` | >= 100 |
| P006 | Monotonicity | `fc.integer()` pairs | `forall c1 <= c2: isNarrow(c1) >= isNarrow(c2) && isWarnNarrow(c1) >= isWarnNarrow(c2)` | >= 100 |

---

## Mocking Strategy

### Process Streams

```typescript
interface MockStream {
  columns: number | undefined;
  rows: number | undefined;
  isTTY: boolean;
}

function setStream(stream: 'stdout' | 'stderr', mock: MockStream): void {
  Object.defineProperty(process, stream, {
    value: {
      columns: mock.columns,
      rows: mock.rows,
      isTTY: mock.isTTY,
    },
    configurable: true,
    writable: true,
  });
}

function restoreStreams(): void {
  // Restore to original real process.stdout/stderr
  // (or delete mock properties)
}
```

**Injection approach (preferred):** `getSize` accepts an optional internal parameter `_streams` for injecting mock stdout/stderr objects during testing:

```typescript
interface SizeOptions {
  refresh?: boolean;
  // Testing only: inject mock stream objects
  // Not part of the public API; not documented for end users
  // eslint-disable-next-line @typescript-eslint/naming-convention
  _stdout?: { columns?: number; rows?: number; isTTY: boolean };
  _stderr?: { columns?: number; rows?: number; isTTY: boolean };
}
```

### Timer Control

```typescript
// Use vi.useFakeTimers() for debounce testing
beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

// Test cache hit
getSize();                    // time 0, detection happens
vi.advanceTimersByTime(50);   // time 50ms (inside debounce window)
const cached = getSize();     // returns cached

// Test cache expiry
vi.advanceTimersByTime(100);  // time 150ms (outside debounce window)
const fresh = getSize();      // re-probes streams
```

### Environment

No environment variable mocking is needed for this feature. Terminal size detection uses only `process.stdout`/`process.stderr` properties and does not read `process.env`.

---

## Edge Cases Beyond Gherkin

### Detection Boundary Conditions

| Edge Case | Scenario | Expected Behavior | Test ID |
|-----------|----------|-------------------|---------|
| stdout.columns = 0 with isTTY=true | Columns reported as 0 but stream marked as TTY | Treat columns=0 as "no data", fall through to stderr or default | T012 |
| stdout.columns = undefined with isTTY=true | Property missing on stdout | Treat as non-detectable, fall through | T011 |
| stdout.rows = undefined but stdout.columns valid | Partial data | Return columns with rows=undefined; downstream must handle | — |
| stderr.columns = 0, stdout non-TTY | Fallback also has zero | Default 80x24 returned | T013 |
| stdout.columns = 0, stdout.rows = 0, stderr also undefined | Everything broken | Default 80x24, isTTY=false | T011 |
| stdout.isTTY = true but columns undefined | Contradictory state | Treat as non-detectable, fall through (isTTY reflects actual probe result) | T011 |
| Negative column value (theoretical) | Unusual terminal state | isNarrow/isWarnNarrow return true (negative < 50), safe fallback | — |
| Non-integer columns (e.g., 80.5) | Float from unusual terminal | Math.floor or truncate; isNarrow/isWarnNarrow work on integer comparison | — |

### Cache and Timing Edge Cases

| Edge Case | Scenario | Expected Behavior |
|-----------|----------|-------------------|
| getSize called at exactly 100ms boundary | Timing race at debounce edge | Either cached or fresh both produce valid dimensions; no crash, no error |
| getSize called with refresh=true on first call (no cache) | Force refresh when cache is empty | Normal detection, no cache hit possible -- returns fresh result |
| Very rapid getSize calls (microseconds apart) | Tight loop in layout calculation | All calls within 100ms return cached object; no performance degradation |
| getSize called after 100ms of inactivity | Terminal resized while idle | Fresh detection picks up current state |
| Multiple consecutive force-refresh calls | Refresh every call | Each returns a new object; no cache pollution |

### Helper Function Edge Cases

| Edge Case | Input | Expected Behavior |
|-----------|-------|-------------------|
| isNarrow with columns = 0 | 0 | true (0 < 60) |
| isNarrow with columns = 59 | 59 | true (boundary) |
| isNarrow with columns = 60 | 60 | false (boundary) |
| isNarrow with columns = 10000 | 10000 | false |
| isNarrow with columns = -1 | -1 | true (-1 < 60) -- defensive, shouldn't happen |
| isNarrow with columns = NaN | NaN | NaN < 60 is false in JS; treat as false (not narrow) |
| isWarnNarrow with columns = 0 | 0 | true (0 < 50) |
| isWarnNarrow with columns = 49 | 49 | true (boundary) |
| isWarnNarrow with columns = 50 | 50 | false (boundary) |
| isWarnNarrow with columns = -1 | -1 | true |
| isWarnNarrow with columns = NaN | NaN | NaN < 50 is false; treat as false |
| helper with missing columns field | `{ rows: 24, isTTY: true }` | undefined < 60 is false; isNarrow returns false, isWarnNarrow returns false |
| helper with null input | null | Throw TypeError (defensive: callers should pass valid TerminalSize) |

### Concurrency and State

| Edge Case | Scenario | Expected Behavior |
|-----------|----------|-------------------|
| Multiple modules call getSize simultaneously | Race condition on cache | JS is single-threaded; synchronous getSize has no race |
| process.stdout reference swapped at runtime | stdout replaced with new stream object | Next detection reads new object's properties; no stale reference |
| getSize called before streams are initialized | Startup race | streams exist from process start; columns may be undefined but isTTY works |

---

## Verification Gates

All gates must pass before F-026 is considered complete. Gates are ordered -- stop at the first failure.

### Gate 1: TypeScript Compilation (Strict Mode)

```
$ pnpm typecheck
> No errors in src/ui/terminal-size/
```

Requirements:
- TypeScript strict mode enabled
- No `any` types in terminal size source files
- All exported functions have explicit return types
- TerminalSize and SizeOptions interfaces correctly typed
- No `@ts-ignore` or `@ts-expect-error` in production code

### Gate 2: Unit Tests Pass

```
$ pnpm test:unit -- --run src/ui/terminal-size/
> PASS  All unit tests
```

Requirements:
- All unit tests (U001-U021) pass
- Coverage threshold: >= 90% statements, >= 80% branches
- Test files in `src/ui/__tests__/terminal-size.test.ts`
- Every detection mode (stdout, stderr, default) tested
- Cache hit and cache miss both tested
- Boundary values for isNarrow and isWarnNarrow tested at exact thresholds

### Gate 3: Integration Tests Pass

```
$ pnpm test -- --run tests/integration/terminal-size.test.ts
> PASS  All integration tests
```

Requirements:
- All integration tests (T001-T015) pass
- Covers all 12 Gherkin scenarios
- Full fallback chain tested: stdout -> stderr -> default
- Cache debounce verified with timer control
- Force refresh verified against cached state
- Terminal resize simulated by changing mock dimensions mid-test

### Gate 4: Property-Based Tests Pass

```
$ pnpm test:property -- --run src/ui/terminal-size/
> PASS  All property tests
```

Requirements:
- All property-based tests (P001-P006) pass
- Minimum 100 runs per property
- No flaky tests (3 consecutive CI runs green with >= 100 iterations each)
- Negative column values and NaN values do not cause failures
- Properties are independently runnable (no shared state)

### Gate 5: Mutation Score >= 80%

```
$ pnpm test:mutation
> Mutation score: >= 80%
```

Requirements:
- Stryker mutates all production code under `src/ui/terminal-size/getSize.ts` and `narrow.ts`
- Threshold: >= 80% mutation score (killed mutants / total mutants)
- All surviving mutants reviewed and either:
  - Accepted as equivalent mutants (functionally identical code, no test can distinguish), documented in `mutation-exemptions.md`
  - OR new test case added to kill the mutant
- Pipeline fails if score < 80%

### Gate 6: All Gherkin Scenarios Executable

```
$ pnpm test:specs -- f026-terminal-size
> PASS  All 12 scenarios pass
```

Requirements:
- Gherkin scenarios are wired to test code (manual mapping via Vitest test runner, or Gherkin runner)
- Each scenario is independently runnable -- no shared state between scenarios
- Scenario-to-test mapping is documented and kept in sync with the feature file

---

## Test File Structure

```
src/ui/terminal-size/
  getSize.ts                # getSize(): detection, caching, fallback logic
  narrow.ts                 # isNarrow(), isWarnNarrow(): pure threshold functions
  types.ts                  # TerminalSize, SizeOptions interfaces

  __tests__/
    terminal-size.test.ts       # U001-U021: unit tests for all detection modes and helpers

    terminal-size.property.test.ts  # P001-P006: property invariants

tests/integration/
  terminal-size.test.ts       # T001-T015: full integration with stream mocking and timer control

tests/mutation/
  stryker.config.json         # Stryker configuration (targets, thresholds, ignore patterns)
```

---

## Scenario-to-Test Mapping

| # | Gherkin Scenario | Test IDs | Type | Verification Gate |
|---|-----------------|----------|------|-------------------|
| 1 | Returns stdout dimensions when stdout is a TTY | T001, U001, U002 | Integration + Unit | Gate 2 + 3 |
| 2 | Falls back to stderr when stdout is not a TTY | T002, U003, U004 | Integration + Unit | Gate 2 + 3 |
| 3 | Default dimensions when neither is a TTY | T003, U005 | Integration + Unit | Gate 2 + 3 |
| 4 | Returns cached result within debounce window | T004, U006 | Integration + Unit | Gate 2 + 3 |
| 5 | Refreshes result after debounce window expires | T005, U007 | Integration + Unit | Gate 2 + 3 |
| 6 | Force refresh bypasses cache | T006, U008 | Integration + Unit | Gate 2 + 3 |
| 7 | isNarrow true when columns < 60 | T007, U010 | Integration + Unit | Gate 2 + 3 |
| 8 | isNarrow false when columns >= 60 | T008, U011 | Integration + Unit | Gate 2 + 3 |
| 9 | isWarnNarrow true when columns < 50 | T009, U014 | Integration + Unit | Gate 2 + 3 |
| 10 | isWarnNarrow false when columns >= 50 | T010, U015 | Integration + Unit | Gate 2 + 3 |
| 11 | Undefined/zero columns falls through fallback | T011, T013, U019 | Integration + Unit | Gate 2 + 3 |
| 12 | Mixed stdout TTY with zero columns falls to stderr | T012 | Integration | Gate 3 |
| -- | isNarrow edge cases: negative, NaN, missing field | U009, U012, U020 | Unit | Gate 2 |
| -- | isWarnNarrow edge cases: negative, NaN | U013, U016, U021 | Unit | Gate 2 |
| -- | Options edge cases: null, undefined, {} | U017, U018, U019 | Unit | Gate 2 |
| -- | Property invariants: thresholds, monotonicity, types | P001-P006 | Property | Gate 4 |

---

## Assumptions and Open Questions

### Assumptions

1. **process.stdout.columns/rows are always defined for TTY streams.** On all standard Node.js platforms, `process.stdout.columns` and `process.stdout.rows` return positive integers when `isTTY` is `true`. Edge cases (zero, undefined, NaN) are defensive handling for non-standard environments.

2. **Fallback chain order is fixed.** Stdout is always checked first, then stderr, then default. There is no configurable fallback order.

3. **Cache is an object reference stored in module scope.** The cached `TerminalSize` object is stored in a module-level variable and returned directly on cache hits. Downstream callers receive the same object reference inside the debounce window.

4. **Debounce window starts at the last detection.** The 100ms window is measured from the most recent detection call (either first call or last force-refresh). Clock time is measured via `Date.now()` or equivalent for compatibility with `vi.useFakeTimers()`.

5. **Force refresh updates the cache.** `getSize({ refresh: true })` not only returns a fresh result but also updates the internal cache and resets the debounce timer.

6. **isNarrow and isWarnNarrow are pure functions.** They read only the `columns` field of the input, perform a numeric comparison, and return a boolean. They have no side effects, no I/O, and no state.

7. **No concurrency concerns.** JavaScript is single-threaded. All `getSize()`, `isNarrow()`, and `isWarnNarrow()` calls are synchronous. No locks, no races, no async state.

### Open Questions

1. **Default dimensions origin.** Why 80x24? Resolution: This is the VT220 terminal standard and the most widely supported default. Node.js returns 80x24 as default on non-TTY streams on most platforms. Matching this default ensures consistency with platform conventions.

2. **Debounce window value.** Why 100ms? Resolution: 100ms is fast enough that terminal resize is reflected within human-perceptible timeframes (standard animation threshold is ~100ms for "instant" feel) while preventing excessive re-probes during rapid layout recalculations (e.g., React render loops). If profiling shows layout thrashing, this can be increased.

3. **isTTY semantics in mixed states.** If stdout is TTY but columns is 0, should `isTTY` be true or false? Resolution: The result's `isTTY` reflects whether any terminal was detected (stdout TTY or stderr TTY). If columns is 0 on stdout but stdout is TTY, and stderr fallback succeeds, `isTTY` is true. Only when both streams are non-TTY does `isTTY` become false.

4. **Object reference stability.** Should `getSize()` return a new object or a frozen object? Resolution: Returns a plain object. Callers should treat the result as immutable but the module does not enforce this with `Object.freeze()`. This avoids allocation overhead in hot paths.

5. **Cache invalidation on error.** If the first call detects columns=120 and caches it, then a later forced refresh encounters an error (columns=undefined), should the cache be invalidated? Resolution: Yes. A detection attempt that yields undefined or zero columns invalidates the cache and returns the fallback. Stale dimensions are worse than conservative fallback.

---

*Last updated: 2026-07-02. Status: Draft. Part of ANSDLC Phase 5A (Specification).*
