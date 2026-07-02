# Test Plan -- F-007: Workspace Detection

## Verification Architecture

### Test Stack

| Layer | Framework | Scope | File Pattern |
|-------|-----------|-------|-------------|
| Unit | Vitest | Pure functions: detectWorkspace, validateWorkspace, walk logic, path resolution | `src/workspace/**/*.test.ts` |
| Integration | Vitest | Full filesystem interaction with temp directories, symlinks, permission manipulation | `tests/integration/workspace-detection.test.ts` |
| Property-based | fast-check (via Vitest) | Invariants over walk behavior, output structure | `src/workspace/*.property.test.ts` |
| Mutation | Stryker | All production code under `src/workspace/` (detection, validation, types) | `src/workspace/**/*.ts` (mutants) |

### Test Layers

```
+-----------------------------------------------------+
|              Property-Based Tests                    |
|  Invariants: idempotence, root is absolute,         |
|  valid iff both dirs exist, deterministic           |
+-----------------------------------------------------+
|              Integration Tests                       |
|  Temp directories, symlinks, chmod, real fs calls   |
|  Sandboxed in os.tmpdir(), cleaned after each test  |
+-----------------------------------------------------+
|              Unit Tests                              |
|  detectWorkspace with mocked fs, process.cwd()      |
|  validateWorkspace wrapping detectWorkspace         |
|  WalkDirection._walkUp() pure traversal             |
+-----------------------------------------------------+
```

---

## Test Type Details

### 1. Unit Tests

Test detection and validation logic with filesystem and process dependencies mocked.

| Module | Test Subject | What to Test |
|--------|-------------|-------------|
| `workspace.ts` | `detectWorkspace(cwd?)` | Valid workspace, missing one dir, missing both, null/undefined/empty cwd, filesystem boundary, symlink resolution, permission error, non-existent path |
| `workspace.ts` | `validateWorkspace(cwd)` | Calls detectWorkspace, throws on invalid, returns void on valid, correct exit codes on WorkspaceError |
| `walk.ts` | `_walkUp(startPath, markers)` | Pure traversal: returns list of checked paths, stops at boundary, resolves symlinks, detects cycles, handles EACCES |

### 2. Integration Tests

Full filesystem interaction using temp directories created in `os.tmpdir()`.

**Test Harness:**
```typescript
interface WorkspaceFixture {
  root: string;
  subdir: string;
  cleanup: () => void;
}

function createWorkspaceFixture(): WorkspaceFixture;   // Creates temp dir with .claude/ and project-memory/
function addSymlink(target: string, link: string): void;
function removePermission(dir: string): void;
```

Each integration test:
1. Creates a temp directory with controlled structure
2. Calls `detectWorkspace` or `validateWorkspace` with a real path
3. Asserts on returned `WorkspaceDetection` object or thrown error
4. Cleans up the temp directory in `afterEach`

### 3. Property-Based Tests

Using `fast-check` to verify invariants across generated inputs.

| Property | Input Generator | Invariant |
|----------|---------------|-----------|
| **Idempotence (P001)** | Same cwd called twice | `detectWorkspace(path)` called twice returns deep-equal results |
| **Absolute root (P002)** | Any valid workspace path | When `root` is present, `path.isAbsolute(root) === true` |
| **Mutual exclusion (P003)** | Any path | `valid === true` iff `missing` is absent AND `notAnAnsdlc` is absent AND `error` is absent |
| **Determinism (P004)** | Random subdirectory of workspace | Same cwd returns same result across all invocations |
| **Valid iff both exist (P005)** | Arbitrary directory trees | For each directory D: `valid === true` at D iff `.claude/` and `project-memory/` both exist in D |
| **Upward monotonicity (P006)** | Path P and subpath S of P | If `detectWorkspace(P)` is valid, then `detectWorkspace(S)` has the same root as `detectWorkspace(P)` |

### 3b. Parametrized Tests (Fixed Input Sets)

| Test | Input Set | Invariant |
|------|----------|-----------|
| **All cwd null forms (P007)** | `[null, undefined, ""]` | All three fall back to `process.cwd()` and produce identical results |
| **Subdirectory depths (P008)** | `[0, 1, 3, 10]` levels deep | Root found correctly regardless of depth |
| **Single dir missing (P009)** | `.claude/` missing, `project-memory/` missing | Each produces the correct missing array |

### 4. Mutation Testing

Using Stryker with the following configuration:
- **Mutator plugins:** TypeScript, ES5 (for transpiled output)
- **Threshold:** >= 80% mutation score
- **Target files:** `src/workspace/workspace.ts`, `src/workspace/walk.ts`
- **Ignore:** TypeScript type definitions, test files, configuration files

**Critical Mutations to Survive:**
| Mutation Type | Example | Why It Must Be Caught |
|--------------|---------|----------------------|
| Both-dir check inverted | `&&` changed to `\|\|` | Would mark workspace valid when only one dir exists |
| Dir name comparison broken | `.claude` != `.claude/` | Would never match the expected directory name |
| Walk direction reversed | Walk down instead of up | Would never find root from a subdirectory |
| Max depth guard removed | Remove cycle detection | Infinite loop on symlink cycle |
| Permission error swallowed | `catch {}` instead of `catch -> error result` | Silent failure on EACCES |
| Valid flag always true | `valid: true` hardcoded | False positive on any non-workspace directory |
| Root path not resolved | Return symlink path instead of realpath | Downstream features read wrong location |
| CWD fallback removed | `null` cwd throws instead of falling back | Breaks null-safe usage |
| Exit code changed | exit code 2 to exit code 1 | Inconsistent error contract with F-027 |

---

## Test Inventory

Each Gherkin scenario maps to one or more test cases. Test cases marked with `[P]` are property-based, `[U]` are unit, `[I]` are integration.

| # | Gherkin Scenario | Test ID | Test Case | Type | Assertions |
|---|-----------------|---------|-----------|------|------------|
| 1 | Detect valid workspace from root | T001 | Create temp workspace, call detectWorkspace(root) | I | valid === true, root === abs path, no missing, no error |
| 2 | Detect valid from subdirectory | T002 | Call detectWorkspace from subdir 3 levels deep | I | valid === true, root === workspace root |
| 3 | validateWorkspace succeeds | T003 | Call validateWorkspace from valid workspace | I | No throw, returns undefined |
| 4 | Missing only .claude/ | T004 | Create workspace without .claude/, call detectWorkspace | I | valid === false, missing === [".claude/"], root set, no notAnAnsdlc |
| 5 | Missing only project-memory/ | T005 | Create workspace without project-memory/, call detectWorkspace | I | valid === false, missing === ["project-memory/"], root set |
| 6 | Missing both (notAnAnsdlc) | T006 | Create dir with neither marker, call detectWorkspace | I | valid === false, missing === ["both"], notAnAnsdlc === true, no root |
| 7 | validateWorkspace throws for missing dirs | T007 | Call validateWorkspace on incomplete workspace | I | Throws WorkspaceError, message contains "Missing", exitCode === 2 |
| 8 | validateWorkspace throws for notAnAnsdlc | T008 | Call validateWorkspace on non-workspace directory | I | Throws WorkspaceError, message contains "Not an ANSDLC 2.0 workspace", exitCode === 2 |
| 9 | CWD fallback null | T009 | Stub process.cwd, call detectWorkspace(null) | U | Uses process.cwd(), correct result |
| 10 | CWD fallback undefined | T010 | Stub process.cwd, call detectWorkspace(undefined) | U | Uses process.cwd(), correct result |
| 11 | CWD fallback empty string | T011 | Stub process.cwd, call detectWorkspace("") | U | Uses process.cwd(), correct result |
| 12 | Filesystem root boundary | T012 | Call detectWorkspace from deep path with no markers above | I | Walk stops at "/", notAnAnsdlc === true |
| 13 | Symlink resolution | T013 | Create symlink to valid workspace, call detectWorkspace | I | valid === true, root === realpath (not symlink) |
| 14 | Symlink cycle error | T014 | Create A->B->A symlink cycle, call detectWorkspace | I | valid === false, error contains cycle/max-depth message |
| 15 | Permission denied (EACCES) | T015 | Create workspace dir with 000 permissions, call detectWorkspace | I | valid === false, error contains "EACCES" |
| 16 | Non-existent path | T016 | Call detectWorkspace with non-existent absolute path | I | valid === false, error contains "ENOENT" |
| -- | Idempotence | P001 | Same path called twice | P | Two results are deep-equal |
| -- | Root is absolute | P002 | All valid results | P | root always path.isAbsolute |
| -- | Mutual exclusion | P003 | All results | P | valid, missing, error are mutually consistent |
| -- | Determinism | P004 | Same path, multiple calls | P | Identical results |
| -- | Valid iff both exist | P005 | Arbitrary directory trees | P | valid === both dirs exist at that level |
| -- | Upward monotonicity | P006 | Parent/child paths | P | Subdirectory root matches parent root |
| -- | All cwd null forms | P007 | null, undefined, "" | P | All produce same result |
| -- | Subdirectory depths | P008 | 0, 1, 3, 10 levels | P | Root found at every depth |
| -- | Single dir missing | P009 | .claude/ only, project-memory/ only | P | Correct missing array each case |

---

## Edge Cases Beyond Gherkin

The following edge cases are NOT covered by the 16 Gherkin scenarios above. They must be tested explicitly.

### Input Boundary Conditions

| Edge Case | Input | Expected Behavior | Test ID |
|-----------|-------|-------------------|---------|
| cwd is a relative path | `"subdir"` or `"./subdir"` | Resolved to absolute via `path.resolve()` | T017 |
| cwd with trailing slash | `"/workspace/"` | Normalized; same as `"/workspace"` | T018 |
| cwd with dot segments | `"/workspace/./src/../src"` | Normalized via `path.resolve()` before walk | T019 |
| Very deep directory (200 levels) | Deep nested path with no markers | Walk stops at filesystem boundary, not timed out | T020 |
| .claude is a file, not directory | `/workspace/.claude` is a regular file | Should NOT be treated as present (must be a directory) | T021 |
| project-memory is a file, not directory | `/workspace/project-memory` is a regular file | Should NOT be treated as present | T022 |
| Both markers present but empty directories | `.claude/` and `project-memory/` both exist but empty | Still valid -- existence is the check, not content | T023 |
| Unicode in path | `"/workspace/projet-ete/.claude"` | Handled correctly by `fs.realpathSync` | T024 |
| Path with spaces | `"/workspace/my project/.claude"` | Handled correctly by all fs operations | T025 |
| Windows drive letter alternate root | `D:\` as boundary (Windows-only) | Walk stops at `D:\`, returns notAnAnsdlc | T026 |
| Junction point (Windows) | Directory junction to workspace | Walk resolves junction via realpathSync | T027 |
| Nested .claude inside .claude | `.claude/.claude/` | Detects the outer `.claude/` in the walk | T028 |

### Concurrency and State

| Edge Case | Scenario | Expected Behavior |
|-----------|----------|-------------------|
| Filesystem changes between calls | Directory added/removed between two detectWorkspace calls | No caching -- each call re-reads the filesystem |
| Multiple concurrent detectWorkspace calls | Two parallel invocations (rare in sync context) | Stateless, no shared mutation; safe |
| process.cwd() changes mid-call | External code invokes `process.chdir()` while detectWorkspace runs | DetectWorkspace uses the passed cwd or snapshots process.cwd() at call time |
| Realpath resolves to different location over time | Symlink target changes between calls | Each call re-resolves, no stale cache |

### Error Format Compliance

| Edge Case | Error Source | Expected exitCode | Expected error type |
|-----------|-------------|-------------------|-------------------|
| Missing .claude/ | validateWorkspace | 2 | WorkspaceError |
| Missing project-memory/ | validateWorkspace | 2 | WorkspaceError |
| Missing both (notAnAnsdlc) | validateWorkspace | 2 | WorkspaceError |
| EACCES on walk | validateWorkspace | 3 | WorkspaceError (fatal) |
| ENOENT (non-existent path) | validateWorkspace | 3 | WorkspaceError (fatal) |
| Symlink cycle | validateWorkspace | 3 | WorkspaceError (fatal) |

---

## Verification Gates

All gates must pass before F-007 is considered complete. Gates are ordered -- stop at the first failure.

### Gate 1: TypeScript Compilation (Strict Mode)

```
$ pnpm typecheck
> No errors in src/workspace/
```

- TypeScript strict mode enforced
- No `any` types in detection source
- All exported functions have explicit return types
- No `@ts-ignore` or `@ts-expect-error` in production code

### Gate 2: Unit Tests Pass

```
$ pnpm test:unit -- --run src/workspace/
> PASS  All unit tests
```

- All unit tests pass
- Coverage threshold: >= 90% statements, >= 80% branches
- Test files in `src/workspace/**/*.test.ts`

### Gate 3: Integration Tests Pass

```
$ pnpm test -- --run tests/integration/workspace-detection.test.ts
> PASS  All integration tests
```

- All integration tests (T001-T028) pass
- Covers all 16 Gherkin scenarios
- Temp directories cleaned up after each test
- No cross-test filesystem state leakage

### Gate 4: Property-Based Tests Pass

```
$ pnpm test:property -- --run src/workspace/
> PASS  All property tests
```

- All property-based tests (P001-P009) pass
- Minimum 100 runs per property
- No flaky tests (3 consecutive CI runs green)

### Gate 5: Mutation Score >= 80%

```
$ pnpm test:mutation
> Mutation score: >= 80%
```

- Stryker mutates all production code under `src/workspace/`
- Threshold: >= 80% mutation score
- All surviving mutations reviewed and either:
  - Accepted as equivalent mutants (documented in `mutation-exemptions.md`), OR
  - New test added to kill the mutant

### Gate 6: All Gherkin Scenarios Executable

```
$ pnpm test:specs -- f007-workspace-detection
> PASS  All 16 scenarios pass
```

- Gherkin scenarios wired to test code via Vitest with manual mapping
- Each scenario independently runnable
- Scenario-to-test mapping documented

---

## Test File Structure

```
src/workspace/
  workspace.ts              # detectWorkspace(), validateWorkspace(), WorkspaceDetection type
  walk.ts                   # _walkUp() internal traversal logic
  errors.ts                 # WorkspaceError class

  __tests__/
    workspace.test.ts       # T009-T011: CWD fallback unit tests
    walk.test.ts            # Pure walk function unit tests

    workspace.property.test.ts  # P001-P009: invariants

tests/integration/
  workspace-detection.test.ts   # T001-T028: integration tests for all scenarios

tests/mutation/
  stryker.config.json       # Stryker configuration
```

---

## Scenario-to-Test Mapping

| Gherkin Scenario | Test IDs | Type | Gate |
|-----------------|----------|------|------|
| Valid workspace from root | T001 | Integration | Gate 3 |
| Valid from subdirectory | T002 | Integration | Gate 3 |
| validateWorkspace succeeds | T003 | Integration | Gate 3 |
| Missing only .claude/ | T004 | Integration | Gate 3 |
| Missing only project-memory/ | T005 | Integration | Gate 3 |
| Missing both (notAnAnsdlc) | T006 | Integration | Gate 3 |
| validateWorkspace throws (missing) | T007 | Integration | Gate 3 |
| validateWorkspace throws (notAnAnsdlc) | T008 | Integration | Gate 3 |
| CWD fallback null | T009 | Unit | Gate 2 |
| CWD fallback undefined | T010 | Unit | Gate 2 |
| CWD fallback empty string | T011 | Unit | Gate 2 |
| Filesystem root boundary | T012 | Integration | Gate 3 |
| Symlink resolution | T013 | Integration | Gate 3 |
| Symlink cycle error | T014 | Integration | Gate 3 |
| Permission denied | T015 | Integration | Gate 3 |
| Non-existent path | T016 | Integration | Gate 3 |
| Additional edge cases T017-T028 | T017-T028 | Integration | Gate 3 |
| Idempotence | P001 | Property | Gate 4 |
| Root is absolute | P002 | Property | Gate 4 |
| Mutual exclusion | P003 | Property | Gate 4 |
| Determinism | P004 | Property | Gate 4 |
| Valid iff both exist | P005 | Property | Gate 4 |
| Upward monotonicity | P006 | Property | Gate 4 |
| All cwd null forms | P007 | Property | Gate 4 |
| Subdirectory depths | P008 | Property | Gate 4 |
| Single dir missing | P009 | Property | Gate 4 |

---

## Dependencies and Mocking

### External Dependencies (to mock in unit tests)

| Dependency | Reason to Mock | Mock Strategy |
|-----------|---------------|--------------|
| `fs.existsSync` | Tests need controlled filesystem | `vi.spyOn(fs, 'existsSync')` |
| `fs.statSync` | Tests need controlled stat results | `vi.spyOn(fs, 'statSync')` |
| `fs.realpathSync` | Symlink resolution | `vi.spyOn(fs, 'realpathSync')` |
| `fs.accessSync` | Permission checks | `vi.spyOn(fs, 'accessSync')` |
| `process.cwd()` | CWD fallback tests | `vi.spyOn(process, 'cwd')` |
| `path.resolve` | Path normalization | Via `vi.mock('path')` in unit tests only |

### External Dependencies (NOT to mock in integration tests)

| Dependency | Reason |
|-----------|--------|
| `fs.existsSync`, `fs.statSync`, `fs.realpathSync` | Integration tests test real filesystem interaction |
| `path.resolve`, `path.dirname`, `path.isAbsolute` | Path manipulation is deterministic; no benefit to mocking |
| `process.cwd()` | Integration tests use explicit absolute paths, not cwd |

### Mock Strategy for Unit Tests

Unit tests for `detectWorkspace` mock all `fs.*` calls to return controlled results:

```typescript
// Example: test "missing .claude/" scenario
vi.spyOn(fs, 'existsSync').mockImplementation((p: string) => {
  if (p.endsWith('/project-memory')) return true;
  if (p.endsWith('/.claude')) return false;
  return true; // parent dirs exist
});
vi.spyOn(fs, 'realpathSync').mockImplementation((p: string) => p);
vi.spyOn(fs, 'statSync').mockImplementation(() => ({ isDirectory: () => true }) as fs.Stats);
```

---

## Assumptions and Open Questions

### Assumptions

1. **Directory existence is sufficient** -- `detectWorkspace` checks that `.claude/` and `project-memory/` exist as directories. It does not check their contents. Empty directories are considered valid.
2. **Synchronous only** -- Both `detectWorkspace` and `validateWorkspace` are synchronous. No async variants. The filesystem check happens before any async operations begin.
3. **`path.dirname` for root detection** -- On Unix, `path.dirname('/') === '/'` is the boundary check. On Windows, `path.dirname('C:\\') === 'C:\\'` is the boundary check. Node.js `path` module handles platform detection.
4. **Symlink resolution via `fs.realpathSync`** -- `fs.realpathSync` resolves symlinks and returns a canonical path. The max-depth guard is separate (a simple counter variable). `fs.realpathSync` has its own internal symlink limit; the guard is an additional safety layer.
5. **One `missing` value means everything** -- When `.claude/` is missing, `missing` is `['.claude/']`. When `project-memory/` is missing, `missing` is `['project-memory/']`. When both are missing, `missing` is `['both']` (not `['.claude/', 'project-memory/']`). This simplifies downstream checks.
6. **`notAnAnsdlc` is true only when both missing** -- If `.claude/` is missing but `project-memory/` is present, `notAnAnsdlc` is `false` (not set). The semantics: "notAnAnsdlc" means "no trace of an ANSDLC workspace at all."

### Open Questions (resolved by architect, 2026-07-02)

1. **What should `root` be when both directories are missing?** Resolved: `root` is absent when `notAnAnsdlc` is true. There is no project root to report.
2. **What is the max depth for the walk?** Resolved: 100 levels. This is far deeper than any real workspace hierarchy, but prevents infinite loops from symlink cycles. The guard is checked on every directory ascent.
3. **Should `detectWorkspace` throw or return error results?** Resolved: Return structured `WorkspaceDetection` results for all filesystem outcomes (including errors). The caller (`validateWorkspace`) converts error states to thrown `WorkspaceError` for use in command handlers. This keeps `detectWorkspace` as a pure-ish query function.
4. **How does `detectWorkspace` distinguish "not a directory" from "does not exist"?** Resolved: `fs.statSync().isDirectory()` check. If `.claude` exists as a file, it is not treated as a valid `.claude/` directory. The result is the same as if it were missing.
5. **Should the upward walk continue past a level where only one marker is found?** Resolved: Yes. The walk continues upward until it finds a level where BOTH markers exist. If it reaches the filesystem boundary without finding both, it returns the best candidate (the highest level where at least one marker was found). If one marker was found at one level and the other marker at a different level, the root is the higher of the two levels and the missing array reflects what is missing at that root.

---

*Last updated: 2026-07-02. Status: Draft. Part of ANSDLC Phase 5A (Specification).*
