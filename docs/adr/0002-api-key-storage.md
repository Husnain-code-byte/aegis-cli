# ADR-0002: API Key Storage — Env Var Primary + Conf JSON Fallback

- **Status:** Accepted
- **Date:** 2026-07-02
- **Deciders:** system-architect agent (Phase 3), decomposition-guide agent (Phase 2 research)

## Context and Problem Statement

Aegis CLI needs a DeepSeek API key to include in generated prompts. The key must:
- Survive across terminal sessions (persist on disk between invocations)
- Not be exposed in git repositories, screenshots, or logs
- Work in CI/CD environments where no interactive terminal exists
- Be settable and rotatable via a simple command (`aegis config key`)
- Survive `npm uninstall` / `npm install -g` cycles (config persists independently of package)

## Decision Drivers

- Zero native build dependencies (no node-gyp, no Python, no C++ compiler)
- Works identically on Windows, macOS, and Linux
- CI/CD compatibility (env var override)
- Follows established CLI conventions (npm, aws-cli, gh)
- Simple implementation with no external service dependencies

## Considered Options

- **A. Environment variable primary + conf plain JSON fallback** — Check `DEEPSEEK_API_KEY` env var first. If absent, read from `conf` JSON at OS-correct path. If neither found, prompt interactively.
- **B. OS keychain via keytar** — Use the operating system's credential manager (macOS Keychain, Windows Credential Manager, GNOME Keyring)
- **C. Encrypted conf with hardcoded key** — Use `conf` with `encryptionKey` option for AES-256-GCM
- **D. Environment variable only** — No persistent storage, require user to set env var on every session
- **E. .env file in project root** — Read API key from `.env` file with dotenv

## Decision Outcome

Chosen option: **A. Environment variable primary + conf plain JSON fallback.**

### Implementation

1. **Check order:** `process.env.DEEPSEEK_API_KEY` -> `conf.get('apiKey')` -> prompt via `@inquirer/prompts`
2. **Storage path (via `conf` which uses `env-paths`):**
   - Linux: `~/.config/aegis-nodejs/config.json`
   - Windows: `%APPDATA%\aegis-nodejs\Config\config.json`
   - macOS: `~/Library/Preferences/aegis-nodejs/config.json`
3. **Key management command:** `aegis config key` — set, update, or delete the stored API key
4. **Security model:** Plain JSON file with no encryption. This is explicitly documented and follows the same model as npm CLI (`~/.npmrc`), AWS CLI (`~/.aws/credentials`), and gh CLI plaintext fallback mode.

### Why This Is Acceptable

| Threat | Mitigation |
|--------|-----------|
| Accidental git commit | Config file lives outside project directory (in OS config dir) |
| Shoulder surfing | Key is masked during interactive input (`@inquirer/prompts` password input) |
| CI exposure | Env var is standard CI practice |
| Malware reading config | Same threat model as npm, aws-cli, gh — OS file permissions are the defense |

As the Phase 2 reference-collection.md documents: "Aegis is a local CLI tool on a developer's machine — the same machine where the API key is used in Claude Code anyway."

### Consequences

**Positive:**
- Zero native dependencies — no `node-gyp`, no build toolchain required
- Works identically on all 3 OSes with no platform-specific code
- CI-friendly: `export DEEPSEEK_API_KEY=sk-xxx` in CI pipeline works without interactive prompts
- Survives npm uninstall/reinstall — `conf` stores data in the OS config directory, not in `node_modules`
- Simple, auditable code path — ~50 lines total across the store package
- Follows established CLI conventions (npm, aws-cli, gh)

**Negative:**
- API key stored in plaintext on disk — anyone with file system access to the developer machine can read it
- No OS-level keychain integration (macOS Keychain, Windows Credential Manager, GNOME Keyring)
- Must be re-entered on new machines or after OS reinstall (but this is expected behavior for CLI tools)
- `conf` JSON file path varies by OS — must be documented for power users

## Alternatives Considered

### Option B: OS Keychain via keytar

using the `keytar` npm package to store the API key in the OS credential manager.

- **Pros:** OS-level encryption (macOS Keychain, Windows Credential Manager, GNOME Keyring), key survives across apps, users don't need to re-enter after reboot
- **Cons:** **keytar was archived (read-only) in December 2022 by the Atom team** — no longer maintained. Native dependencies require `node-gyp`, Python, and a C++ compiler. Installation failures on systems without build tools are common and the number one support issue for CLIs using it. The maintained forks (`keytar-forked`, `keytar-forked-forked`) have uncertain long-term stability.
- **Rejected because:** The maintenance state of keytar is a showstopper. Native dependencies violate the "zero config, `npm install -g aegis-cli`" goal. Even gh CLI (GitHub) has a plaintext fallback mode exactly because of keychain reliability issues.

### Option C: Encrypted conf with hardcoded key

Using `conf` with the `encryptionKey` option for AES-256-GCM encryption at rest.

- **Pros:** Deters casual inspection of config files, uses AES-256-GCM, same API as plain conf
- **Cons:** The encryption key must be hardcoded in the application source/binary. The conf maintainer explicitly warns: "This is not intended for security purposes." Anyone who can access the config file can also extract the encryption key from the Aegis binary. Provides a false sense of security.
- **Rejected because:** The security improvement over plaintext is marginal, while the false sense of security is dangerous. If encryption is not genuinely protecting against the threat model, we should not pretend it does.

### Option D: Environment variable only

Require the user to always set `DEEPSEEK_API_KEY` in their shell profile or CI.

- **Pros:** Highest security (no key on disk), trivial implementation, standard CI pattern
- **Cons:** Poor UX for the zero-config goal. Must be set in `.bashrc`/`.zshrc`/`.profile`. Breaks on new shell sessions until the user remembers to configure it. Not discoverable — new users won't know they need to set it until they see an error.
- **Rejected because:** Aegis's Vision document explicitly states "Zero config: detects workspace from .claude/ and project-memory/" as a core value. Env-only fails this test. But env var is supported as the PRIMARY source (checked first) for users who prefer it.

### Option E: .env file in project root

Read API key from a `.env` file using `dotenv`.

- **Pros:** Simple, familiar to Node.js developers, easy to `.gitignore`, works with direnv
- **Cons:** .env files are frequently accidentally committed (despite .gitignore), shared across team members in dotfile repos, vary per project (user needs one .env per ANSDLC workspace), and are project-scoped rather than user-scoped
- **Rejected because:** The API key is user-scoped, not project-scoped. A single developer uses the same DeepSeek key across all their ANSDLC projects. Storing it per-project in .env files violates DRY and increases the risk of git exposure.
