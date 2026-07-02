# Feature Registry

> Single source of truth for all features. Status, testing, verification, and ownership.
> Updated by feature-registry-manager agent at end of every session.

---

## Status Legend
- `PLANNED` — Identified in decomposition, not yet started
- `SPEC_WRITTEN` — PR/FAQ + Gherkin + test plan complete
- `IN_PROGRESS` — Currently being implemented
- `VERIFIED` — All verification layers passed, refactoring gate passed
- `COMMITTED` — Committed to main branch, CI passing
- `RELEASED` — Deployed to production
- `DEPRECATED` — Scheduled for removal

---

## Feature Table

| ID | Subsystem | Feature | Appetite | Depends On | Build Order | Status | Notes |
|----|-----------|---------|----------|------------|-------------|--------|-------|
| F-001 | CLI | Aegis CLI — ANSDLC 2.0 Workflow Guide | — | — | — | SPEC_WRITTEN | Umbrella feature. PR/FAQ written, vision pressure-tested. Decomposed into F-002 through F-032. F-003-F-006 merged into F-002 per architect decision 2026-07-02. |
| F-002 | CLI Entry Point | CLI Entry Point (command parser, help, version, flags, error handling) | Medium | — | 1 | SPEC_WRITTEN | Absorbs F-003 (Help), F-004 (Version), F-005 (Flags), F-006 (Errors). 30 Gherkin scenarios, 48 test cases, 7 verification gates. |
| F-007 | Workspace Scanner | Workspace detection | Small | F-002 | 10 | PLANNED | Detect .claude/ and project-memory/, validate structure |
| F-008 | Workspace Scanner | CLAUDE.md parser | Small | F-007 | 12 | PLANNED | Extract project name, phase references, key rules |
| F-009 | Workspace Scanner | Agent directory scanner | Small | F-007 | 13 | PLANNED | List and parse frontmatter of all .claude/agents/*.md |
| F-010 | Workspace Scanner | Git state reader | Small | F-007 | 14 | PLANNED | Branch, last commit, working tree status |
| F-011 | Workspace Scanner | Project memory scanner | Small | F-007 | 15 | PLANNED | Discover project-memory/ files, timestamps, structured fields |
| F-012 | Workspace Scanner | Environment validation | Small | F-007 | 11 | PLANNED | Node.js version, platform, stdout TTY detection |
| F-013 | Phase Engine | Phase from session log | Small | F-011 | 19 | PLANNED | Extract Phase field from last session entry |
| F-014 | Phase Engine | Phase from feature registry | Small | F-011 | 20 | PLANNED | Map IN_PROGRESS features to their ANSDLC phases |
| F-015 | Phase Engine | Multi-feature phase resolution | Small | F-013, F-014 | 21 | PLANNED | Tiebreaker when different phases are IN_PROGRESS |
| F-016 | Phase Engine | Phase map knowledge | Small | — | 16 | PLANNED | Static data: all 9 phases with names, gates, agent mappings |
| F-017 | Prompt Generator | Prompt template engine | Small | F-002 | 25 | PLANNED | Load JSON templates, populate context variables |
| F-018 | Prompt Generator | Context assembler | Medium | F-015, F-009, F-008, F-010, F-011 | 26 | PLANNED | Gather all context into structured object |
| F-019 | Prompt Generator | Agent-specific prompt builder | Medium | F-018, F-030 | 28 | PLANNED | Prompts tailored to each of 24 agent roles |
| F-020 | Prompt Generator | Phase-specific prompt builder | Medium | F-018 | 29 | PLANNED | Prompts for phase transitions and actions |
| F-021 | Prompt Generator | Quick start prompt | Medium | F-019, F-020 | 30 | PLANNED | `aegis start`: full "what to do next" prompt |
| F-022 | Prompt Generator | Prompt clipboard output | Small | F-021 | 31 | PLANNED | Copy-friendly format, system clipboard support |
| F-023 | Terminal UI | Boxen renderer | Small | — | 6 | PLANNED | Bordered containers for sections |
| F-024 | Terminal UI | Color manager | Small | — | 7 | PLANNED | Chalk wrapper with --no-color and NO_COLOR support |
| F-025 | Terminal UI | Phase progress bar | Small | F-015, F-024 | 24 | PLANNED | Visual 9-phase bar with current phase highlighted |
| F-026 | Terminal UI | Terminal size detection | Small | — | 8 | PLANNED | Detect width/height for responsive layout |
| F-027 | Terminal UI | Error formatter | Small | — | 9 | PLANNED | Consistent [ERROR]/[WARN] rendering |
| F-028 | Terminal UI | Dashboard layout | Medium | F-025, F-027, F-023, F-024 | 27 | PLANNED | `aegis start` full dashboard with banner, phase bar, status, prompt |
| F-029 | Agent Catalog | Agent data loader | Small | F-009 | 17 | PLANNED | Parse all 24 agent frontmatter into structured records |
| F-030 | Agent Catalog | Agent lookup | Small | F-029 | 18 | PLANNED | Search by name, number, or alias |
| F-031 | Agent Catalog | Agent detail display | Small | F-030 | 22 | PLANNED | Full agent card: purpose, model, tools, color, usage |
| F-032 | Agent Catalog | Agent directory summary | Small | F-029 | 23 | PLANNED | List all 24 agents with phase mapping and descriptions |

---

## Summary
| Status | Count |
|--------|-------|
| PLANNED | 26 |
| SPEC_WRITTEN | 2 |
| IN_PROGRESS | 0 |
| VERIFIED | 0 |
| COMMITTED | 0 |
| RELEASED | 0 |

**Total features: 28** (F-001 umbrella + 27 atomic features; F-003-F-006 merged into F-002)

---

*Last updated: 2026-07-02. Managed by: feature-registry-manager agent.*
