# ADR-0001: ESM-Only Module System

- **Status:** Accepted
- **Date:** 2026-07-02
- **Deciders:** system-architect agent (Phase 3), decomposition-guide agent (Phase 2 research)

## Context and Problem Statement

Aegis CLI must choose a module system (ESM, CJS, or dual) for its Node.js runtime. This decision affects every dependency choice, the build pipeline, and the minimum Node.js version requirement.

Phase 2 research (reference-collection.md) identified that the majority of modern CLI ecosystem packages are ESM-only:

| Package | Version | Module System |
|---------|---------|---------------|
| commander | v15.0.0 | ESM-only |
| chalk | v5.6.2 | ESM-only |
| boxen | v8.0.1 | ESM-only |
| ora | v9.4.1 | ESM-only |
| conf | v15.1.0 | ESM-only |
| @inquirer/prompts | v8.5.2 | ESM-only |
| tinyglobby | v0.2.17 | ESM-first |
| is-unicode-supported | v2.1.0 | ESM-only |
| supports-color | v10.2.2 | ESM-only |
| supports-hyperlinks | v4.4.0 | ESM-only |
| terminal-size | v4.0.1 | ESM-only |

Staying on CJS would mean using outdated versions: Commander v14.x, chalk v4.1.2, @inquirer/prompts v7.x — losing security patches, performance improvements, and new features.

## Decision Drivers

- Maximum ecosystem compatibility (use latest versions of all packages)
- Simple, single-module-format project (no dual-package hazard)
- Developer experience (top-level await, cleaner imports)
- Distribution simplicity (CLI tool, not a library)
- Future-proofing (ecosystem is moving ESM-only)

## Considered Options

- **A. ESM-only** — `"type": "module"` in package.json, target Node 22.12+, use latest ESM-only packages
- **B. CJS-only** — Stick with CommonJS, use Commander v14.x, chalk v4.1.2, @inquirer/prompts v7.x
- **C. Dual ESM+CJS** — Ship both formats via tsup dual build, support both require() and import

## Decision Outcome

Chosen option: **A. ESM-only**.

Set `"type": "module"` in package.json, target Node >= 22.12.0, use Commander v15 + chalk v5 + all latest ESM-only packages. Build with tsup targeting `esm` format only.

### Configuration

**package.json:**
```json
{
  "type": "module",
  "engines": {
    "node": ">=22.12.0"
  }
}
```

**tsconfig.json:**
```json
{
  "compilerOptions": {
    "target": "ES2024",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "sourceMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

**tsup (in package.json):**
```json
{
  "tsup": {
    "entry": ["src/index.ts"],
    "format": ["esm"],
    "dts": true,
    "clean": true,
    "sourcemap": true,
    "target": "node22",
    "platform": "node"
  }
}
```

### Consequences

**Positive:**
- Access to latest features, security patches, and performance improvements from all dependencies
- Cleaner `import` syntax with top-level `await` support
- No dual-package hazard — single module format, no `require(esm)` workarounds
- Future-proof — ecosystem momentum is toward ESM-only
- Smaller install footprint (no dual builds)
- Simpler build pipeline (single target)

**Negative:**
- Requires Node 22.12+ minimum (but this is the current Node.js LTS as of 2026)
- Cannot be loaded via `require()` by CJS consumers (irrelevant — Aegis is a CLI, not a library)
- Some legacy CI images or shared hosting environments may need Node version upgrades
- CJS-only packages (like `@11ty/gray-matter`) require Node.js ESM interop, but tsup handles this during bundling

## Alternatives Considered

### Option B: CJS-only

Using Commander v14.x, chalk v4.1.2, @inquirer/prompts v7.x, and other CJS-compatible versions.

- **Pros:** No Node.js version constraint beyond 18.x, maximum compatibility with CJS tooling
- **Cons:** Outdated dependencies miss security patches, no top-level await, larger dependency trees for some packages (chalk v4 has more transitive deps than v5), ecosystem is moving away from CJS
- **Rejected because:** The CLI targets developers who can install Node 22.12+, and losing access to latest packages is not worth the compatibility. The Phase 2 research explicitly notes this trade-off.

### Option C: Dual ESM+CJS

Building both ESM and CJS outputs via tsup dual format, declaring `exports` in package.json with conditional exports.

- **Pros:** Supports both `import` and `require()` consumers
- **Cons:** Dual-package hazard potential if stateful modules are loaded in both formats, larger npm package, slower build, more complex configuration
- **Rejected because:** Aegis is a CLI tool, not a library. No consumer will `require('aegis-cli')`. Dual builds add complexity for zero benefit.
