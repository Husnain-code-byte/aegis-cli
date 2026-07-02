# ADR-0003: Phase Detection — Priority Chain with Fallthrough

- **Status:** Accepted
- **Date:** 2026-07-02
- **Deciders:** system-architect agent (Phase 3), decomposition-guide agent (Phase 1/2)

## Context and Problem Statement

Aegis CLI must determine the current ANSDLC phase from a workspace's project files. The phase drives every downstream feature: which prompt template to use, which agent to invoke, what next actions to suggest. Three sources of truth exist in the workspace, each with different reliability and specificity:

1. **Session log** (`project-memory/06-session-log.md`) — explicit `**Phase:**` field in the last session entry. Most reliable when present.
2. **Feature registry** (`project-memory/05-feature-registry.md`) — features with `IN_PROGRESS` status map to phases via subsystem assignment. Can have ambiguity (multiple features in different phases).
3. **Default** — when neither source exists or neither has usable data.

The problem: Which source to trust when they conflict? What happens when both are present? What if neither exists?

## Decision Drivers

- Deterministic: same workspace input always produces the same phase output
- Graceful degradation: works with partial or new workspaces
- Confidence communication: user is told how reliable the phase detection is
- No false certainty: if detection is ambiguous, that ambiguity is surfaced
- Minimal false positives: better to default to Phase 0 than to guess a later phase

## Considered Options

- **A. Priority chain with fallthrough** — Session log -> feature registry -> default Phase 0, with tiebreaker for multi-feature ambiguity
- **B. Machine learning / GPT-based phase inference** — Use LLM to infer phase from workspace content
- **C. Config file approach** — Require a `.aegis-phase` file or similar marker
- **D. CLAUDE.md parsing only** — Infer phase from section headings in CLAUDE.md
- **E. Majority voting** — Collect all sources, use majority or weighted average

## Decision Outcome

Chosen option: **A. Priority chain with fallthrough.**

### Detection Algorithm

```
1. Parse project-memory/06-session-log.md
   └── Find the last ## Session: header
       └── Extract **Phase:** field value ([0-8] or 5A-5F)
           └── If found: return PhaseResult(phase, confidence: HIGH, source: "session-log")
           └── If not found or file missing: fall through to step 2

2. Scan project-memory/05-feature-registry.md
   └── Find all features with status: IN_PROGRESS
       └── If 0 features: fall through to step 3
       └── If 1 feature: map its subsystem to phase -> return PhaseResult(phase, confidence: MEDIUM, source: "feature-registry")
       └── If 2+ features in different phases:
           └── Use most recently updated IN_PROGRESS feature (by "Last updated" field)
           └── Return PhaseResult(phase, confidence: MEDIUM, source: "feature-registry", note: "Also [N] other features IN_PROGRESS in Phase [M]")

3. Default to Phase 0 (Vision)
   └── Return PhaseResult(phase: 0, confidence: LOW, source: "default")
```

### State Machine

```
IDLE -> SCANNING -> PHASE_DETECTED -> READY
                            |
                            +-> WARN_MISSING_SESSION (session log not found, confidence: MEDIUM or LOW)
                            +-> WARN_EMPTY_REGISTRY (no features found, reliance on session log only)
                            +-> WARN_NO_GIT (not a git repo, status display degraded)
                            +-> WARN_NARROW_TERMINAL (columns < 50, layout degraded)
```

### Confidence Levels

| Confidence | Meaning | Display |
|------------|---------|---------|
| HIGH | Explicit phase field found in session log | Normal display, no warning |
| MEDIUM | Phase inferred from feature registry | Show note: "Phase inferred from feature registry" |
| LOW | Default Phase 0 (no sources available) | Show note: "No session log or features found. Defaulting to Phase 0." |

### Consequences

**Positive:**
- Deterministic: same workspace always produces the same phase output
- Graceful degradation: works with brand-new workspaces (default Phase 0), partial workspaces (feature registry only), or fully populated workspaces (session log)
- Confidence communicated to the user in the dashboard — they know how reliable the detection is
- No false positives: defaulting to Phase 0 is the safest fallback (earlier phase is always correct for "what to do next" guidance)
- Multi-feature ambiguity is surfaced, not hidden

**Negative:**
- Default Phase 0 may be wrong if a workspace is in a later phase but both session log and feature registry are missing (edge case: user deleted files by accident)
- Session log format changes would break detection — Aegis is coupled to the ANSDLC 2.0 session log format
- The "most recently updated" tiebreaker is heuristic — a user who pauses work on a Phase 2 feature and starts a Phase 5 feature would correctly get Phase 5 (the newer one), but if they update the Phase 2 feature's docs, the timestamp could mislead
- The feature registry's subsystem-to-phase mapping must be maintained as ANSDLC evolves

## Alternatives Considered

### Option B: Machine learning / GPT-based phase inference

Using an LLM to analyze workspace content and infer the current phase.

- **Pros:** Potentially more accurate in edge cases, can understand natural language descriptions in session logs
- **Cons:** Requires an API call to DeepSeek (violates LOCAL-ONLY anti-goal), adds latency (~seconds), costs money per invocation, non-deterministic (same input may produce different outputs), overkill for a problem with only 9 possible outputs
- **Rejected because:** Aegis explicitly does NOT make network calls for its core functionality. The LOCAL-ONLY constraint is in the Vision anti-goals. Using an LLM for phase detection would violate this and add latency to a "<1 second" success criterion.

### Option C: Config file approach

Requiring a `.aegis-phase` file managed by the user or workspace initialization script.

- **Pros:** Always accurate if the user remembers to update it, trivial to parse, zero ambiguity
- **Cons:** Adds a new required file to the ANSDLC workspace, violates zero-config goal (user must manage yet another file), will inevitably become out of sync with actual workspace state, adds friction to the workflow
- **Rejected because:** Aegis is designed to derive state from the workspace, not add to it. The Vision documents "Zero config" as a core value. Adding a config file contradicts this.

### Option D: CLAUDE.md parsing only

Inferring phase from section headings or comments in CLAUDE.md.

- **Pros:** No dependency on project-memory files, simpler implementation
- **Cons:** CLAUDE.md is a static rules document — it describes what phases ARE, not what phase the project IS IN. No reliable way to derive current state from it. Section headings may or may not mention phases.
- **Rejected because:** CLAUDE.md describes the constitution, not the current state. It cannot answer "which phase are we in right now?"

### Option E: Majority voting

Collecting all sources (session log fields, feature registry statuses, CLAUDE.md mentions, git commit patterns) and using a weighted majority.

- **Pros:** Potentially more robust when individual sources are unreliable
- **Cons:** Complex implementation, opaque logic (hard to reason about why Phase 4 was chosen), still needs fallback when all sources disagree, phase detection becomes a black box
- **Rejected because:** Aegis values determinism and transparency. The priority chain is simple enough to reason about and debug. Majority voting adds complexity without clear benefit for a 3-source problem.
