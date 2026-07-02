# F-007 -- Workspace Detection (Workspace Scanner Subsystem)

> Detect, validate, and locate ANSDLC project roots by scanning the filesystem for `.claude/` and `project-memory/` directories.
> Build Order #10: foundation for all file-reading features (F-008 through F-012). Depends on F-002 (CLI Entry Point). Appetite: Small (1-2 AI sessions).

---

## Press Release

**Aegis CLI -- Knows Where You Are Before You Do**

Aegis needs to read `.claude/` agents, `project-memory/` session logs, and `CLAUDE.md` rules to do its job. But what if you're three directories deep in `src/components/` when you type `aegis start`? What if someone symlinked the workspace into a monorepo? What if a directory is missing or unreadable?

F-007 handles all of this in two functions. `detectWorkspace(cwd)` walks up from your current directory, checking each level for `.claude/` and `project-memory/`. When it finds both at the same level, it reports `valid: true` with the absolute project root. When it finds only one, it tells you which is missing. When it finds neither, it tells you this is not an ANSDLC workspace.

The walk is smart -- it resolves symlinks through `fs.realpathSync()`, stops at filesystem boundaries (no infinite walks to `/` or `C:\`), and detects cycles with a max-depth guard. Permission errors are caught and reported as structured results, not uncaught exceptions. `validateWorkspace(cwd)` wraps the same logic and throws a typed `WorkspaceError` when the result is invalid, aligned with the Error Formatter's exit code conventions (code 2 for missing directories, code 3 for filesystem errors).

Every subsequent feature -- CLAUDE.md parser, agent scanner, git reader, project memory scanner, environment validator -- depends on this single, deterministic answer: "Is this an ANSDLC workspace, and where is its root?"

---

## FAQ

### Q: Why walk upward instead of just requiring the user to be at the project root?

A: Developers work from subdirectories constantly -- `cd src/cli/`, `cd tests/`, `cd project-memory/`. Requiring the user to be at the project root would break flow, force `cd` commands, and degrade the experience. Aegis works from wherever you are. The upward walk costs at most a few `fs.statSync` calls; it completes in under 1ms in practice.

### Q: What happens if only .claude/ is present but not project-memory/?

A: `detectWorkspace` returns `{ valid: false, missing: ['project-memory/'], root: '/abs/path' }`. The root is set to the directory where `.claude/` was found (the best candidate). This tells the caller: "You have part of a workspace here, but it is incomplete." The error formatter renders this as `[ERROR] Missing project-memory/ directory. ANSDLC 2.0 workspace requires project-memory/ with session logs and feature registry.` with exit code 2.

### Q: What happens if both directories are missing?

A: `detectWorkspace` returns `{ valid: false, missing: ['both'], notAnAnsdlc: true }`. No `root` field is set -- there is no project root to point to. The error formatter renders `[ERROR] Not an ANSDLC 2.0 workspace. Expected .claude/ and project-memory/ directories. Run this command from an ANSDLC 2.0 project root.` with exit code 2.

### Q: How does the walk handle symlinks?

A: Every directory in the walk path is resolved through `fs.realpathSync()` before checking for `.claude/` and `project-memory/`. If the cwd is a symlink to an ANSDLC workspace, the resolved path is used and detection succeeds. A max-depth guard (100 levels) prevents infinite loops from symlink cycles. If the guard is triggered, `detectWorkspace` returns an error result.

### Q: What if a directory in the walk is unreadable (EACCES)?

A: `detectWorkspace` catches the permission error and returns `{ valid: false, error: 'EACCES: permission denied, scandir \'/path/to/dir\'' }`. It does not crash, does not throw an uncaught exception, and does not print anything to the console. The caller decides how to surface the error -- typically via `validateWorkspace` which throws `WorkspaceError` with exit code 3 (fatal, because a filesystem error prevents any workspace operation).

### Q: What counts as a filesystem boundary?

A: On Unix, the walk stops when `path.dirname(current) === current` (the root `/` directory). On Windows, the walk stops when `path.dirname(current) === current` (the drive root, e.g., `C:\`). The walk does not cross drive letters on Windows. At the boundary, if neither directory was found, the result is `notAnAnsdlc: true`. If only one was found during the walk, the most recent location where a marker was found is used as the candidate root.

### Q: What happens if I call detectWorkspace with a null or empty cwd?

A: `null`, `undefined`, and `''` (empty string) cause `detectWorkspace` to fall back to `process.cwd()`. This guarantees the function always has a valid starting point. The fallback is explicit in the function implementation and tested.

---

## Success Criteria

1. **Both dirs present at root** -- `detectWorkspace(root)` returns `{ valid: true, root: '/abs/path' }` when both `.claude/` and `project-memory/` exist
2. **Upward walk from subdirectory** -- `detectWorkspace('/project/src/cli/')` walks up to `/project/` and detects both directories there, returning `{ valid: true, root: '/project/' }`
3. **Missing .claude/ reported** -- `detectWorkspace(root)` returns `{ valid: false, missing: ['.claude/'], root: '/abs/path' }` when only `project-memory/` is present
4. **Missing project-memory/ reported** -- `detectWorkspace(root)` returns `{ valid: false, missing: ['project-memory/'], root: '/abs/path' }` when only `.claude/` is present
5. **Both missing reports notAnAnsdlc** -- `detectWorkspace` returns `{ valid: false, missing: ['both'], notAnAnsdlc: true }` when neither directory is found; `root` is absent
6. **CWD fallback** -- `detectWorkspace(null)`, `detectWorkspace(undefined)`, and `detectWorkspace('')` all use `process.cwd()` as the starting directory
7. **Filesystem boundary stops walk** -- Walking from a deep path with no ANSDLC markers eventually reaches `/` (Unix) or `C:\` (Windows) and returns `notAnAnsdlc: true`; no infinite loop, no crash
8. **Symlink resolved** -- `detectWorkspace` resolves symlinks via `fs.realpathSync()` so a symlinked directory pointing to a valid workspace returns `valid: true` with the real (resolved) path
9. **Symlink cycle detected** -- A symlink cycle (A -> B -> A) triggers the max-depth guard and returns an error result; no infinite loop
10. **Permission error caught** -- `detectWorkspace` catches EACCES during the walk and returns `{ valid: false, error: 'EACCES: ...' }` without throwing
11. **validateWorkspace throws on invalid** -- `validateWorkspace(cwd)` calls `detectWorkspace` internally; if `valid === false`, it throws `WorkspaceError` with the appropriate message
12. **validateWorkspace returns void on valid** -- `validateWorkspace(cwd)` returns `undefined` (no throw) when `detectWorkspace` returns `valid: true`
13. **WorkspaceError exit codes** -- `WorkspaceError` for missing directories has exit code 2; for filesystem errors has exit code 3 (aligned with F-027)
14. **Non-existent directory returns error** -- `detectWorkspace('/nonexistent/path')` returns an error result; no uncaught exception

---

## Anti-Goals

1. **NOT scanning directory contents** -- F-007 only checks `.claude/` and `project-memory/` exist as directories. It does not read CLAUDE.md, parse agent files, scan git state, or validate `project-memory/` contents. Those are F-008 through F-012.
2. **NOT creating directories** -- F-007 is read-only. It never creates `.claude/` or `project-memory/`. No `aegis init`, no `mkdir -p`. ANSDLC workspaces are created manually or cloned.
3. **NOT a caching layer** -- Results are computed fresh on every call. No memoization, no persistent cache, no file watcher. Workspace structure is assumed stable during a CLI invocation.
4. **NOT asynchronous** -- `detectWorkspace` and `validateWorkspace` are synchronous. The workspace check happens at startup before any async operations (like git) begin.
5. **NOT responsible for error display** -- F-007 returns structured data or throws typed errors. It does not format output for the terminal, call `process.exit`, or print to stderr. Display is the Terminal UI subsystem's responsibility (F-027).
6. **NOT cross-drive on Windows** -- The walk does not traverse across drive letters (e.g., `C:\` to `D:\`). The filesystem boundary is the current drive root.

---

## Measurable Outcomes

| Metric | Target | How Measured |
|--------|--------|-------------|
| Valid workspace detection | 100% correct when both dirs present | Integration test with temp directory setup |
| Upward walk accuracy | Finds root from any subdirectory depth | Parametrized test with 1, 3, 10 levels deep |
| Missing directory identification | Correctly identifies which dir is missing (or both) | Tests with controlled directory presence |
| Symlink resolution | Returns realpath, not symlink path | Test with symlink to valid workspace |
| Cycle detection | Returns error, does not hang | Test with A -> B -> A symlink cycle |
| Permission error handling | Returns structured error, not throw | Test with chmod 000 on intermediate directory |
| CWD fallback | All three null/undefined/empty forms use process.cwd() | Parametrized test with stub on process.cwd() |
| WorkspaceError for invalid | Throws WorkspaceError with correct message and exit code | Unit test on validateWorkspace |
| Filesystem boundary | Stops at root, no infinite loop | Test with in-memory mock of filesystem root |
| Mutation score | >= 80% | Stryker mutation testing on detection source |

---

*Last updated: 2026-07-02. Status: Draft. Part of ANSDLC Phase 5A (Specification).*
