---
name: phase-check
description: Tell you what ANSDLC phase you're in and what to do next. Use when unsure of current phase or next step.
disable-model-invocation: true
allowed-tools: Read
---

# ANSDLC Phase Check

Read the current project state and determine what phase we're in and what to do next.

## Check
1. Read `project-memory/05-feature-registry.md` — what features exist and their status
2. Read `project-memory/06-session-log.md` — what was the last thing done
3. Read `project-memory/01-vision.md` — has the vision been defined

## ANSDLC 2.0 Phases Quick Reference
0. **Vision Crystallization** — PR/FAQ exists? If not, we're in Phase 0.
1. **Subsystem Decomposition** — C4 System Context exists? If not, Phase 1.
2. **Reference Collection** — Technical references collected? If not, Phase 2.
3. **Architecture Design** — C4 Container + ADRs exist? If not, Phase 3.
4. **Visual Design System** — Design tokens + Storybook exist? If not, Phase 4.
5. **Feature Implementation** — Active features being built. 5A→5B→5C→5D→5E→5F loop.
6. **Subsystem Integration** — All features integrated? Contract tests pass?
7. **Hardening** — Security/perf/a11y audits done?
8. **Observe & Iterate** — Production SLOs defined? Error budgets tracked?

## Output
- **Current Phase:** [0-8]
- **Phase Status:** [In Progress / Complete / Not Started]
- **Next Action:** [specific, concrete next step]
- **Blockers:** [anything preventing progress]

If unclear, ask: "What feature are we working on?" and "What was the last thing completed?"
