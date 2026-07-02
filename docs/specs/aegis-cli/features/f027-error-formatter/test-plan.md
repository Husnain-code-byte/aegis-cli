# Test Plan -- F-027: Error Formatter

## Verification Architecture

### Test Stack

| Layer | Framework | Scope | File Pattern |
|-------|-----------|-------|-------------|
| Unit | Vitest | Pure functions: formatError string assembly, severity prefix selection, message body passthrough, options handling | `src/ui/__tests__/error-formatter.test.ts` |
| Integration | Vitest | stderr spy verification, process.exit spy verification, Theme integration with full/basic/none modes, custom exit code override | `tests/integration/error-formatter.test.ts` |
| Property-based | fast-check (via Vitest) | Invariants over formatError: pure function identity, string type preservation, prefix invariant, no-color identity | `src/ui/__tests__/error-formatter.property.test.ts` |
| Mutation | Stryker | All production code under `src/ui/` formatter source | `src/ui/error-formatter.ts` (mutants) |

### Test Layers

```
+---------------------------------------------------------------+
|                 Property-Based Tests                           |
|  Invariants: pure function idempotency, prefix always present,|
|  message body always preserved, string type preservation,     |
|  mode consistency between formatError and printError          |
+---------------------------------------------------------------+
|                 Integration Tests                              |
|  stderr write verification, process.exit spy,                 |
|  Theme integration (full/basic/none), custom exit code,       |
|  combined printError + printWarning in sequence               |
+---------------------------------------------------------------+
|                 Unit Tests                                     |
|  formatError string assembly, severity prefix selection,      |
|  default options behavior, exitCode override,                 |
|  empty/null/undefined message handling,                       |
|  message body always plain text                               |
+---------------------------------------------------------------+
```

---

## Test Type Details

### 1. Unit Tests

Test formatError, printError, and printWarning in complete isolation. Theme is injected as a test double -- not a real Color Manager theme -- so tests never depend on chalk behavior or TTY state.

| Module | Test Subject | What to Test |
|--------|-------------|-------------|
| `error-formatter.ts` | formatError string assembly | Prefix `[ERROR]`/`[WARN]`/`[FATAL]` prepended with single space before message |
| `error-formatter.ts` | formatError severity mapping | `{ severity: 'fatal' }` produces `[FATAL]`, `error` produces `[ERROR]`, `warn` produces `[WARN]` |
| `error-formatter.ts` | formatError default severity | Calling `formatError(theme, 'msg')` with no options defaults to `severity: 'error'` |
| `error-formatter.ts` | formatError message body preservation | Message body appears verbatim after prefix; no trimming, no modification, no styling |
| `error-formatter.ts` | formatError empty message | `formatError(theme, '')` returns `"[ERROR] "` (prefix with trailing space, empty message) |
| `error-formatter.ts` | printError delegates to formatError | `printError(theme, 'msg')` calls `process.stderr.write` with the return value of `formatError(theme, 'msg')` |
| `error-formatter.ts` | printError calls process.exit | `process.exit` called with correct default exit code per severity |
| `error-formatter.ts` | printError custom exitCode | `{ exitCode: 1 }` overrides the default exit code |
| `error-formatter.ts` | printError returns never | Function has return type `never`; TypeScript verifies no fallthrough after `process.exit` |
| `error-formatter.ts` | printWarning does not call process.exit | `process.exit` is never called; function returns `void` |
| `error-formatter.ts` | printWarning uses warn severity | Output always uses `[WARN]` prefix regardless of any options passed |
| `error-formatter.ts` | formatError pure function | Multiple calls with identical arguments return identical string; no side effects |
| `error-formatter.ts` | Theme usage in prefix | Prefix wrapped with `theme.error(...)` for fatal/error, `theme.warning(...)` for warn; message body NOT wrapped through theme |
| `error-formatter.ts` | Options not mutated | The options argument object is not modified during function execution |

### 2. Integration Tests

Full integration with real Theme objects (from F-024 Color Manager) to verify the colored output actually contains ANSI escape sequences in full/basic mode and is plain text in none mode.

**Test Harness Interface:**
```typescript
interface ErrorFormatterTestHarness {
  formatError(theme: Theme, message: string, options?: ErrorFormatOptions): string;
  printError(theme: Theme, message: string, options?: ErrorFormatOptions): void;
  printWarning(theme: Theme, message: string): void;
  createTheme(options?: ColorOptions): Theme;
  spyStderr(): SpyInstance;
  spyExit(): SpyInstance;
  reset(): void;
}
```

**Test Pattern (each integration test):**
1. Create a fresh harness with spied stderr and exit
2. Create a theme in the desired mode (full/basic/none)
3. Call the function under test
4. Assert on output, stderr calls, exit calls
5. Reset spies and restore stderr/exit for next test

**ANSI Output Verification:**

Output in full/basic mode must have ANSI escape sequences in the prefix portion and NO ANSI sequences in the message body portion.

```typescript
function hasAnsiCodes(str: string): boolean {
  return /\x1b\[/.test(str);
}

function stripPrefix(formatted: string): { prefix: string; body: string } {
  const match = formatted.match(/^(\[[A-Z]+\])(.*)$/);
  if (!match) throw new Error('Unexpected format');
  return { prefix: match[1], body: match[2] };
}
```

### 3. Property-Based Tests

Using `fast-check` to verify invariants across generated string inputs. Each property runs a minimum of 100 iterations per run and must be deterministic across all runs.

| Property | Input Generator | Invariant |
|----------|---------------|-----------|
| **Pure function idempotency (P001)** | `fc.string()`, `fc.constantFrom('fatal','error','warn')` | `forAll s, sev: formatError(theme, s, { severity: sev })` -- repeated calls with same args return identical string (===) |
| **Prefix always present (P002)** | `fc.string()`, `fc.constantFrom('fatal','error','warn')` | `forAll s, sev: output.startsWith('[' + severityLabel(sev) + ']')` -- every output has a severity prefix |
| **Message body preserved (P003)** | `fc.string({ minLength: 1 })` | `forAll s: output.endsWith(s)` -- the exact input message appears at the end of the output |
| **String type preservation (P004)** | `fc.string()` | `forAll s: typeof formatError(theme, s) === 'string'` -- never returns undefined, null, or non-string |
| **No-color identity (P005)** | `fc.string()` | `forAll s: formatError(noneTheme, s, { severity: 'error' }) === "[ERROR] " + s` -- in no-color mode, output is plain text with no ANSI |
| **Empty string prefix (P006)** | `fc.constant("")` | `forAll: formatError(theme, "")` with each severity returns `"[SEVERITY] "` (prefix, space, empty body) |
| **Severity label matches (P007)** | `fc.string()`, `fc.constantFrom('fatal','error','warn')` | `forAll s, sev: formatLabelFor(sev) is exactly "[FATAL]", "[ERROR]", or "[WARN]"` |

**Property execution requirements:**
- Minimum 100 iterations per property per CI run
- No `.filter()` to exclude edge cases -- instead document known limitations
- Properties must be independently runnable (not dependent on test order)
- Unicode, emoji, and control characters in message body must not break prefix formatting
- Properties must not call process.exit (formatError only, never printError/printWarning in property tests)

### 4. Mutation Testing

Using Stryker with the following configuration:

| Parameter | Value |
|-----------|-------|
| Test runner | Vitest |
| Mutator plugins | TypeScript |
| Threshold | >= 80% mutation score |
| Target files | `src/ui/error-formatter.ts` |
| Ignore | Type definitions, test files, configuration files, re-export index.ts |
| CI enforcement | Build fails if score < 80% |

**Critical Mutations That Must Be Caught:**

| Mutation Type | Example | Why It Must Be Caught |
|--------------|---------|----------------------|
| Severity prefix wrong | `'fatal'` maps to `[ERROR]` instead of `[FATAL]` | Wrong prefix misleads users about severity |
| Prefix order inverted | Message before prefix instead of after | Breaks the `[LEVEL] message` contract |
| Exit code wrong | `'error'` exits with 3 instead of 2 | Wrong exit code breaks script automation |
| Message body styled | Message wrapped through `theme.error()` | ANSI codes in body content break readability |
| Default severity wrong | No options defaults to 'fatal' instead of 'error' | Overly alarming default behavior |
| printError doesn't exit | `process.exit` call removed | Process continues running after fatal error |
| printWarning exits | `process.exit` call added to printWarning | Process terminates for non-fatal warnings |
| stderr vs stdout swapped | Output written to stdout instead of stderr | Breaks pipe/redirect separation |
| Space separator missing | Output `[ERROR]msg` instead of `[ERROR] msg` | Inconsistent with documented format |
| No-color still styled | ANSI codes emitted in no-color mode | Escape codes leak into piped output |
| Case sensitivity wrong | `[error]` instead of `[ERROR]` | Inconsistent with documented format |
| Severity case wrong | `[Fatal]` instead of `[FATAL]` | Inconsistent casing between severities |
| Empty message crashes | Empty string causes TypeError or crash | Error reporting itself must never fail |

---

## Test Inventory

### Gherkin Scenario Mapping

| # | Gherkin Scenario | Test IDs | Type | Key Assertions |
|---|-----------------|----------|------|---------------|
| 1 | formatError returns formatted string with correct severity prefix | T001 | Unit | Output format `[ERROR] Directory not found`, no I/O, no exit |
| 2 | formatError produces different prefixes for each severity level | T002 | Unit | fatal -> `[FATAL]`, error -> `[ERROR]`, warn -> `[WARN]` |
| 3 | formatError styles prefix and leaves message body plain | T003 | Integration | Prefix has ANSI codes, body has none (full mode) |
| 4 | formatError is a pure function | T004 | Unit + Property | Same args -> same result; no stderr/exit side effects |
| 5 | printError writes to stderr and exits with default code | T005 | Integration | stderr write exactly once, exit(2) for error severity |
| 6 | printError exits with default code per severity | T006 | Integration | fatal->exit(3), error->exit(2) |
| 7 | printError with exitCode overrides default | T007 | Integration | exitCode:1 overrides default error exit 2 |
| 8 | printWarning writes to stderr without exiting | T008 | Integration | stderr write exactly once, exit never called |
| 9 | formatError in no-color mode produces plain text | T009 | Integration | Output is `"[ERROR] message"`, no `\x1b[` sequences |
| 10 | printError in no-color mode writes plain text and exits | T010 | Integration | stderr output has no ANSI, exit called |
| 11 | formatError with empty message | T011 | Unit | Returns `"[ERROR] "` with trailing space |
| 12 | formatError with warn severity does not cause exit | T012 | Unit | Right prefix, no exit side effect |

### Additional Unit Tests

| Test ID | Test Case | Type | Assertions |
|---------|-----------|------|------------|
| U001 | formatError with no options defaults to error severity | Unit | Output starts with `[ERROR]` |
| U002 | formatError with undefined options | Unit | Same behavior as no options (defaults to error severity) |
| U003 | formatError with null message | Unit | Message coerces to `"null"` string, output is `"[ERROR] null"` |
| U004 | formatError with message containing special characters | Unit | Unicode, emoji, newlines preserved in message body |
| U005 | formatError with message containing leading/trailing whitespace | Unit | Whitespace preserved verbatim in output |
| U006 | printError with fatal severity exits with code 3 | Unit | `process.exit` called with 3 |
| U007 | printError with warn severity exits with code 0 | Unit | `process.exit` called with 0 (warn via printError exits) |
| U008 | printWarning ignores options (always uses warn prefix) | Unit | `printWarning(theme, 'msg', { severity: 'fatal' })` still outputs `[WARN]` |
| U009 | Theme functions called correctly (spy) | Unit | `theme.error` called for fatal/error, `theme.warning` called for warn, `theme.bold` not called |
| U010 | process.stderr.write called with exactly the formatted string | Unit | No extra newlines, no extra spaces, no concatenation |
| U011 | process.exit not called before stderr.write | Unit | Order: stderr write happens before exit call |
| U012 | printWarning with empty message | Unit | Writes `"[WARN] "` to stderr, no exit |

### Additional Integration Tests

| Test ID | Test Case | Type | Assertions |
|---------|-----------|------|------------|
| I001 | printError in basic color mode | Integration | Prefix has ANSI, body does not, exit called with correct code |
| I002 | printError with json mode theme (no-color) | Integration | Plain text output, exit called |
| I003 | printError followed by printWarning in sequence | Integration | Both write to stderr, first exits, second does not execute (dead code) |
| I004 | Repeated printError calls are isolated | Integration | Each call independently writes to stderr and calls exit |
| I005 | Theme.error/warning function identity preserved across calls | Integration | Same theme used for multiple formatError/printError calls produces consistent output |
| I006 | Very long message (>10k chars) | Integration | Complete message preserved in output, no truncation |
| I007 | Message with existing ANSI codes | Integration | Existing ANSI codes in message body are not stripped or modified |
| I008 | printWarning followed by normal output | Integration | After printWarning, process continues and can write more output |

### Property-Based Tests

| Test ID | Property | Generator | Invariant | Runs |
|---------|----------|-----------|-----------|------|
| P001 | Pure function idempotency | `fc.string()`, `fc.constantFrom('fatal','error','warn')` | `forall s, sev: fn(fn(...)) === fn(...)` -- repeated calls return identical result | >= 100 |
| P002 | Prefix always present | `fc.string()`, `fc.constantFrom('fatal','error','warn')` | `forall s, sev: output matches /^\[(FATAL|ERROR|WARN)\]/` | >= 100 |
| P003 | Message body preserved | `fc.string()` | `forall s: output ends with s` -- message appears verbatim at end | >= 100 |
| P004 | String type preservation | `fc.string()` | `forall s: typeof output === 'string'` | >= 100 |
| P005 | No-color plain text | `fc.string()` | `forall s: output has no \x1b[ sequences in no-color mode` | >= 100 |
| P006 | Empty string | `fc.constant("")`, `fc.constantFrom('fatal','error','warn')` | `forall sev: output === "[" + label + "] "` | >= 100 |
| P007 | Severity label correctness | `fc.constantFrom('fatal','error','warn')` | `forall sev: label is exactly "[FATAL]", "[ERROR]", or "[WARN]"` | >= 100 |

---

## Mocking Strategy

### process.stderr.write

The stderr write must be spied (not mocked) to verify the exact string and count of writes:

```typescript
const stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);

// After test
expect(stderrSpy).toHaveBeenCalledTimes(1);
expect(stderrSpy).toHaveBeenCalledWith(expectedFormattedString);

// Reset
stderrSpy.mockRestore();
```

### process.exit

The exit call MUST be mocked -- calling `process.exit` in tests would terminate the test runner:

```typescript
const exitSpy = vi.spyOn(process, 'exit').mockImplementation((code?: number) => {
  // Do NOT call the real process.exit -- test would terminate
  // Capture the code for assertion
  return undefined as never;
});

// After test
expect(exitSpy).toHaveBeenCalledTimes(1);
expect(exitSpy).toHaveBeenCalledWith(2);

// Reset
exitSpy.mockRestore();
```

### Theme

For unit tests, inject a minimal Theme test double (no chalk dependency):

```typescript
function createTestTheme(mode: ThemeMode = 'full'): Theme {
  const wrap = (s: string) => mode === 'none' ? s : `\x1b[31m${s}\x1b[0m`;
  return {
    mode,
    error: (s: string) => wrap(s),
    warning: (s: string) => wrap(s),
    success: (s: string) => s,
    info: (s: string) => s,
    phase: (s: string) => s,
    muted: (s: string) => s,
    heading: (s: string) => s,
    bold: (s: string) => mode === 'none' ? s : `\x1b[1m${s}\x1b[0m`,
    dim: (s: string) => s,
    italic: (s: string) => s,
  };
}
```

For integration tests, use real `createTheme` from F-024 with mocked chalk level and TTY state.

### Test Isolation Requirements

- Each test must reset stderr and exit spies in `afterEach`
- `printError` tests must be isolated from each other because `process.exit` is mocked but the function is designed to not return
- Never call the real `printError` without mocking `process.exit` first
- Test `printError` last in a test file, or ensure each test has its own spy reset

---

## Edge Cases Beyond Gherkin

### Output Format Edge Cases

| Edge Case | Scenario | Expected Behavior | Test ID |
|-----------|----------|-------------------|---------|
| Null message | `formatError(theme, null)` | Coerces to `"null"` string, output `"[ERROR] null"` | U003 |
| Undefined message | `formatError(theme, undefined)` | Coerces to `"undefined"`, output `"[ERROR] undefined"` | U003 |
| Message with only whitespace | `formatError(theme, "   ")` | Output `"[ERROR]    "` with spaces preserved | U005 |
| Message with newlines | `formatError(theme, "line1\nline2")` | Output `"[ERROR] line1\nline2"` with newlines in body | U004 |
| Message with unicode/emoji | `formatError(theme, "file emoji.txt ")` | Unicode preserved verbatim | U004 |
| Very long message (100k chars) | `formatError(theme, "a".repeat(100000))` | Full message preserved, no truncation | I006 |
| Message with existing ANSI codes | `formatError(theme, "\x1b[31mred\x1b[0m")` | Existing ANSI codes in body are not stripped | I007 |

### Severity Edge Cases

| Edge Case | Scenario | Expected Behavior | Test ID |
|-----------|----------|-------------------|---------|
| Unknown severity string | `formatError(theme, 'msg', { severity: 'critical' })` | Should be prevented by TypeScript; if at runtime, TypeScript compile error should catch before runtime | -- |
| Severity via printWarning with override | `printWarning(theme, 'msg', { severity: 'fatal' })` | printWarning always uses `[WARN]` prefix regardless of options | U008 |
| warn via printError | `printError(theme, 'msg', { severity: 'warn' })` | Outputs `[WARN]`, exits with code 0 | U007 |
| exitCode 0 with fatal | `printError(theme, 'msg', { severity: 'fatal', exitCode: 0 })` | Exits with code 0 (override takes priority) | T007 |

### Process Interaction Edge Cases

| Edge Case | Scenario | Expected Behavior | Test ID |
|-----------|----------|-------------------|---------|
| printError called twice in same process | Second call never executed (process.exit on first) | First call calls exit and function never returns; second call is dead code | I004 |
| printWarning after printError | printWarning never executes (first printError exits) | Dead code by construction -- OK | I003 |
| printWarning followed by normal output | `printWarning(...); console.log('continue');` | Both execute; warning written, then normal output continues | I008 |
| process.exit mocked and returns | printError returns undefined instead of never | With mock, function returns undefined; test verifies exit was called | T005 |
| stderr.write throws | `process.stderr.write` throws an error | Error propagates up; process.exit is NOT called (standard error handling) | -- |

### No-Color Mode Edge Cases

| Edge Case | Scenario | Expected Behavior | Test ID |
|-----------|----------|-------------------|---------|
| JSON mode theme | Theme with mode 'none' due to JSON output | Plain text output, no ANSI | I002 |
| Basic color theme | Theme with mode 'basic' | Same behavior as full: prefix styled, body plain | I001 |
| Mixed color/other styles | theme.warning returns bold+muted+yellow | Prefix receives whatever theme.warning returns; no override | I005 |

### Concurrency and State

| Edge Case | Scenario | Expected Behavior |
|-----------|----------|-------------------|
| formatError called from async callback | Promise.then handler | Pure function, safe from any async context |
| Multiple formatError calls in parallel | Concurrent Promise.all | Each call is independent; no shared mutable state |
| Theme mutated between calls | Theme is frozen (F-024 contract) | Theme is immutable by contract; behavior is deterministic |
| process.exit mocked across tests | Spy restored in afterEach | Each test gets a fresh spy; no cross-test leakage |

---

## Verification Gates

All gates must pass before F-027 is considered complete. Gates are ordered -- stop at the first failure.

### Gate 1: TypeScript Compilation (Strict Mode)

```
$ pnpm typecheck
> No errors in src/ui/
```

Requirements:
- TypeScript strict mode enabled
- No `any` types in error formatter source files
- All exported functions have explicit return types
- `printError` has return type `never`
- `printWarning` has return type `void`
- `formatError` has return type `string`
- `ErrorFormatOptions` interface correctly typed with optional `severity` and `exitCode`
- No `@ts-ignore` or `@ts-expect-error` in production code

### Gate 2: Unit Tests Pass

```
$ pnpm test:unit -- --run src/ui/__tests__/error-formatter.test.ts
> PASS  All unit tests
```

Requirements:
- All unit tests (T001-T004, T011-T012, U001-U012) pass
- Coverage threshold: >= 90% statements, >= 80% branches
- Theme test double used (not real createTheme)
- Every severity level tested for formatError prefix
- Empty message, null message, and special character messages tested
- Default options tested (no options passed)

### Gate 3: Integration Tests Pass

```
$ pnpm test -- --run tests/integration/error-formatter.test.ts
> PASS  All integration tests
```

Requirements:
- All integration tests (T005-T010, I001-I008) pass
- Real Theme objects from createTheme used (not test doubles)
- stderr and exit spies installed and restored per test
- Both full and no-color modes tested for formatError and printError
- Custom exitCode override tested
- printWarning tested: stderr write confirmed, exit not called
- ANSI presence/absence verified by regex on actual output strings
- Prefix styled / body plain verified by splitting output at the closing bracket

### Gate 4: Property-Based Tests Pass

```
$ pnpm test:property -- --run src/ui/__tests__/error-formatter.property.test.ts
> PASS  All property tests
```

Requirements:
- All property-based tests (P001-P007) pass
- Minimum 100 runs per property
- No flaky tests (3 consecutive CI runs green with >= 100 iterations each)
- Unicode, emoji, whitespace, and control characters do not break properties
- Property tests only use formatError (never printError/printWarning -- no process.exit)

### Gate 5: Mutation Score >= 80%

```
$ pnpm test:mutation
> Mutation score: >= 80%
```

Requirements:
- Stryker mutates all production code under `src/ui/error-formatter.ts`
- Threshold: >= 80% mutation score (killed mutants / total mutants)
- All surviving mutants reviewed and either:
  - Accepted as equivalent mutants (functionally identical code, no test can distinguish), documented in `mutation-exemptions.md`
  - OR new test case added to kill the mutant
- Pipeline fails if score < 80%

### Gate 6: All Gherkin Scenarios Executable

```
$ pnpm test:specs -- f027-error-formatter
> PASS  All 12 scenarios pass
```

Requirements:
- Gherkin scenarios are wired to test code (manual mapping via Vitest test runner, or Gherkin runner)
- Each scenario is independently runnable -- no shared state between scenarios
- Scenario-to-test mapping is documented and kept in sync with the feature file

---

## Test File Structure

```
src/ui/
  error-formatter.ts           # formatError, printError, printWarning exports
  error-formatter.types.ts     # Severity, ErrorFormatOptions type definitions

  __tests__/
    error-formatter.test.ts           # T001-T004, T011-T012, U001-U012: unit tests
    error-formatter.property.test.ts  # P001-P007: property invariants

tests/integration/
  error-formatter.test.ts      # T005-T010, I001-I008: stderr/exit/theme integration

tests/mutation/
  stryker.config.json          # Stryker configuration (targets, thresholds, ignore patterns)
```

---

## Scenario-to-Test Mapping

| # | Gherkin Scenario | Test IDs | Type | Verification Gate |
|---|-----------------|----------|------|-------------------|
| 1 | formatError returns formatted string with correct severity prefix | T001, U001, U002 | Unit | Gate 2 |
| 2 | formatError produces different prefixes for each severity level | T002 | Unit | Gate 2 |
| 3 | formatError styles prefix and leaves message body plain | T003 | Integration | Gate 3 |
| 4 | formatError is a pure function with no side effects | T004, P001 | Unit + Property | Gate 2 + 4 |
| 5 | printError writes to stderr and exits with default code | T005 | Integration | Gate 3 |
| 6 | printError exits with default exit code for each severity | T006, U006, U007 | Integration + Unit | Gate 2 + 3 |
| 7 | printError with exitCode option overrides default exit code | T007 | Integration | Gate 3 |
| 8 | printWarning writes to stderr and does not call process.exit | T008, U008, U012 | Integration + Unit | Gate 2 + 3 |
| 9 | formatError in no-color mode produces plain text | T009, P005 | Integration + Property | Gate 3 + 4 |
| 10 | printError in no-color mode writes plain text and exits | T010, I002 | Integration | Gate 3 |
| 11 | formatError with empty message string | T011, P006 | Unit + Property | Gate 2 + 4 |
| 12 | formatError with warn severity does not cause exit | T012 | Unit | Gate 2 |
| -- | Edge cases: null message, special chars, long message | U003-U005, I006-I007 | Unit + Integration | Gate 2 + 3 |
| -- | Basic color mode integration | I001 | Integration | Gate 3 |
| -- | Print sequence isolation | I003-I004 | Integration | Gate 3 |
| -- | Property invariants: prefix, body, type, labels | P001-P007 | Property | Gate 4 |

---

## Dependencies and Mocking

### External Dependencies (to mock/spy in unit tests)

| Dependency | Reason to Mock/Spy | Strategy |
|-----------|--------------------|---------|
| `process.stderr.write` | Verify exact stderr output and call count | `vi.spyOn(process.stderr, 'write').mockImplementation(() => true)` |
| `process.exit` | Prevent test termination; verify exit code | `vi.spyOn(process, 'exit').mockImplementation(() => undefined as never)` |
| `Theme` object | Controlled color mode and style functions | Test double (unit tests); real createTheme (integration tests) |

### External Dependencies (NOT to mock)

| Dependency | Reason |
|-----------|--------|
| String concatenation | Core JS behavior; never mock |
| Template literals | Core JS behavior; never mock |
| `ErrorFormatOptions` object reading | Test behavior of options, not the interpreter; use real objects |

---

## Assumptions and Open Questions

### Assumptions

1. **printError never returns:** The `never` return type is enforced by TypeScript. At runtime, `process.exit` terminates the process. If `process.exit` is mocked in tests, the function returns `undefined`. Mock implementations must handle this gracefully.

2. **Single-line format:** Every error/warning is a single line. The message body should not contain newlines (callers are responsible for this), but if it does, the newlines appear in the output after the prefix. No multi-line prefix formatting.

3. **Theme contract from F-024:** The Theme object always has `error`, `warning`, and `bold` functions that accept a string and return a string. The `mode` property is always one of `'full'`, `'basic'`, or `'none'`. If any of these contracts change in F-024, F-027 must be updated.

4. **process.exit is synchronous:** Node.js `process.exit(code)` terminates synchronously. No callbacks, no promises, no timer callbacks execute after `process.exit`. The printError function relies on this.

5. **stderr is always writable:** `process.stderr.write` returns a boolean but the Error Formatter does not check the return value. In the extremely unlikely scenario that stderr is not writable, the write silently fails and the exit still happens.

6. **Severity is always one of three values:** TypeScript enforces the union type `'fatal' | 'error' | 'warn'`. The implementation should handle unknown values defensively (e.g., default to `'error'`), but the type system prevents this at compile time.

7. **printWarning accepts no severity override:** The function signature does not include an `options` parameter. Even if the caller passes a fourth argument, it is ignored. The prefix is always `[WARN]`.

### Open Questions

1. **Should printError and printWarning add a trailing newline to the output?**
   Resolution: Yes. The formatted string should end with `\n` to ensure proper terminal line separation. Callers should not need to append newlines. The Gherkin scenarios and tests should be updated to expect trailing newlines if this is confirmed. **Decision: Yes, add trailing newline.** The format is `[LEVEL] message\n`.

2. **Should formatError also include the trailing newline?**
   Resolution: No. formatError returns the raw formatted string without newline. Callers who want a newline add it themselves. printError/printWarning are responsible for the newline when writing to stderr. This keeps formatError useful for composition where the caller may want to control line breaks.

3. **What happens when printError is called with both `exitCode` and non-error severity?**
   Resolution: `exitCode` always overrides. `printError(theme, 'msg', { severity: 'warn', exitCode: 5 })` exits with code 5. The prefix is still `[WARN]` because the severity controls the prefix; `exitCode` only controls the exit code.

4. **What happens if theme.error or theme.warning throws?**
   Resolution: The Error Formatter does not catch errors from theme functions. If a theme function throws, the error propagates. The CLI's top-level error handler (F-002) is responsible for catching unhandled errors and displaying them. The Error Formatter itself is not an error recovery mechanism.

5. **Should the formatter accept a raw string prefix override?**
   Resolution: No. The prefix is always determined by the severity parameter. No custom prefix support. If a caller wants a custom prefix, they should format the string themselves.

6. **What about `console.error` vs `process.stderr.write`?**
   Resolution: Use `process.stderr.write` directly. `console.error` adds formatting (spaces, newlines) that would conflict with the precise output format. The Error Formatter controls the exact byte sequence sent to stderr.

7. **Should `printError` flush stderr before exiting?**
   Resolution: `process.exit` flushes stderr automatically in Node.js. No explicit flush needed. If this proves unreliable in specific Node.js versions, add `process.stderr.write` sync drain as a future fix.

---

*Last updated: 2026-07-02. Status: Draft. Part of ANSDLC Phase 5A (Specification).*
