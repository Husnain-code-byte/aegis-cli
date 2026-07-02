# Product Vision — Aegis CLI

> Amazon Working Backwards format. Written during Phase 0 (Vision Crystallization).
> This document defines WHAT we are building and WHY — not HOW.

---

## Press Release

**Aegis — Your ANSDLC 2.0 Command Center — Launching 2026**

Aegis is a CLI tool that acts as your ANSDLC 2.0 workflow guide. It lives in your terminal alongside Claude Code and knows everything about your development process — what phase you're in, what to do next, which of your 24 AI agents to invoke, and exactly what prompt to paste into Claude Code.

Developers using AI-assisted workflows face a constant challenge: remembering which agent does what, what phase comes next, what the verification protocol requires, and how to phrase prompts effectively. Aegis eliminates this cognitive load entirely.

Aegis reads your project's `.claude/` directory, `project-memory/` files, and git state to understand exactly where you are in the ANSDLC 2.0 lifecycle. It then generates context-aware prompts tailored to your exact situation — your configured agents, your DeepSeek models, your project's feature registry, everything.

Install globally via npm. Navigate to any ANSDLC 2.0 project. Type `aegis start`. Aegis scans your workspace and shows you a beautiful terminal dashboard with your current phase, next action, and a ready-to-copy prompt. Paste that prompt into Claude Code and watch it execute with full context.

---

## FAQ

**Q: What problem does Aegis solve?**
A: ANSDLC 2.0 is powerful but complex — 24 agents, 9 phases, 11 commands, verification gates, refactoring gates. Developers spend mental energy navigating the framework instead of building product. Aegis removes that friction by always knowing where you are and what comes next.

**Q: How is Aegis different from just reading CLAUDE.md?**
A: CLAUDE.md tells you the rules. Aegis tells you the action. It reads your actual project state — your git branch, your feature registry, your last session log — and generates a specific prompt for your exact situation. CLAUDE.md is the constitution; Aegis is your guide through it.

**Q: What do I need to get started?**
A: Node.js 18+, an ANSDLC 2.0 workspace, and Claude Code. Install: `npm install -g aegis-cli`. Type `aegis start`.

---

## Success Criteria
1. `aegis start` shows correct phase, action, and prompt — under 1 second
2. `aegis phase` shows all 9 phases, current phase highlighted in color
3. `aegis prompt` generates a complete, copyable prompt for Claude Code
4. `aegis agent <name>` shows description, model, and usage for all 24 agents
5. `aegis status` shows git branch, feature count, last session date
6. Works on Windows Terminal, PowerShell, Git Bash with full color support
7. `npm install -g aegis-cli` installs and is ready with zero config
8. Generated prompts work correctly when pasted into Claude Code

## Anti-Goals
1. NOT a Claude Code replacement — generates prompts, doesn't execute them
2. NOT a GUI application — terminal-only
3. NOT a project generator — works with existing ANSDLC workspaces
4. NOT a cloud service — fully local
5. NOT a code generator — Aegis guides; Claude Code builds

---

*Last updated: 2026-07-02. Status: Draft — Phase 0.*
