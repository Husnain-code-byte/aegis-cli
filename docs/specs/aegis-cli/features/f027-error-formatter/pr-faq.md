# F-027 -- Error Formatter (Terminal UI Subsystem)

> Consistent `[ERROR]`/`[WARN]`/`[FATAL]` rendering using the Color Manager (F-024).
> Build Order #9: core output primitive, depends on F-024 (Color Manager) for Theme. Appetite: Small (1-2 AI sessions).

---

## Press Release

**Aegis CLI -- Errors You Can Trust, Not Noise to Skim Past**

Every CLI tool prints errors. Most do it inconsistently -- red text here, a prefix there, sometimes stderr, sometimes stdout, exit codes that make no sense. Aegis now ships with a single, centralized error formatter that makes every error message predictable, parseable, and professional.

Type an unknown command? `[ERROR] Unknown command 'starrt'. Did you mean 'start'?` -- stderr, exit code 2, readable in any terminal. A session log is missing? `[WARN] No session log found. Defaulting to Phase 0 (Vision).` -- stderr, no crash, clear indication of what happened and what the fallback is. A YAML file is corrupted? `[FATAL] Corrupted YAML file: project-memory/06-session-log.md (line 42)` -- stderr, exit code 3, no ambiguity about severity.

Three functions, one contract. `formatError` returns a formatted string for composition and testing. `printError` writes to stderr and exits with the correct code. `printWarning` writes to stderr and continues. Every one of the 30+ error conditions across the CLI uses the same code path -- no more scattered `console.error('ERROR: ...')` calls with inconsistent formatting.

Pipe any Aegis command into a file. The `[ERROR]` prefix stays visible as plain text -- no ANSI escape codes bleeding into log files. Set `--no-color` and the styling disappears but the prefix text remains, because machine and human readers both need to distinguish severity levels.

---

## FAQ

### Q: Why not just use console.error everywhere?

A: Because scattered `console.error()` calls inevitably diverge. One developer writes `console.error("ERROR: ...")` with a colon. Another writes `process.stderr.write("Error - ...")` with a dash. A third forgets stderr entirely and prints to stdout. The Error Formatter is a single point of control: every caller gets identical prefix format, correct severity color, correct stderr stream, and correct exit code. If the format changes in the future, one file changes, not thirty.

### Q: What is the distinction between fatal, error, and warn?

A: Three levels, three behaviors:

- **fatal** (`[FATAL]`) -- The operation cannot continue because of irrecoverable state. Examples: corrupted files, parse errors, missing critical dependencies. Printed in red bold. Exit code 3. The user must fix something before retrying.
- **error** (`[ERROR]`) -- The operation cannot complete as requested, but the CLI itself is not broken. Examples: missing directory, invalid argument, file not found. Printed in red bold. Exit code 2. The user can correct input and retry.
- **warn** (`[WARN]`) -- The operation succeeds with degraded context. Examples: missing session log (defaults to Phase 0), no git repository (branch info unavailable). Printed in yellow bold. Exit code 0 (no exit). The user should be informed but does not need to take immediate action.

### Q: What happens to the prefix in no-color mode?

A: The prefix text `[ERROR]`, `[WARN]`, or `[FATAL]` remains visible as plain ASCII text -- no ANSI escape codes, no color, no bold. The message body is also plain text. This ensures that piped output, log files, and text-mode terminals all retain the severity indicator as readable text. The presence of the prefix itself conveys severity, even without color.

### Q: Can I override the exit code?

A: Yes. The `exitCode` option in `ErrorFormatOptions` overrides the severity's default exit code. Use this for cases like `aegis <unknown-command>` where the semantic severity is "error" (invalid input) but the convention demands exit code 1 instead of 2. `printError(theme, 'Unknown command', { severity: 'error', exitCode: 1 })` exits with code 1.

### Q: Why is the message body plain text while the prefix is styled?

A: Two reasons. First, the message body often contains variable content -- file paths, command names, suggestion text -- that would be visually noisy if styled inconsistently. Second, the prefix is the structural element that signals severity; coloring the prefix trains the user to recognize severity at a glance. The body is content, not structure, and plain text keeps it readable.

### Q: What happens if I pass an empty message?

A: `formatError(theme, '')` returns `"[ERROR] "` (prefix with trailing space and empty message). `printError(theme, '')` writes `"[ERROR] "` to stderr and exits. This is intentional: the prefix always appears even for empty messages, because the exit code and stderr output signal the error state. No crash, no silent failure. Callers should not pass empty messages, but if they do, the behavior is defined and predictable.

---

## Success Criteria

1. **formatError returns formatted string** -- `formatError(theme, 'msg', { severity: 'error' })` returns the string `"[ERROR] msg"` (styled) without writing to stdout or stderr and without calling process.exit
2. **Severity prefix matches level** -- `formatError` with severity `fatal` produces prefix `[FATAL]`, `error` produces `[ERROR]`, `warn` produces `[WARN]`
3. **Prefix styled via Color Manager** -- In full color mode, the prefix is wrapped with `theme.error` (for fatal/error) or `theme.warning` (for warn). The message body is plain text, not wrapped.
4. **printError writes to stderr and exits** -- `printError(theme, 'msg')` writes the formatted string to stderr and calls `process.exit(code)` with the severity's default exit code. The function does not return (return type `never`).
5. **printWarning writes to stderr without exiting** -- `printWarning(theme, 'msg')` writes `[WARN] msg` to stderr and returns. No `process.exit` call. The process continues normally.
6. **Default exit codes are correct** -- `fatal` exits 3, `error` exits 2, `warn` exits 0 (printWarning does not exit; if invoked via formatError it still produces `[WARN]` prefix)
7. **Custom exitCode overrides default** -- Passing `{ exitCode: 1 }` overrides the severity's default exit code; `process.exit` is called with 1 instead of 2 (for error) or 3 (for fatal)
8. **No-color mode preserves prefix text** -- With `theme.mode === 'none'`, the prefix `[ERROR]` appears as plain text without ANSI escape codes; the format is still `[ERROR] message`
9. **formatError is a pure function** -- Calling `formatError` with identical arguments always returns identical output. No side effects. No I/O. No state mutation.
10. **printWarning does not call process.exit** -- Tested by spying on `process.exit` and asserting it is never called after `printWarning` invocation

---

## Anti-Goals

1. **NOT a logging framework** -- No log levels beyond fatal/error/warn, no log rotation, no file output, no timestamps, no correlation IDs
2. **NOT responsible for error recovery** -- The Error Formatter formats and displays errors, but does not retry, fallback, or suggest recovery strategies beyond the static message passed by the caller
3. **NOT a console.error replacement for third-party code** -- Only unifies error output within Aegis CLI; does not intercept or reformat errors from chalk, boxen, or other libraries
4. **NOT multi-line formatted** -- Every error/warning is a single line. No code fences, no boxes, no structured formatting inside the error message body
5. **NOT interactive** -- No prompts, no confirmations, no "press enter to continue" inside the error path. Print and exit or print and continue.
6. **NOT i18n-capable** -- Error messages are English-only. No translation support, no locale detection, no message template strings with locale variables

---

## Measurable Outcomes

| Metric | Target | How Measured |
|--------|--------|-------------|
| formatError string output | 100% correct format `[LEVEL] message` with styled prefix | Unit test with string comparison |
| stderr output target | 100% of printError and printWarning calls write to stderr | Spy on `process.stderr.write` |
| process.exit called for printError | 100% of printError calls invoke process.exit exactly once | Spy on `process.exit`, assert called with correct code |
| process.exit NOT called for printWarning | 0% of printWarning calls invoke process.exit | Spy on `process.exit`, assert not called |
| Default exit codes match severity | fatal=3, error=2, warn=0 (no exit) | Assert on spy arguments for each severity |
| Custom exitCode override | exitCode option overrides default when provided | Compare spy arguments with and without exitCode option |
| No-color mode strips ANSI | formatError in no-color mode returns plain text with no `\x1b[` sequences | Regex check on output string |
| Message body not styled | In full color mode, the message body after the prefix contains no ANSI sequences | Split output at prefix boundary, assert second part has no `\x1b[` sequences |
| Mutation score | >= 80% | Stryker mutation testing on formatter source files |

---

*Last updated: 2026-07-02. Status: Draft. Part of ANSDLC Phase 5A (Specification).*
