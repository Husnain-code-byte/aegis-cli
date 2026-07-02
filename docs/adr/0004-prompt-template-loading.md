# ADR-0004: Prompt Template Loading — Embedded in Binary at Build Time

- **Status:** Accepted
- **Date:** 2026-07-02
- **Deciders:** system-architect agent (Phase 3)

## Context and Problem Statement

Aegis CLI generates prompts from structured JSON templates. Each template has 5 mandatory sections: agent info, context, rules, prompt, and examples. There are 9 phase templates (one per ANSDLC phase) plus a base template, totaling approximately 30KB of JSON data.

These templates must be available at runtime whenever a user runs `aegis prompt` or `aegis start`. Two fundamental approaches exist: embed the templates in the binary at build time, or load them from the filesystem at runtime.

The decision affects:
- Distribution simplicity (npm package contents)
- Runtime reliability (file-not-found errors vs always-available)
- User customization capability (can users modify templates?)
- Update velocity (do template changes require an npm release?)

## Decision Drivers

- Distribution simplicity: `npm install -g aegis-cli` should Just Work
- Runtime reliability: zero file-not-found errors in production use
- Startup performance: no filesystem I/O at prompt generation time
- Package size: templates are small (~30KB total) — negligible impact
- Future customization: should not permanently prevent user customization

## Considered Options

- **A. Embed in binary at build time** — Store `.json` files in `src/generator/templates/`, import via TypeScript JSON module imports, bundle into output via tsup
- **B. External templates directory** — Ship `templates/` as part of npm package, read at runtime from known path relative to `__dirname`
- **C. Remote templates** — Fetch templates from a URL or CDN at runtime
- **D. Hardcoded JavaScript objects** — Define templates as TypeScript objects/constants in source code

## Decision Outcome

Chosen option: **A. Embed in binary at build time.**

### Implementation

**Template storage:** `src/generator/templates/` directory:
```
src/generator/templates/
├── base.json          # Base template with all 5 sections
├── phase-0.json       # Phase 0 (Vision) specific
├── phase-1.json       # Phase 1 (Decomposition) specific
├── phase-2.json       # Phase 2 (Reference) specific
├── phase-3.json       # Phase 3 (Architecture) specific
├── phase-4.json       # Phase 4 (Design System) specific
├── phase-5.json       # Phase 5 (Implementation) — base for sub-phases
├── phase-6.json       # Phase 6 (Integration) specific
├── phase-7.json       # Phase 7 (Hardening) specific
└── phase-8.json       # Phase 8 (Observe & Iterate) specific
```

**Import mechanism:** TypeScript JSON module imports with the `with { type: 'json' }` assertion:
```typescript
import baseTemplate from './templates/base.json' with { type: 'json' };
import phase0Template from './templates/phase-0.json' with { type: 'json' };
```

**Build process:** tsup bundles the imported JSON into the output ESM file. No `templates/` directory is included in the npm package's `dist/` folder — the templates become part of the JavaScript bundle.

**Template schema:** Each template contains the 5 mandatory sections defined in the Phase 2 subsystem map:
```jsonc
{
  "schemaVersion": 1,
  "phase": "string",
  "phaseName": "string",
  "phaseAction": "string",
  "agentToInvoke": {
    "name": "string",
    "displayName": "string",
    "number": "string",
    "path": "string",
    "model": "string",
    "color": "string"
  },
  "contextFiles": [
    {"path": "string", "purpose": "string"}
  ],
  "sessionContext": {
    "lastSessionSummary": "string",
    "lastSessionStatus": "string",
    "featureInProgress": "string",
    "gitBranch": "string",
    "featureCount": "number"
  },
  "constitutionRules": [
    {"rule": "string", "source": "string"}
  ],
  "promptText": "string",
  "nextActions": [
    {"action": "string", "phase": "string"}
  ],
  "examples": [
    {"title": "string", "text": "string"}
  ]
}
```

### Consequences

**Positive:**
- Always available at runtime — no file-not-found errors, no path resolution issues
- Works regardless of the current working directory (no `__dirname` gymnastics)
- Single-file binary — `npm install -g` is simpler with fewer files
- Faster prompt generation — no filesystem read at runtime for template loading
- Template updates ship with new npm versions — atomic deployment
- Zero additional package size concern (~30KB in a bundle that's already ~200KB+ with dependencies)

**Negative:**
- Templates cannot be hot-reloaded without rebuilding and reinstalling
- Users cannot customize templates without forking the package (but see future improvement below)
- Template changes require a full build cycle (tsup -> npm publish -> npm install -g)
- Increased bundle size (negligible for ~30KB)
- JSON imports with `with { type: 'json' }` may have edge cases in some TypeScript configurations

**Future improvement:** If user customization is desired, add an `aegis config templates --custom` command that:
1. Copies the embedded templates to `~/.config/aegis-nodejs/templates/`
2. Aegis checks that directory first before falling back to embedded templates
3. This is a non-breaking addition — the embedded templates remain the default

## Alternatives Considered

### Option B: External templates directory

Shipping `templates/` as part of the npm package and reading from `path.join(__dirname, 'templates')` at runtime.

- **Pros:** Users can inspect templates without reading source code, templates can be hot-reloaded by modifying the files, path is predictable (`node_modules/aegis-cli/templates/`)
- **Cons:** `__dirname` resolution is unreliable in ESM (must use `import.meta.url`), path breaks if the user installs globally (`npm install -g`), path breaks with different package managers (pnpm uses symlinks, yarn PnP uses zip files), file-not-found errors if the npm install is corrupted or incomplete, requires filesystem permissions
- **Rejected because:** File path resolution in ESM CLIs is fragile across different installation methods (npm global, npx, pnpm global, yarn). The reliability risk outweighs the customization benefit for the initial release.

### Option C: Remote templates

Fetching templates from a URL or CDN at runtime, with local caching as fallback.

- **Pros:** Can update templates without npm releases, enables A/B testing, central management of template improvements, smaller initial npm package
- **Cons:** **Violates the LOCAL-ONLY anti-goal** (Vision documents explicitly state Aegis makes no network calls at runtime), adds latency to prompt generation, fails when offline (air-gapped dev environments, VPN issues), adds network error handling complexity, dependency on CDN availability
- **Rejected because:** The Vision document's Anti-Goals section explicitly states "NOT a cloud service — fully local." Remote templates would require network connectivity, a CDN, TLS handling, and caching — all for a 30KB JSON payload that changes at most once per ANSDLC version update.

### Option D: Hardcoded JavaScript objects

Defining template content directly as TypeScript objects/constants in source files instead of separate JSON files.

- **Pros:** No file I/O at any point, TypeScript type checking on template content, no JSON import assertions needed
- **Cons:** Templates and code are tightly coupled — changing template content requires changing TypeScript code, harder for non-developers to review/edit templates, template content clutters source files, no separation of concerns between template structure and template processing logic, cannot easily syntax-highlight or lint JSON content separately
- **Rejected because:** Separating templates into `.json` files provides clearer boundaries: JSON can be validated independently, reviewed by non-TypeScript contributors, and in the future loaded from user-configurable paths without code changes. The `.json` files are imported at build time (same zero-I/O benefit as hardcoded objects).
