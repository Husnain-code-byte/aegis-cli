# Test Plan — F-002: CLI Entry Point (Command Parser, Help, Version, Flags, Error Handling)

## Verification Architecture

### Test Stack

| Layer | Framework | Scope | File Pattern |
|-------|-----------|-------|-------------|
| Unit | Vitest | Pure functions: command registry, routing table, suggestion logic | `src/cli/**/*.test.ts` |
| Integration | Vitest | Full parse-and-route with argv mocking, handler spies | `tests/integration/parser.test.ts` |
| Property-based | fast-check (via Vitest) | Invariants over all command names, registry integrity | `src/cli/**/*.property.test.ts` |
| Mutation | Stryker | All production code under `src/cli/` (parser, router) | `src/cli/**/*.ts` (mutants) |

### Test Layers

```
┌─────────────────────────────────────────────────────┐
│              Property-Based Tests                    │
│  Invariants: valid kebab-case, no duplicates,       │
│  always routes, always non-empty help               │
├─────────────────────────────────────────────────────┤
│              Integration Tests                       │
│  argv mocking → parse → route → assert handler      │
│  spies on handler invocations, captures stdout/err  │
├─────────────────────────────────────────────────────┤
│              Unit Tests                              │
│  CommandRegistry.add(), .get(), .has()              │
│  SuggestionEngine.suggest(input, candidates)         │
│  FlagParser.parse(argv)                              │
│  Router.dispatch(command, args, flags)               │
└─────────────────────────────────────────────────────┘
```

---

## Test Type Details

### 1. Unit Tests

Test pure functions in isolation with no argv or process dependency.

| Module | Test Subject | What to Test |
|--------|-------------|-------------|
| `registry.ts` | `CommandRegistry` class | Add command, get handler, has command, list all, count |
| `router.ts` | `Router.dispatch()` | Select handler by command name, pass args object, pass flags object |
| `suggestions.ts` | `SuggestionEngine.suggest()` | Exact match, edit distance 1-3, no match, empty candidates |
| `flags.ts` | `parseFlags()` | Boolean flag detection, flag before/after command, combined flags, unknown flags ignored |
| `version.ts` | `getVersionString()` | Reads package.json, formats "aegis-cli v{version}" |

### 2. Integration Tests

Full parse-and-route using harness that mocks `process.argv` and captures output.

**Test Harness Interface:**
```typescript
interface ParseResult {
  command: string | null;
  args: Record<string, unknown>;
  options: Record<string, unknown>;
  handlerInvoked: string | null;
  stdout: string[];
  stderr: string[];
  exitCode: number;
}

function execute(argv: string[]): Promise<ParseResult>;
```

Each integration test:
1. Sets `process.argv = ['node', 'aegis', ...tokens]`
2. Imports and runs `main()`
3. Captures stdout/stderr via spy on `process.stdout.write` / `process.stderr.write`
4. Captures exit code via spy on `process.exit`
5. Asserts handler invocation via registered spies

### 3. Property-Based Tests

Using `fast-check` to verify invariants across generated inputs.

| Property | Input Generator | Invariant |
|----------|---------------|-----------|
| **Flag position independence** | Random permutations of `[command, --flag1, --flag2]` | Flags detected regardless of position |
| **Exit code consistency (invalid)** | Random invalid command strings (non-kebab, non-registered) | Exit code is always 1 for any string not in registry |
| **Suggestion correctness** | Random typos (edit distance <= 3) of known commands | Suggestion list includes the intended command |

### 3b. Parametrized Tests (Fixed Input Sets)

These are static-data tests iterating over known command names — not random generation, but grouped here for structural clarity.

| Test | Input Set | Invariant |
|------|----------|-----------|
| **Registry completeness (P001)** | All 8 registered command names | Each routes without error, handler invoked once |
| **Kebab-case validity (P002)** | All registered command names | All match `/^[a-z][a-z0-9]*(-[a-z][a-z0-9]*)*$/` |
| **No duplicate registrations (P003)** | Command names from source | `new Set(names).size === names.length` |
| **Help always non-empty (P004)** | All registered commands | `--help` on each produces stdout.length > 0 |
| **Exit code: valid commands (P005)** | All valid commands | Exit code is always 0 |
| **Exit code: invalid commands (P006)** | Pre-defined set of invalid inputs | Exit code is always 1 |

### 4. Mutation Testing

Using Stryker with the following configuration:
- **Mutator plugins:** TypeScript, ES5 (for transpiled output)
- **Threshold:** >= 80% mutation score
- **Target files:** `src/cli/index.ts`, `src/cli/router.ts`, `src/cli/registry.ts`, `src/cli/flags.ts`, `src/cli/suggestions.ts`
- **Ignore:** TypeScript type definitions, test files, configuration files

**Critical Mutations to Survive:**
| Mutation Type | Example | Why It Must Be Caught |
|--------------|---------|----------------------|
| Command removed from registry | Delete `start` from registry | Would make `aegis start` fail silently |
| Handler reference swapped | Swap start → phase handler | Wrong command behavior |
| Exit code changed | `exit(1)` → `exit(0)` on error | Breaks error-handling contract |
| Error prefix removed | Remove `[ERROR]` from stderr message | Breaks error format contract |
| Flag detection inverted | `--json` → not detected | Handler never receives flag |
| Suggestion removed | Return empty suggestions | User gets no guidance on typos |
| Version string changed | Wrong format | Breaks `--version` contract |

---

## Test Inventory

Each Gherkin scenario maps to one or more test cases. Test cases marked with `[P]` are property-based, `[U]` are unit, `[I]` are integration.

| # | Gherkin Scenario | Test ID | Test Case | Type | Assertions |
|---|-----------------|---------|-----------|------|------------|
| 1 | Route "start" command | T001 | Execute `aegis start`, assert start-handler invoked | I | handlerInvoked === "start-handler" |
| 2 | Route "phase" command | T002 | Execute `aegis phase`, assert phase-handler invoked | I | handlerInvoked === "phase-handler" |
| 3 | Route "prompt" command | T003 | Execute `aegis prompt`, assert prompt-handler invoked | I | handlerInvoked === "prompt-handler" |
| 4 | Route "agent" with name | T004 | Execute `aegis agent decomposition-guide`, assert agent-handler invoked with name | I | handlerInvoked === "agent-handler", args.name === "decomposition-guide" |
| 5 | Route "agent" without name | T005 | Execute `aegis agent`, assert agent-handler invoked with no name | I | handlerInvoked === "agent-handler", args.name === undefined |
| 6 | Route "status" command | T006 | Execute `aegis status`, assert status-handler invoked | I | handlerInvoked === "status-handler" |
| 7 | Route "config" with "key" | T007 | Execute `aegis config key`, assert config-handler invoked with subcommand | I | handlerInvoked === "config-handler", args.subcommand === "key" |
| 8 | Route "workflow" command | T008 | Execute `aegis workflow`, assert workflow-handler invoked | I | handlerInvoked === "workflow-handler" |
| 9 | Display version string | T009 | Execute `aegis --version`, assert "aegis-cli v0.1.0" | I | stdout[0] === "aegis-cli v0.1.0", exitCode === 0 |
| 10 | Display help with all commands | T010 | Execute `aegis --help`, assert all 8 commands listed | I | stdout contains all 8 command names, exitCode === 0 |
| 11 | No arguments shows help | T011 | Execute `aegis` with empty argv, assert output contains all 8 command names | I | stdout contains all 8 command names, exitCode === 0 |
| 12 | Parse --json flag | T012 | Execute `aegis start --json`, assert json option true | I | handlerInvoked === "start-handler", options.json === true |
| 13 | Parse --no-color flag | T013 | Execute `aegis status --no-color`, assert noColor option true | I | handlerInvoked === "status-handler", options.noColor === true |
| 14 | Flag before command | T014 | Execute `aegis --json status`, assert correct routing with json | I | handlerInvoked === "status-handler", options.json === true |
| 15 | Combined global flags | T015 | Execute `aegis --no-color --json phase`, assert both flags | I | handlerInvoked === "phase-handler", options.noColor === true, options.json === true |
| 16 | Unknown command suggestion | T016 | Execute `aegis starrt`, assert error and suggestion | I | stderr contains "[ERROR]" and "Unknown command" and "Did you mean", exitCode === 1 |
| 17 | Unknown command to stderr | T017 | Execute `aegis xyzzy`, assert stderr non-empty, stdout empty | I | stderr.length > 0, stdout.length === 0, exitCode === 1 |
| 18 | Case-sensitive matching | T018 | Execute `aegis START`, assert error and no handler invoked | I | stderr contains "[ERROR]", handlerInvoked === null, exitCode === 1 |
| 19 | Extra whitespace tolerance | T019 | Execute `aegis   status`, assert correct routing | I | handlerInvoked === "status-handler" |
| 20 | Config without subcommand | T020 | Execute `aegis config`, assert config help shown | I | stdout contains subcommand name "key", exitCode === 0 |
| 21 | Command-specific --help | T021 | Execute `aegis agent --help`, assert agent help, no handler | I | stdout contains "Usage" and "agent", handlerInvoked === null, exitCode === 0 |
| 22 | --help before command | T022 | Execute `aegis --help start`, assert global help, no handler | I | stdout contains all 8 commands, handlerInvoked === null, exitCode === 0 |
| 23 | Short version flag -V | T042 | Execute `aegis -V`, assert version output | I | stdout[0] === "aegis-cli v0.1.0", exitCode === 0 |
| 24 | Short help flag -h | T043 | Execute `aegis -h`, assert help output | I | stdout contains all 8 command names, exitCode === 0 |
| 25 | Explicit "help" command | T044 | Execute `aegis help`, assert global help | I | stdout contains all 8 command names, exitCode === 0 |
| 26 | Agent by numeric ID "00" | T045 | Execute `aegis agent 00`, assert agent handler with "00" | I | handlerInvoked === "agent-handler", args.name === "00" |
| 27 | Unknown flag with valid command | T046 | Execute `aegis start --unknown-flag`, assert no crash | I | handlerInvoked === "start-handler", stderr is empty, exitCode === 0 |
| 28 | No-suggestion for distant typo | T047 | Execute `aegis zzzzz`, assert error without "Did you mean" | I | stderr contains "[ERROR]" and "zzzzz", stderr does NOT contain "Did you mean", exitCode === 1 |
| 29 | Workflow stub output | T048 | Execute `aegis workflow`, assert coming-soon message | I | handlerInvoked === "workflow-handler", stdout contains "not yet implemented" |
| 30 | Workflow in help with coming soon | T049 | Execute `aegis --help`, assert workflow listed with tag | I | stdout contains "workflow" and "(coming soon)", exitCode === 0 |
| — | Registry completeness | P001 | For each of 8 commands, route and assert handler invoked | P | No error, 1 handler invocation per command |
| — | Kebab-case validity | P002 | All registered command names pass kebab-case regex | P | All match `/^[a-z][a-z0-9]*(-[a-z][a-z0-9]*)*$/` |
| — | No duplicate registrations | P003 | Command names form a set with unique entries | P | Names are unique (set size === array length) |
| — | Help always non-empty | P004 | Every command's --help produces output | P | stdout.length > 0 for each `aegis <cmd> --help` |
| — | Exit code consistency (valid) | P005 | All valid commands exit with code 0 | P | exitCode === 0 for all 8 commands |
| — | Exit code consistency (invalid) | P006 | Invalid command names exit with code 1 | P | exitCode === 1 for name not in registry |
| — | Registry add/get | U001 | Add command to registry, then get it back | U | registry.get("test") === handler |
| — | Registry has/lists | U002 | Add multiple commands, verify has() and list() | U | registry.has("test") === true, registry.list() includes "test" |
| — | Registry rejects duplicates | U003 | Add same command name twice | U | Throws Error on duplicate registration |
| — | Suggestion engine exact | U004 | Exact match returns empty suggestions | U | suggest("start", [...]) returns [] |
| — | Suggestion engine edit-1 | U005 | Typo within edit distance 1 returns suggestion | U | suggest("starrt", [...]) includes "start" |
| — | Suggestion engine no match | U006 | Typo far from any command returns empty | U | suggest("zzzzz", [...]) returns [] |
| — | Suggestion engine empty input | U007 | Empty string in candidates | U | suggest("start", []) returns [] |
| — | Flag parser boolean | U008 | `--json` parses as true | U | parseFlags(["--json"]).json === true |
| — | Flag parser combined | U009 | `--no-color --json` parses both | U | parseFlags(["--no-color", "--json"]).noColor === true && .json === true |
| — | Flag parser unknown ignored | U010 | Unknown flag `--foo` does not error | U | parseFlags(["--foo"]) does not throw |
| — | Version string format | U011 | getVersionString() returns correct format | U | Matches /^aegis-cli v\d+\.\d+\.\d+$/ |

---

## Edge Cases Beyond Gherkin

The following edge cases are NOT covered by the 30 Gherkin scenarios above. They must be tested explicitly.

### Input Boundary Conditions

| Edge Case | Input | Expected Behavior | Test ID |
|-----------|-------|-------------------|---------|
| Empty argv (node + script only) | `[]` or `["node", "aegis"]` | Show help, equivalent to no args | T023 |
| Only global flags, no command | `--json` | Show help (--json has no standalone effect in F-002) | T024 |
| Flag value (non-boolean) | `--json value` | Commander treats `--json` as boolean; `value` becomes standalone argument or error | T026 |
| `-V` short flag for version | `aegis -V` | Same as `--version`: output version string, exit 0 | T027 |
| `-h` short flag for help | `aegis -h` | Same as `--help`: output help text, exit 0 | T028 |
| `--help` with unknown command | `aegis unknown --help` | Commander shows global help (--help handled before routing); handler not invoked | T029 |
| Multiple arguments after agent | `aegis agent name extra` | Extra args passed to handler as remainder array | T030 |
| Numeric agent name | `aegis agent 00` | Treated as string "00", passed to handler | T031 |
| Agent name with special characters | `aegis agent decomposition-guide-v2` | Treated as string literal, passed to handler | T032 |
| Very long command name (>100 chars) | `aegis a-very-long-command-name-that-definitely-does-not-exist-in-the-registry...` | Should not crash; treated as unknown command | T033 |
| Unicode in command name | `aegis start--` (em-dash) or `aegis stürt` | Treated as unknown (not matched to "start") | T034 |
| Command as flag value | `aegis --json=start` | Commander errors on `--boolean=value` syntax for boolean flags | T035 |
| Repeated flags | `aegis --json --json status` | `--json` set to true twice; no error (idempotent boolean) | T036 |
| Multiple commands in one invocation | `aegis start status` | `status` treated as extra argument to start handler (Commander default: first positional is the command, rest are args) | T037 |
| `--no-color` with `--color` override | `aegis --no-color --color start` | Last flag wins per Commander conventions (`--color` unsets `--no-color`) | T038 |
| Double-dash separator | `aegis -- --json status` | Everything after `--` is literal; `--json` is not parsed as flag, `status` is not a command | T039 |
| `process.exit` called multiple times | Thrown error in handler after routing | Should not call exit twice; F-002 should guard with once() | T040 |
| SIGINT during parsing | Ctrl+C during argv scan | Should exit gracefully, not hang | T041 |

### Concurrency and State

| Edge Case | Scenario | Expected Behavior |
|-----------|----------|-------------------|
| Concurrent invocations | Two `aegis` processes parsing simultaneously | No shared state in parser (stateless by design) |
| Process.argv mutated during parse | External code modifies argv while parser runs | Parser should snapshot argv at start using `process.argv.slice(2)` |
| Re-entrant parser | Handler calls parser again | Not expected; parser is not re-entrant and should document this |

### Error Format Compliance

| Edge Case | Input | Expected stderr | Expected exit code |
|-----------|-------|----------------|-------------------|
| Unknown command | `aegis xyz` | `[ERROR] Unknown command 'xyz'.` | 1 |
| Missing required arg (if any) | Depends on handler | `[ERROR]` prefix + descriptive message | 1 |
| Internal parser error | Corrupted argv (null bytes) | `[ERROR]` prefix + message | 1 |

---

## Verification Gates

All gates must pass before F-002 is considered complete. Gates are ordered — stop at the first failure.

### Gate 1: TypeScript Compilation (Strict Mode)

```
$ pnpm typecheck
> No errors in src/cli/
```

- TypeScript strict mode enforced
- No `any` types in parser source
- All exported functions have explicit return types
- No `@ts-ignore` or `@ts-expect-error` in production code

### Gate 2: Unit Tests Pass

```
$ pnpm test:unit -- --run src/cli/
> PASS  All unit tests
```

- All unit tests (U001-U012) pass
- Coverage threshold: >= 90% statements, >= 80% branches
- Test files in `src/cli/**/*.test.ts`

### Gate 3: Integration Tests Pass

```
$ pnpm test -- --run tests/integration/parser.test.ts
> PASS  All integration tests
```

- All integration tests (T001-T049) pass
- Covers all 30 Gherkin scenarios
- Handler spies verify correct invocation
- stdout/stderr capture verifies output format
- Process exit code verified for every scenario

### Gate 4: Property-Based Tests Pass

```
$ pnpm test:property -- --run src/cli/
> PASS  All property tests
```

- All property-based tests (P001-P006) pass
- Minimum 100 runs per property
- No flaky tests (3 consecutive CI runs green)

### Gate 5: Mutation Score >= 80%

```
$ pnpm test:mutation
> Mutation score: >= 80%
```

- Stryker mutates all production code under `src/cli/`
- Threshold: >= 80% mutation score
- All surviving mutations reviewed and either:
  - Accepted as equivalent mutants (documented in `mutation-exemptions.md`), OR
  - New test added to kill the mutant

### Gate 6: Performance Benchmark

```
$ pnpm bench -- src/cli/parser.bench.ts
> Parse latency: < 50ms p95
```

- Measured over 100 iterations per command
- Measures full parse-and-route cycle including handler dispatch
- Benchmark runs in CI on the same hardware spec

### Gate 7: All Gherkin Scenarios Executable

```
$ pnpm test:specs -- f002-command-parser
> PASS  All 30 scenarios pass
```

- Gherkin scenarios are wired to test code via Vitest test runner with manual mapping
- Each scenario is independently runnable
- Scenario-to-test mapping documented

---

## Test File Structure

```
src/cli/
  index.ts                    # main(): bootstrap parser
  router.ts                   # Router: dispatch to handlers
  registry.ts                 # CommandRegistry: store/lookup commands
  flags.ts                    # parseFlags(): detect global flags
  suggestions.ts             # SuggestionEngine: Levenshtein suggestions
  version.ts                  # getVersionString(): read package.json version

  __tests__/
    registry.test.ts          # U001-U003: registry unit tests
    suggestions.test.ts       # U004-U007: suggestion engine unit tests
    flags.test.ts             # U008-U010: flag parser unit tests
    version.test.ts           # U011: version string unit test

    registry.property.test.ts # P001-P003: registry invariants
    routing.property.test.ts  # P004-P006: routing invariants

  __bench__/
    parser.bench.ts           # Parse latency measurement (Gate 6)

tests/integration/
  parser.test.ts              # T001-T028: integration tests for all scenarios

tests/mutation/
  stryker.config.json         # Stryker configuration
```

---

## Scenario-to-Test Mapping

| Gherkin Scenario | Test IDs | Type | Gate |
|-----------------|----------|------|------|
| Route "start" | T001 | Integration | Gate 3 |
| Route "phase" | T002 | Integration | Gate 3 |
| Route "prompt" | T003 | Integration | Gate 3 |
| Route "agent" with name | T004 | Integration | Gate 3 |
| Route "agent" without name | T005 | Integration | Gate 3 |
| Route "status" | T006 | Integration | Gate 3 |
| Route "config" with subcommand | T007 | Integration | Gate 3 |
| Route "workflow" | T008 | Integration | Gate 3 |
| Display version | T009, U011 | Integration + Unit | Gate 2 + 3 |
| Display help (all commands) | T010 | Integration | Gate 3 |
| No arguments shows help | T011 | Integration | Gate 3 |
| Parse --json flag | T012, U008 | Integration + Unit | Gate 2 + 3 |
| Parse --no-color flag | T013, U008 | Integration + Unit | Gate 2 + 3 |
| Flag before command | T014 | Integration | Gate 3 |
| Combined flags | T015, U009 | Integration + Unit | Gate 2 + 3 |
| Unknown command suggestion | T016 | Integration | Gate 3 |
| Unknown command to stderr | T017 | Integration | Gate 3 |
| Case-sensitive matching | T018 | Integration | Gate 3 |
| Extra whitespace | T019 | Integration | Gate 3 |
| Config without subcommand | T020 | Integration | Gate 3 |
| Command-specific --help | T021 | Integration | Gate 3 |
| --help before command | T022 | Integration | Gate 3 |
| Edge cases T023, T024, T026-T028 | T023, T024, T026-T028 | Integration | Gate 3 |
| Edge cases T029-T041 | T029-T041 | Integration | Gate 3 |
| New scenarios T042-T046 | T042-T046 | Integration | Gate 3 |
| New scenarios T047-T049 | T047-T049 | Integration | Gate 3 |
| Registry completeness | P001 | Property | Gate 4 |
| Kebab-case validity | P002 | Property | Gate 4 |
| No duplicate registrations | P003, U003 | Property + Unit | Gate 2 + 4 |
| Help always non-empty | P004 | Property | Gate 4 |
| Exit code consistency | P005, P006 | Property | Gate 4 |
| Registry add/get/has/list | U001-U003 | Unit | Gate 2 |
| Suggestion engine | U004-U007 | Unit | Gate 2 |
| Flag parser | U008-U010 | Unit | Gate 2 |

---

## Dependencies and Mocking

### External Dependencies (to mock in unit tests)

| Dependency | Reason to Mock | Mock Strategy |
|-----------|---------------|--------------|
| `process.argv` | Tests need controlled argv | `vi.stubGlobal('process', { argv: [...] })` |
| `process.exit` | Tests must not exit | `vi.spyOn(process, 'exit').mockImplementation(() => {})` |
| `process.stdout` | Capture output | `vi.spyOn(process.stdout, 'write')` |
| `process.stderr` | Capture error output | `vi.spyOn(process.stderr, 'write')` |
| `package.json` | Version string | Mock import or `vi.mock('../../package.json')` |
| Commander `program.parseAsync()` | Router uses Commander | Test through integration layer; mock only for unit tests of Router class |

### External Dependencies (NOT to mock in integration tests)

| Dependency | Reason |
|-----------|--------|
| Commander v15 | Integration tests test real Commander behavior |
| `fast-levenshtein` | Suggestion accuracy depends on real Levenshtein |
| `console.error` | Captured via stderr spy, not mocked |

---

## Assumptions and Open Questions

### Assumptions

1. **Commander v15 default behavior for unknown commands**: Commander v15's `.exitOverride()` is used to capture the default unknown-command handling rather than implementing custom logic. The `[ERROR]` prefix is added by wrapping Commander's output.
2. **Flag position handling**: Commander v15 handles flags before and after commands natively. No custom flag repositioning is needed. `.allowUnknownOption(true)` is set on the Commander program to let unknown flags (e.g., `--unknown-flag`) pass through without error while still parsing known flags (`--json`, `--no-color`). This is different from `passThroughOptions` which would stop parsing known flags after the first non-option argument.
3. **Subcommand help**: Commander v15's built-in `.help()` is used for `aegis config` without subcommand.
4. **ESM-only**: Commander v15 is ESM-only. Test files must use ESM imports (`import`, not `require`).
5. **`process.argv[0]` is Node.js binary and `process.argv[1]` is script path**: Parser always slices `process.argv.slice(2)`.

### Open Questions (resolved by architect, 2026-07-02)

1. **`--json` without a command:** Has no effect without a command — flags are parsed but only meaningful when a command follows. If no command is present, help is shown. **Resolved.**
2. **Error message format:** `[ERROR] Unknown command '<input>'. Did you mean '<suggestion>'?` on stderr, single line. Up to 3 suggestions shown, comma-separated. **Resolved.**
3. **`aegis --help start` behavior:** Commander v15 handles `--help` before the router sees the command. `--help` anywhere in argv triggers Commander's built-in help handler, so `aegis --help start` shows global help (Commander consumes `--help` and ignores `start`). This is expected Commander v15 default behavior, not an Aegis bug. **Resolved — non-issue for F-002 scope.**
4. **Suggestion count:** Maximum of 3 suggestions, ordered by Levenshtein distance (closest first). If no command is within edit distance 3, show `[ERROR] Unknown command '<input>'.` with no suggestion clause. **Resolved.**
5. **`aegis workflow` visibility:** Listed as a visible command in help text with `(coming soon)` suffix. It is a registered command with a stub handler that outputs "Workflow management is not yet implemented." **Resolved.**

---

*Last updated: 2026-07-02. Status: Draft. Part of ANSDLC Phase 5A (Specification).*
