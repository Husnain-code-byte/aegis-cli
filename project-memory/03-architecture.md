# Architecture

> C4 model diagrams, architecture decisions, and design principles for Aegis CLI. Created during Phase 3 (Architecture Design).

---

## C4 System Context

See: `docs/architecture/system-context.puml`

The Aegis CLI sits at the center of the ANSDLC 2.0 development workflow. A **Developer** types CLI commands into Aegis (`aegis start`, `aegis phase`, `aegis agent`, `aegis prompt`, `aegis status`, `aegis config key`) and receives terminal output with context-aware prompts. The Developer then copies these prompts into **Claude Code**, which executes them by reading the workspace files and sending API calls to the **DeepSeek API**.

Aegis is a **read-only, local-only, terminal-only** tool:
- **Read-only:** Never modifies workspace files (no `aegis init`, no automated file edits)
- **Local-only:** No network calls at runtime (except npm installation)
- **Terminal-only:** No GUI, no web server, no daemon

Key external systems:
- **ANSDLC Workspace** — Project directory with `.claude/` (agents, commands, rules), `project-memory/` (session logs, feature registry, architecture), and `CLAUDE.md`. This is the data source for all Aegis operations.
- **Claude Code** — Anthropic's AI coding assistant. Consumes Aegis-generated prompts.
- **DeepSeek API** — LLM inference backend. Claude Code sends prompts here.
- **npm Registry** — Distribution channel for `npm install -g aegis-cli`.

---

## C4 Container Diagram

See: `docs/architecture/containers.puml`

| Container | Type | Description |
|-----------|------|-------------|
| **Aegis CLI** | Node.js CLI (Commander + chalk) | The tool itself. Generates context-aware prompts from workspace state. |
| **ANSDLC Workspace** | File System | Project directory with `.claude/`, `project-memory/`, CLAUDE.md, git repo. |
| **Config Store** | File System | `conf` JSON file at OS-correct path for API key storage. |
| **Claude Code** | External CLI | Anthropic's AI coding assistant. Receives pasted prompts. |
| **DeepSeek API** | External API | LLM inference backend. |
| **npm Registry** | External Registry | Package distribution channel. |

The Aegis CLI container reads from the ANSDLC Workspace (read-only) and the Config Store (read-write for API key management). The Developer interacts with both Aegis CLI (typing commands) and Claude Code (pasting prompts). Aegis generates prompts that flow to Claude Code via the Developer's copy-paste action.

---

## Package Architecture

Aegis CLI is organized into 8 packages within the `src/` directory, each with a well-defined responsibility and dependency direction.

### Package Map

```
src/
├── cli/           # CLI Entry Point — command parser, router, help/version
├── scanner/       # Workspace Scanner — file system I/O, detection, validation
├── engine/        # Phase Engine — phase detection from project artifacts
├── generator/     # Prompt Generator — template loading, context assembly, prompt building
├── ui/            # Terminal UI — rendering, colors, layouts, progress bars
├── catalog/       # Agent Catalog — agent metadata, lookup, display
├── store/         # Config Store — API key management, preferences, environment detection
└── shared/        # Shared Utilities — types, constants, errors, logger
```

### Dependency Direction

```
cli
  ├── scanner   (workspace detection, file parsing, git state)
  ├── engine    (phase detection, phase map)
  ├── generator (prompt assembly, template rendering)
  ├── ui        (terminal rendering, colors, layouts)
  ├── catalog   (agent metadata, lookup)
  ├── store     (config management, API key)
  └── shared    (types, constants, errors, logger)

scanner   -> shared   (types, constants, errors)
engine    -> shared   (types, constants, phase map)
generator -> engine   (PhaseResult for context assembly)
generator -> catalog  (AgentCatalog for agent-specific prompts)
generator -> shared   (types, constants, errors)
ui        -> shared   (colors, types, constants, terminal detection)
catalog   -> shared   (types, constants, errors)
store     -> shared   (types, errors, logger)
```

**Critical rule: NO package depends on `cli`.** The CLI package is the top-level orchestrator. Every other package can be tested independently of the CLI routing layer.

### Package Responsibilities

#### `cli/` — CLI Entry Point (6 features: F-002 to F-006)
Command parser (Commander v15), command routing, help generation, version flag, global flags (`--no-color`, `--json`), unknown command handling. This is the only package that imports from all others.

#### `scanner/` — Workspace Scanner (6 features: F-007 to F-012)
Detects `.claude/` and `project-memory/` directories. Parses `CLAUDE.md` frontmatter and rules. Scans `.claude/agents/*.md` files. Reads git state (branch, commit, working tree status). Scans `project-memory/` for session logs and feature registry. Validates Node.js version, platform, and TTY capabilities.

#### `engine/` — Phase Engine (4 features: F-013 to F-016)
Implements the phase detection priority chain: session log -> feature registry -> default Phase 0. Contains the static phase map (all 9 phases with names, descriptions, gates, and agent mappings). Resolves multi-feature ambiguity via most-recently-updated IN_PROGRESS tiebreaker.
See ADR-0003 for the detection algorithm.

#### `generator/` — Prompt Generator (6 features: F-017 to F-022)
Loads JSON templates from embedded build-time imports (see ADR-0004). Assembles context from scanner, engine, and catalog outputs. Builds agent-specific and phase-specific prompts. Generates the quick-start prompt for `aegis start`. Formats output for clipboard copy.

#### `ui/` — Terminal UI (6 features: F-023 to F-028)
Wraps chalk, boxen, gradient-string, and figlet for consistent terminal output. Implements graceful degradation for color level, Unicode support, and terminal width. Renders the 9-phase progress bar. Formats errors and warnings with consistent `[ERROR]`/`[WARN]` prefixes. Composes the full dashboard layout for `aegis start`.

#### `catalog/` — Agent Catalog (4 features: F-029 to F-032)
Loads all 24 agent definitions from `.claude/agents/*.md` frontmatter (via @11ty/gray-matter). Supports lookup by name, number, or alias. Renders agent detail cards and directory summaries.

#### `store/` — Config Store (4 modules)
Manages DeepSeek API key storage via `conf` JSON at OS-correct path. Checks `DEEPSEEK_API_KEY` env var first, falls back to conf, prompts interactively if neither. Provides `aegis config key` command handler.
See ADR-0002 for the storage strategy.

#### `shared/` — Shared Utilities (4 modules)
TypeScript interfaces and types (`Workspace`, `PhaseResult`, `AgentRecord`, `Prompt`, `Config`). Constants (phase names, exit codes, ANSDLC version string). Typed error classes with exit codes (`WorkspaceError`, `ParseError`, `ConfigError`). Structured logger that routes data to stdout and progress/errors to stderr.

---

## API Contracts

See: `docs/api/openapi.yaml`

Aegis CLI has no HTTP API (it is local-only). The OpenAPI contract documents the structured JSON schema for generated prompts — the output format that Claude Code consumes. This serves as the contract between Aegis (prompt producer) and Claude Code (prompt consumer).

---

## Architecture Decision Records (ADR Index)

See: `docs/adr/README.md` for full index.

| ADR # | Title | Status | Date |
|-------|-------|--------|------|
| 0001 | [ESM-Only Module System](docs/adr/0001-module-system.md) | Accepted | 2026-07-02 |
| 0002 | [API Key Storage — Env Var + Conf Fallback](docs/adr/0002-api-key-storage.md) | Accepted | 2026-07-02 |
| 0003 | [Phase Detection State Machine](docs/adr/0003-phase-detection-state-machine.md) | Accepted | 2026-07-02 |
| 0004 | [Prompt Template Loading — Embedded in Binary](docs/adr/0004-prompt-template-loading.md) | Accepted | 2026-07-02 |

---

## Architecture Principles

1. **Local-first:** No network calls at runtime. Everything runs on the developer's machine. The tool works fully offline after installation.

2. **Read-only:** Aegis never modifies workspace files. It reads `.claude/`, `project-memory/`, and `CLAUDE.md` but writes nothing back. The only file writes are to its own config store (`~/.config/aegis-nodejs/config.json`).

3. **Deterministic output:** Same workspace state always produces the same output. No randomness, no AI inference, no network-dependent variation. Phase detection follows a strict priority chain (ADR-0003).

4. **Graceful degradation:** Every terminal feature (colors, Unicode, boxes, spinners, hyperlinks) degrades gracefully based on detected capabilities. No feature breaks entirely when a capability is missing — it falls back to the best available alternative.

5. **Fail fast with clear messages:** Invalid states are caught at the earliest opportunity. Every error case has a defined exit code, message format (`[ERROR]` prefix), and recovery guidance. Warnings include `[WARN]` prefix and allow continued operation.

6. **Defense in depth:** Validate at every boundary. File parsing validates format before extracting fields. Phase detection validates sources before extracting state. Prompt generation validates templates before populating context.

---

## Cross-Cutting Concerns

### Error Handling
- All errors go to stderr with `[ERROR] {message}` format
- All warnings go to stderr with `[WARN] {message}` format
- Data output goes to stdout (for `--json` mode, pipe support)
- Exit codes: 1 (general error), 2 (workspace error), 3 (parse error)
- Typed error classes in `shared/errors.ts` — never throw raw strings

### Terminal Detection
Checked at startup and cached for the session:
| Capability | Detection Method | Fallback |
|-----------|-----------------|----------|
| Color level | `supports-color` (level 1-3) | No colors |
| Unicode | `is-unicode-supported` | ASCII characters |
| Hyperlinks | `supports-hyperlinks` | Plain file paths |
| Terminal width | `terminal-size` / process.stdout.columns | Assume 80 columns |

### Config Management
- **Primary:** `DEEPSEEK_API_KEY` environment variable
- **Fallback:** `conf` JSON file at OS-correct path (ADR-0002)
- **Command:** `aegis config key` for set/update/delete

### Logging
- No log files on disk (Aegis is a CLI, not a server)
- stdout: structured output, prompt text, JSON data (when `--json` is used)
- stderr: progress messages, spinners, errors, warnings
- `--verbose` flag for debug-level output to stderr

### Testing Strategy
- **Unit tests:** Vitest for all shared utilities, pure functions, and deterministic logic
- **Integration tests:** Fixture workspaces (minimal ANSDLC directories) for scanner, engine, catalog
- **Snapshot tests:** Terminal UI output snapshots for each grace degradation level
- **No E2E tests:** The tool is a CLI — unit + integration coverage is sufficient

---

*Last updated: 2026-07-02. Generated by: system-architect agent.*
