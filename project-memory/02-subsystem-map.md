# Subsystem Map

> Feature tree with dependency map and build order. Created during Phase 1 (Decomposition).

---

## Must-Resolve Items (from Phase 0 Vision-Analyst)

### 1. Phase Detection Algorithm

**Decision:** Phase detection uses a priority chain of three sources, with a documented tiebreaker for multi-feature ambiguity.

**Source of truth priority (highest to lowest):**
1. `project-memory/06-session-log.md` — the `## Session:` header's `**Phase:**` field is the primary indicator (`[0-8]` or sub-phase `5A-5F`)
2. `project-memory/05-feature-registry.md` — scan for features with status `IN_PROGRESS`; map their subsystem to the ANSDLC phase map
3. Default: Phase 0 (Vision) — when no session log exists and no features are in progress

**Multi-feature ambiguity resolution:**
- If multiple features have status `IN_PROGRESS` in different phases, the feature with the most recent `Last updated` date determines the displayed phase
- The secondary feature's phase is shown as a footnote: "Note: [feature name] is also IN_PROGRESS in Phase [N]"
- If no feature is `IN_PROGRESS`, scan the most recent session log entry's `Phase:` field

**Files considered:**
- Primary: `06-session-log.md` (phase field), `05-feature-registry.md` (feature statuses)
- Secondary: `.claude/agents/` directory presence (confirms ANSDLC 2.0 version)
- Fallback: `CLAUDE.md` section headings mentioning "Phase"

---

### 2. Prompt Generation Schema

**Decision:** Structured JSON template with five mandatory sections. Templates stored as `.json` files under `docs/specs/aegis-cli/templates/`.

```jsonc
{
  "schemaVersion": 1,
  "phase": "string",               // Current ANSDLC phase number, e.g. "1"
  "phaseName": "string",            // e.g. "Decomposition"
  "phaseAction": "string",          // What to do, e.g. "Decompose vision into features"
  "agentToInvoke": {
    "name": "string",               // Agent filename without .md, e.g. "decomposition-guide"
    "displayName": "string",        // Capitalized, e.g. "Decomposition Guide"
    "number": "string",             // Two-digit, e.g. "02"
    "path": "string",               // Relative path, e.g. ".claude/agents/02-decomposition-guide.md"
    "model": "string",              // From agent frontmatter, e.g. "deepseek-v4-pro[1m]"
    "color": "string"               // From agent frontmatter, e.g. "#8b5cf6"
  },
  "contextFiles": [                 // File paths to include as context
    {"path": "string", "purpose": "string"}
  ],
  "sessionContext": {
    "lastSessionSummary": "string", // Brief summary of last session's Done items
    "lastSessionStatus": "string",  // "completed", "in_progress", "blocked"
    "featureInProgress": "string",  // Current feature name or "none"
    "gitBranch": "string",
    "featureCount": "number"        // Total features in registry
  },
  "constitutionRules": [            // Key rules from CLAUDE.md relevant to this phase
    {"rule": "string", "source": "string"}
  ],
  "promptText": "string",           // The generated prompt, ready to copy
  "nextActions": [                   // What the developer should do after the agent completes
    {"action": "string", "phase": "string"}
  ],
  "examples": [                     // Example invocation prompts
    {"title": "string", "text": "string"}
  ]
}
```

Templates are populated at generation time from real project state. The `promptText` field is the "always up-to-date" output; examples are static reference content.

---

### 3. Terminal Output Format

**Decision:** Use `chalk` for colors, `boxen` for bordered containers, `gradient-string` for the Aegis header banner only.

| Library | Purpose | Fallback |
|---------|---------|----------|
| `chalk` | Text colors, bold, dim across all OS terminals | `NO_COLOR` env var or `--no-color` flag disables all styling |
| `boxen` | Bordered boxes for command output sections | Falls back to plain text with `---` separators |
| `gradient-string` | Aegis banner/logo at top of `aegis start` only | Falls back to solid-color chalk |

**Cross-platform guarantee:** All three libraries support Windows Terminal, PowerShell, CMD, and Git Bash natively. Chalk auto-detects `NO_COLOR` and `--no-color`. No native binding dependencies.

**Color mode detection:** Aegis checks `process.stdout.isTTY`, `NO_COLOR`, `TERM` env var, and `--no-color` flag. On insufficient color support, all formatting degrades to plain text with ASCII borders.

---

### 4. Error-State Behaviors

**Decision:** Every error case has a defined behavior, exit code, and error message format. All errors use stderr output with `[ERROR]` prefix.

| Error Condition | Detection | Behavior |
|----------------|-----------|----------|
| Not in a directory | CWD doesn't exist or is inaccessible | `[ERROR] Cannot access current directory: {path}` | Exit 1 |
| Not an ANSDLC workspace | No `.claude/` AND no `project-memory/` | `[ERROR] Not an ANSDLC 2.0 workspace. Expected .claude/ and project-memory/ directories. Run this command from an ANSDLC 2.0 project root.` | Exit 2 |
| Missing `.claude/` | `.claude/` directory absent but `project-memory/` present | `[ERROR] Missing .claude/ directory. ANSDLC 2.0 workspace requires .claude/ with agents, commands, and rules.` | Exit 2 |
| Missing `project-memory/` | `project-memory/` directory absent but `.claude/` present | `[ERROR] Missing project-memory/ directory. ANSDLC 2.0 workspace requires project-memory/ with session logs and feature registry.` | Exit 2 |
| Missing `06-session-log.md` | File not found, but `project-memory/` exists | Warning displayed: `[WARN] No session log found. Defaulting to Phase 0 (Vision).` | Continues with Phase 0 default |
| Empty feature registry | `05-feature-registry.md` missing or has no features | `[WARN] Feature registry is empty or missing. Phase detection will rely on session log only.` | Continues with session log phase |
| Corrupted YAML/JSON file | Parse error on `.json` or `.md` with frontmatter | `[ERROR] Could not parse {file}: {parse error} (line {N})` | Exit 3 |
| Not a git repository | `git rev-parse --git-dir` fails | `[WARN] Not a git repository. Branch info and commit history unavailable.` | Continues with degraded status |
| Missing `CLAUDE.md` | File not found at project root | `[WARN] No CLAUDE.md found. Will use default ANSDLC 2.0 rules.` | Continues with built-in defaults |
| Terminal too narrow | `process.stdout.columns < 50` | `[WARN] Terminal width too narrow ({N} columns). Dashboard may not display correctly.` | Falls back to narrow layout |

**No `aegis init` command** — Aegis is NOT a project generator per anti-goals. Error messages direct users to set up an ANSDLC workspace manually or clone an existing one.

---

### 5. Agent Count (Orchestrator Invocability)

**Decision:** YES — `aegis agent orchestrator` (or `aegis agent 00` or `aegis agent 00-orchestrator`) is a valid invocation. The orchestrator is agent number 00 with a definition file, a model, and tools. It functions both as an internal routing agent AND a user-invocable agent for developers who want to ask "what should I do next?"

- Agent 00 (orchestrator) is listed in the Agent Catalog like all other agents
- `aegis agent orchestrator` returns the same detail view as any other agent: purpose, model, tools, when to use, example prompt
- The orchestrator's primary role (routing tasks) is documented in its detail display
- Total agent count: 24 (including the orchestrator). No inconsistency.

---

## System Context

```
[Developer] --"types CLI commands"--> [Aegis CLI]
[Aegis CLI] --"reads files from"--> [ANSDLC Workspace (.claude/, project-memory/)]
[Developer] --"pastes prompts into"--> [Claude Code]
[Claude Code] --"reads files from"--> [ANSDLC Workspace]
[Claude Code] --"sends prompts to"--> [DeepSeek API]
[Developer] --"installs Aegis from"--> [npm Registry]

Aegis responsibilities:
  - READ ONLY: never modifies workspace files
  - LOCAL ONLY: never makes network calls (except npm installation)
  - TERMINAL ONLY: no GUI, no web server
  - PASSIVE: generates prompts, never executes them
```

See `docs/architecture/system-context.puml` for C4 PlantUML diagram.

---

## Feature Tree

### Subsystem: CLI Entry Point
*Responsibility: Parse commands, route to handlers, manage help/version output.*
*Bounded context: argv parsing, command registry, help text, global flags.*
*Interface: Exports a command dispatcher that reads process.argv and calls the appropriate subsystem handler.*

| ID | Feature | Appetite | Depends On | Build Order | Status |
|----|---------|----------|------------|-------------|--------|
| F-002 | Command parser and router — parse `aegis <command> [args]`, route to subsystems | Small | — | 1 | PLANNED |
| F-003 | Help system — `aegis --help`, `aegis <command> --help` with usage text | Small | F-002 | 2 | PLANNED |
| F-004 | Version flag — `aegis --version` reads package.json version | Small | F-002 | 3 | PLANNED |
| F-005 | Global flags — `--no-color`, `--json` output mode | Small | F-002 | 4 | PLANNED |
| F-006 | Unknown command handler — format suggestions, exit 1 | Small | F-002 | 5 | PLANNED |

---

### Subsystem: Workspace Scanner
*Responsibility: Detect, validate, and read ANSDLC workspace structure from disk.*
*Bounded context: File system I/O for .claude/, project-memory/, and git state.*
*Interface: Returns a Workspace object with all discovered paths, parsed metadata, and validation status.*

| ID | Feature | Appetite | Depends On | Build Order | Status |
|----|---------|----------|------------|-------------|--------|
| F-007 | Workspace detection — check .claude/ and project-memory/ exist, validate structure | Small | F-002 | 10 | PLANNED |
| F-008 | CLAUDE.md parser — extract project name, phase references, key rules | Small | F-007 | 12 | PLANNED |
| F-009 | Agent directory scanner — list and frontmatter-parse all .claude/agents/*.md | Small | F-007 | 13 | PLANNED |
| F-010 | Git state reader — current branch, last commit, working tree status | Small | F-007 | 14 | PLANNED |
| F-011 | Project memory scanner — discover project-memory/ files, timestamps, parse structured fields | Small | F-007 | 15 | PLANNED |
| F-012 | Environment validation — Node.js version, platform, stdout TTY detection | Small | F-007 | 11 | PLANNED |

---

### Subsystem: Phase Engine
*Responsibility: Determine the current ANSDLC phase from project artifacts.*
*Bounded context: Phase detection algorithm, phase knowledge, multi-feature resolution.*
*Interface: Accepts a Workspace object, returns a PhaseResult with current phase, confidence, and multi-feature notes.*

| ID | Feature | Appetite | Depends On | Build Order | Status |
|----|---------|----------|------------|-------------|--------|
| F-013 | Phase from session log — extract Phase field from last session entry | Small | F-011 | 19 | PLANNED |
| F-014 | Phase from feature registry — map IN_PROGRESS features to their phases | Small | F-011 | 20 | PLANNED |
| F-015 | Multi-feature phase resolution — tiebreaker when different phases are IN_PROGRESS | Small | F-013, F-014 | 21 | PLANNED |
| F-016 | Phase map knowledge — all 9 phases with names, descriptions, gates, and agent mappings | Small | — | 16 | PLANNED |

---

### Subsystem: Prompt Generator
*Responsibility: Build context-aware prompts from phase, agent, and workspace state.*
*Bounded context: Template engine, context assembly, prompt construction for every phase-agent combination.*
*Interface: Accepts PhaseResult, AgentCatalog entry, and Workspace object; returns a Prompt object with ready-to-copy text.*

| ID | Feature | Appetite | Depends On | Build Order | Status |
|----|---------|----------|------------|-------------|--------|
| F-017 | Prompt template engine — load template JSON, populate context variables, validate required fields | Small | F-002 | 25 | PLANNED |
| F-018 | Context assembler — gather phase, agent, workspace, and session context into structured object | Medium | F-015, F-009, F-008, F-010, F-011 | 26 | PLANNED |
| F-019 | Agent-specific prompt builder — generate prompts tailored to each of the 24 agent roles | Medium | F-018, F-030 | 28 | PLANNED |
| F-020 | Phase-specific prompt builder — generate prompts for phase transitions and phase actions | Medium | F-018 | 29 | PLANNED |
| F-021 | Quick start prompt — `aegis start` generates the "what to do next" prompt with all context | Medium | F-019, F-020 | 30 | PLANNED |
| F-022 | Prompt clipboard output — render prompt in copy-friendly format, optionally to system clipboard | Small | F-021 | 31 | PLANNED |

---

### Subsystem: Terminal UI
*Responsibility: Render colored, formatted output to terminal.*
*Bounded context: ANSI formatting, box drawing, color management, responsive layout.*
*Interface: Exports render functions that take structured data and output formatted strings to stdout/stderr.*

| ID | Feature | Appetite | Depends On | Build Order | Status |
|----|---------|----------|------------|-------------|--------|
| F-023 | Boxen renderer — bordered containers for sections (status boxes, agent cards, prompt blocks) | Small | — | 6 | PLANNED |
| F-024 | Color manager — chalk wrapper with --no-color, NO_COLOR, and TTY detection | Small | — | 7 | PLANNED |
| F-025 | Phase progress bar — visual 9-phase progress bar, current phase highlighted, all phases labeled | Small | F-015, F-024 | 24 | PLANNED |
| F-026 | Terminal size detection — detect width/height for responsive layout decisions | Small | — | 8 | PLANNED |
| F-027 | Error formatter — consistent [ERROR]/[WARN] prefixes, red for errors, yellow for warnings | Small | — | 9 | PLANNED |
| F-028 | Dashboard layout — `aegis start` full dashboard: banner, phase bar, status summary, next action, prompt box | Medium | F-025, F-027, F-023, F-024 | 27 | PLANNED |

---

### Subsystem: Agent Catalog
*Responsibility: Knowledge base of all 24 ANSDLC agents with descriptions, models, and usage patterns.*
*Bounded context: Agent metadata loaded from `.claude/agents/*.md` frontmatter, structured for query and display.*
*Interface: Exports an AgentCatalog object that supports lookup by name, number, phase, and keyword.*

| ID | Feature | Appetite | Depends On | Build Order | Status |
|----|---------|----------|------------|-------------|--------|
| F-029 | Agent data loader — parse all 24 agent frontmatter blocks into structured records | Small | F-009 | 17 | PLANNED |
| F-030 | Agent lookup — search by name ("decomposition-guide"), number ("02"), or alias | Small | F-029 | 18 | PLANNED |
| F-031 | Agent detail display — render full agent card: purpose, model, tools, color, when to use, example prompt | Small | F-030 | 22 | PLANNED |
| F-032 | Agent directory summary — list all 24 agents with name, phase mapping, one-line description | Small | F-029 | 23 | PLANNED |

---

## Dependency Map

```
[CLI Entry Point]
  ├── F-002: Command parser (no deps) [build 1]
  ├── F-003: Help system (depends F-002) [build 2]
  ├── F-004: Version flag (depends F-002) [build 3]
  ├── F-005: Global flags (depends F-002) [build 4]
  └── F-006: Unknown command handler (depends F-002) [build 5]

[Terminal UI — core]
  ├── F-023: Boxen renderer (no deps) [build 6]
  ├── F-024: Color manager (no deps) [build 7]
  ├── F-026: Terminal size detection (no deps) [build 8]
  └── F-027: Error formatter (no deps) [build 9]

[Workspace Scanner]
  ├── F-007: Workspace detection (depends F-002) [build 10]
  ├── F-012: Environment validation (depends F-007) [build 11]
  ├── F-008: CLAUDE.md parser (depends F-007) [build 12]
  ├── F-009: Agent directory scanner (depends F-007) [build 13]
  ├── F-010: Git state reader (depends F-007) [build 14]
  └── F-011: Project memory scanner (depends F-007) [build 15]

[Phase Engine]
  ├── F-016: Phase map knowledge (no deps) [build 16]
  ├── F-013: Phase from session log (depends F-011) [build 19]
  ├── F-014: Phase from feature registry (depends F-011) [build 20]
  └── F-015: Multi-feature resolution (depends F-013, F-014) [build 21]

[Agent Catalog]
  ├── F-029: Agent data loader (depends F-009) [build 17]
  ├── F-030: Agent lookup (depends F-029) [build 18]
  ├── F-031: Agent detail display (depends F-030) [build 22]
  └── F-032: Agent directory summary (depends F-029) [build 23]

[Terminal UI — advanced]
  ├── F-025: Phase progress bar (depends F-015, F-024) [build 24]
  └── F-028: Dashboard layout (depends F-025, F-027, F-023, F-024) [build 27]

[Prompt Generator]
  ├── F-017: Prompt template engine (depends F-002) [build 25]
  ├── F-018: Context assembler (depends F-015, F-009, F-008, F-010, F-011) [build 26]
  ├── F-019: Agent-specific builder (depends F-018, F-030) [build 28]
  ├── F-020: Phase-specific builder (depends F-018) [build 29]
  ├── F-021: Quick start prompt (depends F-019, F-020) [build 30]
  └── F-022: Prompt clipboard output (depends F-021) [build 31]
```

---

## Appetite Definitions
- **Small:** 1-2 AI sessions (hours)
- **Medium:** 3-5 AI sessions (1-2 days)
- **Large:** MUST be split into Medium or Small before implementation

## Build Order (Global)

| Order | ID | Feature | Subsystem | Rationale |
|-------|----|---------|-----------|-----------|
| 1 | F-002 | Command parser | CLI Entry Point | Foundation: everything routes through this |
| 2 | F-003 | Help system | CLI Entry Point | User-facing immediately after parser |
| 3 | F-004 | Version flag | CLI Entry Point | Trivial, completes CLI basics |
| 4 | F-005 | Global flags | CLI Entry Point | Needed by color manager and output formatting |
| 5 | F-006 | Unknown command handler | CLI Entry Point | Error handling basics |
| 6 | F-023 | Boxen renderer | Terminal UI | Core output primitive, no deps |
| 7 | F-024 | Color manager | Terminal UI | Core output primitive, no deps |
| 8 | F-026 | Terminal size detection | Terminal UI | Core output primitive, no deps |
| 9 | F-027 | Error formatter | Terminal UI | Core output primitive, no deps |
| 10 | F-007 | Workspace detection | Workspace Scanner | Foundation: all file reads depend on this |
| 11 | F-012 | Environment validation | Workspace Scanner | Quick validation after workspace found |
| 12 | F-008 | CLAUDE.md parser | Workspace Scanner | Reads project constitution |
| 13 | F-009 | Agent directory scanner | Workspace Scanner | Discovers agents for Agent Catalog |
| 14 | F-010 | Git state reader | Workspace Scanner | Reads VCS state |
| 15 | F-011 | Project memory scanner | Workspace Scanner | Reads session log, feature registry for Phase Engine |
| 16 | F-016 | Phase map knowledge | Phase Engine | Static data, no deps — can be built early |
| 17 | F-029 | Agent data loader | Agent Catalog | Depends on F-009 (agent scanner) |
| 18 | F-030 | Agent lookup | Agent Catalog | Depends on F-029 |
| 19 | F-013 | Phase from session log | Phase Engine | Depends on F-011 |
| 20 | F-014 | Phase from feature registry | Phase Engine | Depends on F-011 |
| 21 | F-015 | Multi-feature resolution | Phase Engine | Depends on F-013, F-014 |
| 22 | F-031 | Agent detail display | Agent Catalog | Depends on F-030 |
| 23 | F-032 | Agent directory summary | Agent Catalog | Depends on F-029 |
| 24 | F-025 | Phase progress bar | Terminal UI | Depends on F-015, F-024 |
| 25 | F-017 | Prompt template engine | Prompt Generator | Depends on F-002 |
| 26 | F-018 | Context assembler | Prompt Generator | Depends on Phase Engine + Scanner data |
| 27 | F-028 | Dashboard layout | Terminal UI | Depends on progress bar + core rendering |
| 28 | F-019 | Agent-specific prompt builder | Prompt Generator | Depends on F-018, F-030 |
| 29 | F-020 | Phase-specific prompt builder | Prompt Generator | Depends on F-018 |
| 30 | F-021 | Quick start prompt | Prompt Generator | Depends on F-019, F-020 |
| 31 | F-022 | Prompt clipboard output | Prompt Generator | Depends on F-021 |

---

*Last updated: 2026-07-02. Generated by: decomposition-guide agent.*
