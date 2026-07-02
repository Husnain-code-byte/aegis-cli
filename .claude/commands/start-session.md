---
name: start-session
description: Start a new ANSDLC session — load context, confirm scope, declare what will be built. Use at the beginning of every development session.
disable-model-invocation: true
argument-hint: [feature-name] [phase]
allowed-tools: Read, Grep, Glob, Bash(git *)
---

# ANSDLC Session Start

Begin every ANSDLC development session with this skill.

## Process
1. Read the session log: `!cat project-memory/06-session-log.md`
2. Read the feature registry: `!cat project-memory/05-feature-registry.md`
3. Show current git status: `!git status --short`
4. Show current branch: `!git branch --show-current`

Then state:
- **Current Phase:** which ANSDLC phase we're in (0-8)
- **Current Feature:** what feature we're working on ($ARGUMENTS if provided)
- **Scope Declaration:** exactly what files we will and will NOT touch
- **Session Goal:** what will be true when this session is complete
- **Anti-Goals:** what we are explicitly NOT doing this session

Confirm scope with user before proceeding to implementation.
