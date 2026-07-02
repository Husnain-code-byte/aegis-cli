---
name: end-session
description: End an ANSDLC session — save session log, commit if verified, update context documents. Use at the end of every development session.
disable-model-invocation: true
allowed-tools: Read, Write, Edit, Bash(git *)
---

# ANSDLC Session End

Close the current ANSDLC session properly.

## Process
1. **Summarize what was done** — what files changed, what features progressed, what was verified
2. **Update session log** — append entry to `project-memory/06-session-log.md`:
   ```
   ## Session: YYYY-MM-DD HH:MM
   - Feature: [name]
   - Phase: [number]
   - Done: [what was accomplished]
   - Not done: [what was deferred]
   - Learned: [key insight or decision]
   - Next session: [what to do next]
   ```
3. **Update feature registry** — if a feature status changed, update `project-memory/05-feature-registry.md`
4. **Verify verification gates** — run `/verify-feature` and confirm all gates pass
5. **If all gates pass:** stage changes and generate structured commit message (do NOT commit — ask human first)
6. **If any gate fails:** state which gate and what needs fixing — do NOT commit
7. **Commit message format** (for human to approve):
   ```
   feat(scope): description of change [AI-assisted]

   - What was implemented
   - What tests were added
   - Verification results

   Co-Authored-By: Claude <noreply@anthropic.com>
   ```

Confirm all steps complete before ending.
