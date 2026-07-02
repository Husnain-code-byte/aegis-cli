# Reference Collection — Aegis CLI Dependencies

> Research conducted 2026-07-02. All versions, licenses, and maintenance status verified via web search and official repositories.
> Purpose: Inform Phase 3 (Architecture Design) dependency decisions. This is NOT a final decision — options with trade-offs are presented.

---

## 1. CLI Framework Decision

### Comparison Table

| Criteria | Commander | Clipanion | Yargs |
|---|---|---|---|
| **Latest stable** | v15.0.0 (May 2026) | v3.2.1 (Jul 2023) / v4.0.0-rc.4 | v18.0.0 (May 2025) |
| **License** | MIT | MIT | MIT |
| **Weekly downloads** | ~350M+ | ~9.5M | ~35M+ |
| **Module system** | ESM-only (v15) | ESM + CJS | ESM-first |
| **Node.js requirement** | >= 22.12.0 | >= 18 | >= 20.19.0 |
| **Open issues** | 3 | 34 | 261 |
| **TypeScript types** | Bundled | Built-in (first-class) | Bundled (v18+) |
| **Bundle size (approx)** | ~60KB min | ~25KB min | ~100KB+ min |
| **Last commit** | May 2026 (active) | Nov 2024 | May 2025 |
| **Subcommand support** | Native (`.command()`) | Native (class-based) | Native (nested) |
| **Automatic help gen** | Built-in | Built-in | Built-in |
| **Plugin system** | No (composition pattern) | Yes (via registration) | No (middleware available) |
| **Windows compat** | Well-tested | Moderate | Well-tested |
| **Key differentiator** | Most popular, mature ecosystem | TypeScript-first, zero deps | Feature-rich, middleware |

### Detailed Evaluation

#### Commander (tj/commander.js)
- **Strengths:** Largest community, most tutorials/examples, battle-tested in thousands of CLIs. v15 is ESM-only but supports import from CJS via Node 22's `require(esm)`. v14.x will get security patches until May 2027. API is straightforward: `program.command('status').action(...)`.
- **Weaknesses:** No first-class TypeScript ergonomics (option types require manual generics). v15 ESM-only may cause issues with some testing frameworks. No built-in plugin system. Large-ish bundle.
- **Suitability for Aegis:** Strong. Aegis needs 6-8 commands with subcommands. Commander's `.command()` chaining maps directly to `aegis phase`, `aegis agent`, `aegis status`, etc.

#### Clipanion (arcanis/clipanion)
- **Strengths:** Zero runtime dependencies. TypeScript-first design with typed options (`Option.String`, `Option.Boolean`). Used by Yarn Berry. Small bundle. Nested commands via class `paths` static. Excellent for type-safe CLIs.
- **Weaknesses:** Smaller community. Documentation is sparse and examples are limited. Stable v3 released July 2023; v4 still in release candidate since 2024. Fewer third-party resources. The class-based approach is more verbose for simple commands.
- **Suitability for Aegis:** Moderate. The TypeScript ergonomics are appealing, but the smaller ecosystem and less mature stable release pose risk.

#### Yargs (yargs/yargs)
- **Strengths:** Most feature-rich: middleware, advanced parsing, completion generation, localization. v18 is ESM-first. Strong Windows support. Extensive plugin ecosystem. Mature and well-documented.
- **Weaknesses:** Largest bundle size (~100KB+). 261 open issues is concerning. The singleton API removal in v18 is a breaking change. API surface is larger and more complex than needed for Aegis's scope. Heavier dependency tree.
- **Suitability for Aegis:** Moderate. Overkill for Aegis's command surface — we don't need middleware, i18n, or advanced completion. The issue count is a maintenance red flag.

### Recommendation

**Commander v14.x (staying on the maintained LTS line)** is the best fit for Aegis.

Rationale:
- **Command surface fits Commander's model:** Aegis has 5-7 top-level commands (`start`, `phase`, `agent`, `prompt`, `status`, `config`) with a few subcommands. Commander's `.command()` chaining is the natural mapping.
- **Largest ecosystem** means fewer surprises, more Stack Overflow answers, better CI integration.
- **v14.x avoids ESM-only risk:** If the project is still deciding on ESM vs CJS, Commander 14 supports both. v15 ESM-only can be adopted later when the project is fully on ESM.
- **3 open issues** — the lowest of all three, indicating excellent maintenance.
- **Security patches until May 2027** for v14 provides a comfortable window.

Risk of choosing Commander: Less ergonomic TypeScript experience than Clipanion. Must manually type option return values with generics.

---

## 2. Core CLI Dependencies

### chalk
| Field | Value |
|---|---|
| **Package** | `chalk` |
| **Latest version** | v5.6.2 (Jan 2026) |
| **Chosen version** | **v4.1.2** (CJS/ESM dual, stable, TypeScript types built-in) |
| **License** | MIT |
| **Weekly downloads** | ~300M+ |
| **Last commit** | Sep 2025 |
| **Open issues** | 5 |
| **Module system** | v5 is ESM-only; v4 is CJS+ESM |
| **Why Aegis** | Terminal colors for phase highlighting (current phase in green, completed in dim, pending in blue), error messages in red, warnings in yellow. Design system tokens map directly to chalk color constants. |
| **Windows compat** | Excellent. v4.x handles Windows console natively. True-color detection for Windows Terminal. Falls back gracefully to 16-color mode on legacy CMD. |
| **ESM risk** | **CRITICAL:** chalk v5 is ESM-only. Using chalk v5 forces the entire project to ESM. For maximum compatibility, Aegis should use **chalk v4.1.2** which supports both CJS and ESM, has built-in TypeScript declarations, and is still widely used. |
| **Alternatives** | `kleur` (lighter, 3KB, no dependencies) — viable alternative but less ecosystem support. `colorette` (even smaller, 1.5KB) — no gradient/256-color helpers. |

### boxen
| Field | Value |
|---|---|
| **Package** | `boxen` |
| **Latest version** | v8.0.1 (Aug 2024) |
| **License** | MIT |
| **Module system** | ESM-only |
| **Why Aegis** | Bordered boxes for terminal dashboard sections — status panel, feature count, session info. |
| **Windows compat** | Good. Uses standard Unicode box-drawing characters (`─`, `│`, `┌`, etc.) which render on Windows Terminal (10+), PowerShell 5+, and modern CMD. Falls back to ASCII (`-`, `|`, `+`) on legacy terminals via `{borderStyle: 'classic'}` or `{borderStyle: 'single'}`. |
| **ESM risk** | **ESM-only.** If the project stays CJS, boxen cannot be imported via require(). Use dynamic import or stick to CJS-compatible alternatives. |
| **Alternatives** | `cli-boxes` (just the Unicode characters, not a renderer). Manual box drawing with string concatenation (zero-dependency approach — viable if only 1-2 boxes needed). |

### gradient-string
| Field | Value |
|---|---|
| **Package** | `gradient-string` |
| **Latest version** | v3.0.0 (Sep 2024) |
| **License** | MIT |
| **Module system** | CJS + ESM |
| **Why Aegis** | Gradient banner for the Aegis logo/header on `aegis start` dashboard. "AEGIS" in ANSDLC accent indigo gradient (#6366F1 -> #818CF8). |
| **Open issues** | 3 |
| **Windows compat** | Good. Uses ANSI 24-bit color escape sequences supported by Windows Terminal, VS Code terminal, and most modern terminals. Falls back gracefully on legacy CMD. |
| **Alternatives** | `chalk-animation` (animations, heavier). Manual gradient with chalk (more code, zero deps). |

### ora
| Field | Value |
|---|---|
| **Package** | `ora` |
| **Latest version** | v9.4.1 (Jun 2026) |
| **License** | MIT |
| **Module system** | ESM-only |
| **Why Aegis** | Spinners for async operations: workspace scanning, file parsing, config loading. |
| **Open issues** | 0 |
| **Windows compat** | Good on Windows Terminal and VS Code terminal. Uses Unicode spinner frames (dots, arrows) by default. Falls back to simple frames on legacy CMD via `{spinner: 'line'}` or `{spinner: 'simpleDots'}`. `is-unicode-supported` is used internally for fallback detection. |
| **ESM risk** | **ESM-only.** Another push toward ESM-only architecture. |
| **Alternatives** | `cli-spinners` (spinner frames collection, not a renderer). Manual `process.stdout.write('.\r')` approach (zero deps, primitive). `nanospinner` (smaller, CJS-compatible, 1KB). |

### @inquirer/prompts
| Field | Value |
|---|---|
| **Package** | `@inquirer/prompts` |
| **Latest version** | v8.5.2 (May 2026) |
| **Chosen version** | **v7.x** (if CJS needed) or **v8.x** (if ESM) |
| **License** | MIT |
| **Module system** | v8 is ESM-only; v7 is CJS+ESM dual |
| **Why Aegis** | Interactive prompts for API key setup flow (`aegis config key`). Input prompt for the DeepSeek API key, confirm prompt for overwrite confirmation. |
| **Open issues** | 12 |
| **Windows compat** | Excellent. Inquirer.js has extensive Windows testing. Works on PowerShell, CMD, Git Bash, Windows Terminal. |
| **Note** | The legacy `inquirer` package is deprecated. Use `@inquirer/prompts` directly. Each prompt type is a standalone async function — no more `inquirer.prompt([...])` array. |
| **Alternatives** | `enquirer` (alternative by Jon Schlinkert, 25M weekly downloads, CJS+ESM, more customizable but heavier). `@clack/prompts` (modern, minimal, well-designed, ESM-only). |

### figlet
| Field | Value |
|---|---|
| **Package** | `figlet` |
| **Latest version** | v1.11.0 (Mar 2026) |
| **License** | MIT |
| **Module system** | CJS + ESM (dual since v1.9.0) |
| **Why Aegis** | ASCII art banner for the Aegis dashboard header. Standard FIGfont rendering for the "AEGIS" logo. |
| **Open issues** | ~15 |
| **Windows compat** | Fully compatible. Font files are pre-bundled. No terminal-specific issues. |
| **Alternatives** | `ascii-art` (more features, heavier, less maintained). Manual ASCII art strings (zero deps, no flexibility). |

---

## 3. File Parsing Dependencies

### gray-matter
| Field | Value |
|---|---|
| **Package** | `gray-matter` |
| **Latest version** | v4.0.3 (Apr 2021) |
| **License** | MIT |
| **Module system** | CJS |
| **Why Aegis** | Parse YAML frontmatter from agent `.md` files in `.claude/agents/`. Agent files have YAML frontmatter with `name:`, `description:`, `model:`, `when_to_use:` fields. |
| **Open issues** | 54 |
| **Maintenance risk** | **Last published April 2021.** Upstream repo by jonschlinkert is effectively unmaintained. The `js-yaml` dependency is pinned to v3.x (vulnerable). |
| **Windows compat** | No known issues. Works on all platforms. |
| **Better alternative** | `@11ty/gray-matter` — maintained fork by the 11ty team. Upgrades `js-yaml` to v4, removes `eval`-based JavaScript frontmatter (security), uses `Uint8Array` instead of `Buffer` (cross-runtime compat). See below. |

#### Recommendation: Use `@11ty/gray-matter` instead of upstream `gray-matter`

| Aspect | `gray-matter` (upstream) | `@11ty/gray-matter` |
|---|---|---|
| **Version** | v4.0.3 (2021) | v7.x (actively maintained) |
| **js-yaml** | v3.x (vulnerable) | v4.x (current) |
| **Runtime** | Buffer (Node-only) | Uint8Array (cross-runtime) |
| **Security** | Supports JS frontmatter (eval) | Removed eval entirely |
| **Open issues** | 54 | 1 |
| **Maintenance** | Abandoned (no commit since 2021) | Active (11ty team) |
| **API** | Same API | Same API (drop-in replacement) |

#### Alternative: front-matter
- **Package:** `front-matter` (jxson/front-matter)
- **Latest version:** v3.0.0
- **License:** MIT
- **Open issues:** 26
- **Trade-off:** Smaller scope (YAML-only, no JSON/TOML parsers). Lighter weight (~5KB). Still maintained. Lacks the multi-language parser support of gray-matter but Aegis only needs YAML frontmatter.

### glob (Workspace File Scanner)
| Library | Version | License | Bundle size | Dependencies | Open Issues | Notes |
|---|---|---|---|---|---|---|
| **tinyglobby** | v0.2.17 (May 2026) | MIT | ~30KB | 2 | 24 | ESM-first, fastest, actively maintained. Being adopted by major projects (AnalogJS migrated from fast-glob). |
| **fast-glob** | v3.3.3 (Jan 2025) | MIT | ~150KB | 17 | 30 | Best raw performance for large trees. Bash 4.3-compliant patterns. |
| **glob** (v10+) | v10+ | MIT | ~200KB+ | 20+ | varies | ESM-only (v10 breaking). Original Node glob. Slower, legacy API. |
| **globby** | wraps fast-glob | MIT | inherits fast-glob's 150KB | 23 | ~50 | Adds .gitignore support, absolute paths, deduplication. Most features. |

#### Recommendation: tinyglobby
- **Why:** Aegis scans `.claude/agents/` and `project-memory/` directories — small directory trees (tens to low hundreds of files). Performance differences are negligible at this scale. tinyglobby's 2-dependency footprint is ideal for a CLI tool where `npm install -g` time matters.
- **Patterns needed:** `**/*.md` for agent files, `**/*.feature` for spec files, optional `.claude/**` exclusion patterns.
- **Fallback:** fast-glob if tinyglobby's API proves insufficient (more pattern features). Both have similar APIs.

### conf (Persistent Config Storage)
| Field | Value |
|---|---|
| **Package** | `conf` |
| **Latest version** | v15.1.0 (Feb 2026) |
| **License** | MIT |
| **Module system** | ESM (v15+), CJS available in older versions |
| **Why Aegis** | Persistent storage for DeepSeek API key, user preferences (default model, theme), and session history. |
| **Open issues** | 5 |
| **Storage locations** | Uses `env-paths` under the hood: |
| | **Windows:** `%APPDATA%\aegis-nodejs\Config\config.json` |
| | **macOS:** `~/Library/Preferences/aegis-nodejs/config.json` |
| | **Linux:** `~/.config/aegis-nodejs/config.json` |
| **Encryption** | Supports AES-256-CBC / AES-256-GCM / AES-256-CTR via `encryptionKey` option. **However**, the maintainer explicitly warns: "This is not intended for security purposes" — the key lives in plaintext in the Node.js app source. Encryption level: obscurity, not security. |
| **Security model** | Plain JSON file on disk. Encrypted at rest with a key that's as accessible as the file itself. Suitable for casual config protection but not against a motivated attacker. |
| **Alternatives** | See "Secure API Key Storage" section below. |

---

## 4. Dev Tooling

### vitest
| Field | Value |
|---|---|
| **Latest version** | v4.x (stable), v5.0.0-beta.4 (pre-release) |
| **License** | MIT |
| **Requires** | Vite >= 6.4.0, Node >= 22.12.0 |
| **Status** | **Solid choice.** De facto standard for TypeScript testing in 2026. Vitest 4.1 released March 2026 with `--detect-async-leaks`, improved `test.extend` syntax. Jest-compatible API (`describe`/`it`/`expect`). Native ESM/TS support. HMR for tests. |
| **Note** | The project constitution lists Vitest but Node 22 is required for latest versions. If Node 18 compatibility is needed, use Vitest 2.x. |

### prettier
| Field | Value |
|---|---|
| **Latest version** | v3.9.0 (Jun 2026) |
| **License** | MIT |
| **Status** | **Solid choice.** Industry standard. v3.9.0 includes parser upgrades for Markdown, YAML, Flow, GraphQL, Angular. Recommends pinning exact version (`"prettier": "3.9.0"` not `^3.9.0`). |

### eslint
| Field | Value |
|---|---|
| **Latest version** | v10.x (Apr 2026 — v10.1.0) |
| **License** | MIT |
| **Config format** | Flat config only (`eslint.config.js`). Legacy `.eslintrc.*` removed. |
| **Status** | **Solid choice.** v10 is the current major. Flat config is mandatory. Requires Node >= 20.19.0. Use with `typescript-eslint` v8+ for TypeScript support. |
| **Note** | Migration from `.eslintrc.*` required if upgrading existing project. Use `npx @eslint/migrate-config .eslintrc.json` to generate flat config. |

---

## 5. Cross-Platform Terminal Detection

### Key Packages

#### supports-color
| Field | Value |
|---|---|
| **Package** | `supports-color` |
| **Latest version** | v10.2.2 (Sep 2025) |
| **License** | MIT |
| **Module system** | ESM-only (v10+) |
| **Levels** | Level 1 (16 colors) -> Level 2 (256 colors) -> Level 3 (16.7M truecolor) |
| **Why Aegis** | Detect color capabilities. Graceful degradation: if Level 1 only, no gradients. If Level 1+ only, skip boxen border colors. |
| **Note** | Chalk v4.x bundles its own color detection. If using chalk v4.1.2, `supports-color` is already a dependency. For the level-aware API, import directly from `supports-color`. |
| **ENV respects** | `NO_COLOR`, `FORCE_COLOR`, `--color`/`--no-color` CLI flags |

#### is-unicode-supported
| Field | Value |
|---|---|
| **Package** | `is-unicode-supported` |
| **Latest version** | v2.1.0 |
| **License** | MIT |
| **Module system** | ESM |
| **Why Aegis** | Detect if terminal supports Unicode characters. Used by `ora` internally. Aegis should check this to decide: Unicode boxes (boxen) -> ASCII fallback, Unicode spinners -> ASCII fallback, emoji status indicators -> text fallback. |
| **Note** | Also available as CJS in v1.x if needed. |

#### supports-hyperlinks
| Field | Value |
|---|---|
| **Package** | `supports-hyperlinks` |
| **Latest version** | v4.4.0 (Dec 2025) |
| **License** | MIT |
| **Module system** | ESM |
| **Why Aegis** | Detect if terminal supports OSC 8 hyperlinks. Aegis could link agent names to file paths or docs. Falls back to plain text. |
| **ENV respects** | `FORCE_HYPERLINK`, `--no-hyperlinks` |

#### terminal-size
| Field | Value |
|---|---|
| **Package** | `terminal-size` (also as `term-size`) |
| **Latest version** | v4.0.1 |
| **License** | MIT |
| **Module system** | ESM |
| **Why Aegis** | Responsive dashboard layout. If terminal < 80 columns, show compact view. If >= 120 columns, show expanded view with side-by-side panels. Works even when `process.stdout.columns` is unavailable (piped output, child processes). |
| **Note** | Node.js `process.stdout.columns` is unreliable on Windows and undefined in non-interactive mode. This package handles all edge cases. |

### Graceful Degradation Strategy

| Feature | If supported | Fallback |
|---|---|---|
| Colors (Level 3) | Gradient banner, colored boxes | Level 2/1: solid colors. None: no colors |
| Unicode | Box-drawing chars, emoji, spinners | ASCII borders (`+`, `-`, `|`), text-only spinners |
| Hyperlinks | Clickable agent/doc links | Plain file paths |
| Terminal width >= 120 | Side-by-side panels | Stacked layout |
| Terminal width >= 80 | Full dashboard | Minimal status line |

### Windows-Specific Gotchas

1. **Legacy CMD.exe** — Does NOT support truecolor (Level 1 only). Some Unicode support (Codepage 437). Box-drawing characters work in most codepages but not all. Spinners may flicker.
2. **Windows PowerShell 5.x** — Supports Level 2 (256 colors). Good Unicode support. Boxen works. Ora works with `{spinner: 'dots'}`.
3. **PowerShell 7+ (pwsh)** — Supports Level 3 (truecolor) on Windows Terminal. Full Unicode. Same as macOS/Linux behavior.
4. **Git Bash (MSYS2)** — Limited color support (Level 1-2 depending on terminal emulator). Unicode support depends on mintty vs Windows console host.
5. **Windows Terminal** — Full Level 3 truecolor support. Full Unicode. OSC 8 hyperlinks. Best Windows experience.
6. **Key strategy:** Always test on CMD and Windows Terminal at minimum. Use `supports-color.level` to determine rendering approach. Use `is-unicode-supported` to decide border characters.

---

## 6. Secure API Key Storage

### Requirement
Aegis must store a DeepSeek API key. On first run (`aegis start` or `aegis config key`), it prompts for the key and saves it locally.

### Storage Options Comparison

| Option | Encryption | Where stored | Platform support | Security level | Complexity |
|---|---|---|---|---|---|
| **A: conf (plain)** | None | File on disk | All | Low | Low |
| **B: conf + encryptionKey** | AES-256-GCM | File on disk | All | Low-Medium | Low |
| **C: env-paths + custom file** | AES-256-GCM (manual) | File on disk | All | Medium | Medium |
| **D: keytar (OS keychain)** | OS-level | Keychain | Win/macOS/Linux | High | High (native deps) |
| **E: Environment variable** | None | Process/CI env | All | High (env best practice) | None |
| **F: keytar-forked** | OS-level | Keychain | Win/macOS/Linux | High | High (fork stability risk) |

### Option Details

#### A: conf (plain JSON)
- **How:** `new Conf({ projectName: 'aegis' }).set('apiKey', 'sk-xxx')`
- **File:** `~/.config/aegis-nodejs/config.json` (Linux), `%APPDATA%\aegis-nodejs\Config\config.json` (Windows), `~/Library/Preferences/aegis-nodejs/config.json` (macOS)
- **Security:** Plaintext. Anyone with file system access can read the key.
- **Trade-off:** Simple but insecure. Comparable to `gh` CLI's `--insecure-storage` mode.

#### B: conf with encryptionKey
- **How:** `new Conf({ projectName: 'aegis', encryptionKey: 'aegis-cli-enc-key' })`
- **Encryption:** AES-256-GCM
- **Security:** The encryption key is hardcoded in the application binary/source. Trivial to extract. The maintainer explicitly warns: "This is not intended for security purposes."
- **Value:** Deters casual inspection of config files. Does NOT protect against anyone with access to the installed tool.
- **Trade-off:** False sense of security. Better than plaintext but not by much.

#### C: env-paths + manual encrypted file
- **How:** Use `env-paths` to get OS-correct paths, write API key to a file with `chmod 600`, optionally encrypt with Node.js `crypto.createCipheriv`.
- **Encryption:** Developer-managed AES-256-GCM with a derived key from a user-provided passphrase.
- **Security:** Better than conf because the encryption key comes from the user, not the app. However, user must remember a passphrase.
- **Trade-off:** Most flexible but requires more code. Passphrase UX is poor for a CLI tool that should be zero-config.

#### D: keytar (OS keychain) — NOT RECOMMENDED
- **How:** `const keytar = require('keytar'); await keytar.setPassword('aegis', 'deepseek-api-key', apiKey);`
- **Storage:** macOS Keychain, Windows Credential Manager (WinCred), Linux libsecret (GNOME Keyring / KWallet)
- **Security:** OS-level encryption. Keys are encrypted at rest and scoped per application.
- **Problem:** **The original `keytar` package was archived (read-only) by the Atom team on Dec 15, 2022.** No longer maintained. Native dependencies require build toolchain (node-gyp, Python, C++ compiler). Installation failures on systems without build tools are common.

#### E: Environment variable (recommended as option)
- **How:** `export DEEPSEEK_API_KEY=sk-xxx`
- **Security:** Best practice for CI/CD. No persistence on disk. Never leaked in git history (if .env is gitignored).
- **Trade-off:** Must be set on every terminal session (or via `.bashrc`/`.zshrc`). Not user-friendly for the "zero-config" goal of Aegis.

#### F: keytar-forked (maintained fork)
- **Package:** `keytar-forked` or `keytar-forked-forked`
- **Latest version:** v7.10.3 (for `keytar-forked-forked`)
- **Status:** Community-maintained forks exist but stability is uncertain.
- **Trade-off:** Same native dependency issues as original keytar. Fork maintenance is not guaranteed.

### How Major CLIs Handle This

| CLI | Approach | Notes |
|---|---|---|
| **gh (GitHub CLI)** | OS keychain (macOS Keychain, WinCred, GNOME Keyring) with plaintext fallback | `--secure-storage` flag. Falls back to `~/.config/gh/hosts.yml` plaintext silently on headless systems. |
| **npm CLI** | `.npmrc` file in user home directory | Plaintext. Uses file permissions for protection. |
| **sls (Serverless Framework)** | `.env` files + cloud provider secrets manager | Encourages env vars as primary. |
| **AWS CLI** | `~/.aws/credentials` plaintext | Encrypted at rest only if filesystem encryption is enabled. |
| **Vercel CLI** | Encrypted token in `~/.vercel/config.json` | Custom encryption (not OS keychain). |

### Recommendation for Aegis

**Hybrid approach: conf in encrypted mode + env var support.**

```
PRIMARY: Environment variable DEEPSEEK_API_KEY
FALLBACK: conf (plain JSON) at OS-correct config path
```

Implementation:
1. On startup, check `process.env.DEEPSEEK_API_KEY` first.
2. If not set, check `conf` storage.
3. If neither, prompt user via `@inquirer/prompts` (input + confirm).
4. Store in `conf` (plain JSON) — document that this is NOT encrypted but equivalent to how npm/aws-cli work.
5. Provide `aegis config key` to update/rotate.

**Why NOT OS keychain:** The maintenance state of `keytar` is a showstopper. Native dependencies add installation complexity that conflicts with the "zero config, `npm install -g aegis-cli`" goal.

**Why plain conf is acceptable:** Aegis is a local CLI tool on a developer's machine — the same machine where the API key is used in Claude Code anyway. The threat model is: protect against accidental exposure in git, dotfile repos, or screenshots. Conf's JSON file in `~/.config/` with no git exposure is sufficient.

**Future improvement:** If an actively maintained, zero-native-dependency keychain API emerges, migrate. The `conf` config key name should remain the same to support migration.

---

## 7. Dependency Summary Table

| Category | Package | Version | License | ESM/CJS | Bundle size (approx) | Priority |
|---|---|---|---|---|---|---|
| **CLI Framework** | `commander` | ^14.1.0 | MIT | Dual (v14) | ~60KB | Core |
| **Terminal Colors** | `chalk` | ^4.1.2 | MIT | Dual | ~15KB | Core |
| **Terminal Boxes** | `boxen` | ^8.0.1 | MIT | ESM | ~10KB | Dashboard |
| **Gradient Banner** | `gradient-string` | ^3.0.0 | MIT | Dual | ~5KB | Dashboard |
| **Spinner** | `ora` | ^9.4.1 | MIT | ESM | ~15KB | UX |
| **Interactive Prompts** | `@inquirer/prompts` | ^7.0.0 (CJS) or ^8.0.0 (ESM) | MIT | Dual (v7) | ~20KB | Config flow |
| **ASCII Banner** | `figlet` | ^1.11.0 | MIT | Dual | ~50KB (with fonts) | Dashboard |
| **File Parsing** | `@11ty/gray-matter` | ^7.0.0 | MIT | CJS | ~50KB | Agent file parsing |
| **File Globbing** | `tinyglobby` | ^0.2.17 | MIT | ESM | ~30KB | Workspace scanner |
| **Config Storage** | `conf` | ^15.1.0 | MIT | ESM | ~20KB | API key storage |
| **Color Detection** | (bundled with chalk v4) | — | — | — | 0 (already included) | Terminal detection |
| **Unicode Detection** | `is-unicode-supported` | ^2.1.0 | MIT | ESM | ~1KB | Terminal detection |
| **Hyperlink Detection** | `supports-hyperlinks` | ^4.4.0 | MIT | ESM | ~1KB | Terminal detection |
| **Terminal Size** | `terminal-size` | ^4.0.1 | MIT | ESM | ~1KB | Responsive layout |
| **Testing** | `vitest` | ^4.1.0 | MIT | ESM | dev only | Dev tooling |
| **Formatting** | `prettier` | ^3.9.0 | MIT | ESM | dev only | Dev tooling |
| **Linting** | `eslint` | ^10.1.0 | MIT | ESM | dev only | Dev tooling |

### Estimated install footprint (production): ~180-250KB

### Key architectural decision: ESM vs CJS

The majority of modern CLI packages (commander v15, chalk v5, boxen v8, ora v9, conf v15, @inquirer/prompts v8, tinyglobby, is-unicode-supported) are ESM-only.

**Recommendation: Use ESM from project start.** Set `"type": "module"` in package.json. Target Node 22.12+ (which Commander 15 requires anyway). This avoids all the dual-package hazard issues and allows using the latest versions of all dependencies.

If CJS compatibility is required for some consumers, ship a dual-package build via `tsup` or `@knighted/duel`.

---

## Sources

- Commander.js: https://github.com/tj/commander.js
- Clipanion: https://github.com/arcanis/clipanion
- Yargs: https://github.com/yargs/yargs
- Chalk: https://github.com/chalk/chalk
- Boxen: https://github.com/sindresorhus/boxen
- Gradient-string: https://github.com/bokub/gradient-string
- Ora: https://github.com/sindresorhus/ora
- Inquirer.js: https://github.com/SBoudrias/Inquirer.js
- Figlet: https://github.com/patorjk/figlet.js
- Gray-matter: https://github.com/jonschlinkert/gray-matter
- @11ty/gray-matter: https://github.com/11ty/gray-matter
- Tinyglobby: https://github.com/SuperchupuDev/tinyglobby
- Fast-glob: https://github.com/mrmlnc/fast-glob
- Conf: https://github.com/sindresorhus/conf
- Env-paths: https://github.com/sindresorhus/env-paths
- Keytar (archived): https://github.com/atom/node-keytar
- Supports-color: https://github.com/chalk/supports-color
- Is-unicode-supported: https://github.com/sindresorhus/is-unicode-supported
- Supports-hyperlinks: https://github.com/jamestalmage/supports-hyperlinks
- Terminal-size: https://github.com/sindresorhus/terminal-size
- Configstore: https://github.com/sindresorhus/configstore
- Vitest: https://vitest.dev
- Prettier: https://prettier.io
- ESLint: https://eslint.org
- GitHub CLI auth docs: https://github.com/cli/cli/discussions/12488
- Node.js dual package best practices: https://dev.to/gabrielanhaia/shipping-dual-esmcjs-in-2026-the-library-author-checklist-59jk
- Bundle comparison: https://npm-compare.com

---

*Last updated: 2026-07-02. Prepared for Phase 3 (Architecture Design) of Aegis CLI.*
