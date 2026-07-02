---
name: verify-feature
description: Run the 3-layer ANSDLC verification protocol for the current feature. Use before every commit.
disable-model-invocation: true
argument-hint: [feature-name]
allowed-tools: Read, Grep, Glob, Bash(*)
---

# ANSDLC 3-Layer Verification Protocol

Execute ALL three verification layers for the feature named $ARGUMENTS. If any layer fails, stop and report — do not proceed to commit.

## Layer 1: Automated Verification
1. Run type checker: `!pnpm typecheck 2>&1`
2. Run linter: `!pnpm lint 2>&1`
3. Run unit tests: `!pnpm test:unit 2>&1`
4. Run integration tests: `!pnpm test:integration 2>&1`
5. Run mutation tests: check score >= 80% threshold

**Gate:** ALL automated checks must pass.

## Layer 2: Specification Compliance
1. Read the spec: `docs/specs/$0/gherkin.feature`
2. Read the test plan: `docs/specs/$0/test-plan.md`
3. Check every Gherkin scenario has a passing test
4. Check every edge case from test-plan.md is covered
5. Check mutation score meets threshold

**Gate:** Every spec scenario must have a passing test.

## Layer 3: Adversarial Review
1. Run completeness-checker agent on the diff
2. Run adversarial-reviewer agent on the diff
3. Run refactoring-auditor agent on the diff
4. If any agent returns NEEDS_REVISION or BUGGY or NEEDS_REFACTORING: FAIL

**Gate:** All three review agents must return PASS/CLEAN.

## Output
```json
{
  "feature": "$ARGUMENTS",
  "verdict": "PASS | FAIL",
  "layer_1_automated": {"typecheck": "PASS|FAIL", "lint": "PASS|FAIL", "unit_tests": "PASS|FAIL", "integration_tests": "PASS|FAIL", "mutation_score": 85},
  "layer_2_spec": {"scenarios_total": 8, "scenarios_passing": 8, "mutation_threshold_met": true},
  "layer_3_adversarial": {"completeness": "PASS|NEEDS_REVISION", "adversarial": "CLEAN|BUGGY", "refactoring": "PASS|NEEDS_REFACTORING"},
  "recommendation": "Proceed to commit" | "Fix before commit"
}
```
