---
name: aegis-cli-decomposition
description: Aegis CLI decomposed into 6 subsystems, 31 atomic features during Phase 1 (Decomposition) on 2026-07-02
metadata:
  type: project
---

Aegis CLI vision was decomposed into 6 bounded contexts with 31 atomic features (F-002 through F-032) during Phase 1.

**Subsystems identified:**
1. CLI Entry Point (F-002 to F-006) — command parsing, routing, help/version
2. Workspace Scanner (F-007 to F-012) — file I/O, structure detection, git state
3. Phase Engine (F-013 to F-016) — phase detection algorithm, multi-feature resolution
4. Prompt Generator (F-017 to F-022) — template engine, context assembly, prompt building
5. Terminal UI (F-023 to F-028) — chalk/boxen rendering, dashboard, color management
6. Agent Catalog (F-029 to F-032) — agent knowledge base, lookup, display

**Key decisions resolved:**
- Phase detection: priority chain (session log → feature registry → Phase 0 default), with documented multi-feature tiebreaker
- Prompt schema: structured JSON template with 5 mandatory sections (phase, agent, context, session, prompt text)
- Terminal format: chalk + boxen + gradient-string (header only), with NO_COLOR/--no-color fallback to plain text
- Error states: 9 defined error/warning cases with specific exit codes and messages
- Orchestrator (agent 00): user-invocable via `aegis agent orchestrator`

**How to apply:** When implementing Aegis CLI features, follow the build order (1-31) defined in the subsystem map. Each feature has a Small or Medium appetite. No feature is Large.

Related: [[phase-detection-algorithm]], [[prompt-generation-schema]]
