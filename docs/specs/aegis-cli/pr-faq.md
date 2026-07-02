# Aegis — PR/FAQ

> Amazon Working Backwards format. ANSDLC Phase 0 artifact.

---

## Press Release

**Aegis — Your ANSDLC 2.0 Command Center — Launching 2026**

**Terminal, Everywhere** — Today we announced **Aegis**, a CLI tool that acts as your ANSDLC 2.0 workflow guide. Aegis lives in your terminal alongside Claude Code and knows everything about your development process — what phase you're in, what to do next, which of your 24 AI agents to invoke, and exactly what prompt to paste into Claude Code.

Developers using AI-assisted workflows face a constant challenge: remembering which agent does what, what phase comes next, what the verification protocol requires, and how to phrase prompts effectively. Aegis eliminates this cognitive load entirely.

> "Before Aegis, I was constantly re-reading my CLAUDE.md and agent files trying to remember what to do next. Now I just type `aegis start` and it tells me exactly where I am, what to do, and gives me the prompt to copy-paste. It's like having a senior ANSDLC coach sitting next to me." — Early User

Aegis reads your project's `.claude/` directory, `project-memory/` files, and git state to understand exactly where you are in the ANSDLC 2.0 lifecycle. It then generates context-aware prompts tailored to your exact situation — your configured agents, your DeepSeek models, your project's feature registry, everything.

**How it works:** Install globally via npm. Navigate to any ANSDLC 2.0 project. Type `aegis start`. Aegis scans your workspace and shows you a beautiful terminal dashboard with your current phase, next action, and a ready-to-copy prompt. Paste that prompt into Claude Code and watch it execute with full context.

**Why it matters:** The gap between "I have Claude Code installed" and "I'm shipping production software with ANSDLC 2.0" is knowledge. Aegis bridges that gap. It encodes the entire ANSDLC 2.0 framework — all 9 phases, 24 agents, 11 commands, 6 rules, verification protocols, and workflow patterns — into a simple CLI that any developer can use immediately.

---

## FAQ

### External Questions (Customers Ask)

**Q: What problem does Aegis solve?**
A: ANSDLC 2.0 is powerful but complex — 24 agents, 9 phases, 11 commands, verification gates, refactoring gates. Developers spend mental energy navigating the framework instead of building product. Aegis removes that friction by always knowing where you are and what comes next.

**Q: How is Aegis different from just reading the CLAUDE.md?**
A: CLAUDE.md tells you the rules. Aegis tells you the action. It reads your actual project state — your git branch, your feature registry, your last session log — and generates a specific prompt for your exact situation. CLAUDE.md is the constitution; Aegis is your guide through it.

**Q: What do I need to get started?**
A: Node.js 18+, an ANSDLC 2.0 workspace (with `.claude/` and `project-memory/` directories), and Claude Code installed. Install Aegis globally: `npm install -g aegis-cli`. Navigate to your project. Type `aegis start`.

### Internal Questions (Team Asks)

**Q: What is the success criteria?**
A:
1. Developer navigates to ANSDLC workspace and types `aegis start` — sees correct phase, next action, and a valid prompt in under 1 second
2. Generated prompts include correct agent names, command names, and file paths from the actual project
3. `aegis phase` shows the complete 9-phase ANSDLC map with current phase highlighted
4. `aegis agent <name>` returns the agent's purpose, model, when to use it, and an example invocation prompt
5. Zero configuration needed — Aegis auto-detects everything from `.claude/` and `project-memory/`

**Q: What are we explicitly NOT building?**
A:
1. Aegis does NOT execute Claude Code or call the DeepSeek API — it generates prompts only
2. Aegis does NOT modify project files — it reads and reports, never writes
3. Aegis is NOT a GUI — terminal only, matching the Claude Code aesthetic
4. Aegis does NOT replace any ANSDLC file — it supplements, not substitutes
5. No cloud sync, no accounts, no telemetry — fully local, fully offline

**Q: What are the biggest risks?**
A:
1. The ANSDLC framework evolves — Aegis must be easy to update when agents/commands change
2. Terminal compatibility across Windows (PowerShell, Git Bash, CMD, Windows Terminal)
3. Performance — must read and parse files in under 1 second for snappy UX

**Q: What assumptions are we making?**
A:
1. User has an ANSDLC 2.0 workspace with `.claude/` and `project-memory/` directories
2. User has Claude Code installed and configured with DeepSeek
3. User's terminal supports ANSI colors (Windows Terminal, iTerm2, etc.)
4. Node.js 18+ is installed globally

---

## Success Criteria
1. `aegis start` shows correct phase, action, and prompt — under 1 second
2. `aegis phase` shows all 9 phases, current phase highlighted in color
3. `aegis prompt` generates a complete, copyable prompt for Claude Code
4. `aegis agent <name>` shows description, model, and when to use for all 24 agents
5. `aegis status` shows git branch, feature count, last session date
6. Works on Windows Terminal, PowerShell, Git Bash with full color support
7. `npm install -g aegis-cli` installs and is ready to use with zero config
8. Generated prompts work correctly when pasted into Claude Code

## Anti-Goals
1. NOT a Claude Code replacement — generates prompts, doesn't execute them
2. NOT a GUI application — terminal-only, matching the developer workflow
3. NOT a project generator — works with existing ANSDLC workspaces
4. NOT a cloud service — fully local, reads files from disk only
5. NOT a code generator — Aegis guides; Claude Code builds

---

*Status: Draft. Phase 0 — awaiting vision-analyst review.*
