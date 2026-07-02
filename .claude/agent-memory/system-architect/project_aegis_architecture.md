---
name: project-aegis-architecture
description: Phase 3 architecture completed for Aegis CLI — 8 packages, 4 ADRs, ESM-only, Node 22.12+
metadata:
  type: project
---

Phase 3 (Architecture Design) completed on 2026-07-02.

**Key decisions documented in ADRs:**
- **ADR-0001:** ESM-only module system — Commander v15, chalk v5, Node 22.12+, tsup ESM-only build
- **ADR-0002:** API key storage — DEEPSEEK_API_KEY env var primary, conf JSON fallback (plaintext, like npm/aws-cli)
- **ADR-0003:** Phase detection — priority chain: session log -> feature registry -> default Phase 0
- **ADR-0004:** Prompt templates — embedded in binary at build time via tsup JSON imports (30KB total)

**Package architecture:** 8 packages (cli, scanner, engine, generator, ui, catalog, store, shared) with strict dependency direction. cli is the top-level orchestrator — no package depends on cli.

**Build tooling:** tsup (esbuild-based), ESM-only output, dts generation, sourcemaps, target node22.

**Output files:** containers.puml, package.json, 4 ADRs in docs/adr/, updated 03-architecture.md.

**Why:** This architecture supports the Vision requirements: <1s startup, works on Windows/macOS/Linux, zero config, read-only, local-only, terminal-only. The 8-package structure maps to 31 atomic features across 6 subsystems.

**How to apply:** When implementing Phase 5, follow the 31-step build order in 02-subsystem-map.md, building packages from leaf (shared, store, ui) to root (cli). Each package can be unit-tested independently.
