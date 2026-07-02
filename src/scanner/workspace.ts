import * as fs from 'node:fs';
import * as path from 'node:path';
import type { WorkspaceDetection } from '../shared/types.js';
import { WorkspaceError } from '../shared/errors.js';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const REQUIRED_DIRS = ['.claude', 'project-memory'] as const;
const MAX_DEPTH = 100;

// ---------------------------------------------------------------------------
// detectWorkspace
// ---------------------------------------------------------------------------

/**
 * Detect whether `cwd` is inside an ANSDLC 2.0 workspace by walking up
 * the directory tree looking for `.claude/` and `project-memory/` directories.
 *
 * @param cwd — starting directory (defaults to process.cwd())
 * @returns WorkspaceDetection with validity, root path, and missing dirs
 */
export function detectWorkspace(cwd?: string): WorkspaceDetection {
  // Resolve starting directory
  let current: string;
  try {
    current = cwd && cwd.length > 0 ? fs.realpathSync(path.resolve(cwd)) : process.cwd();
  } catch (err: unknown) {
    const ce = err as { code?: string; message?: string };
    return {
      valid: false,
      error: ce.message ?? String(err),
    };
  }

  // Walk upward looking for both .claude/ and project-memory/
  let partialRoot: string | null = null;
  let partialHasClaude = false;
  let partialHasPm = false;

  for (let depth = 0; depth < MAX_DEPTH; depth++) {
    try {
      fs.statSync(current); // ensure directory is readable
    } catch (err: unknown) {
      const ce = err as { code?: string; message?: string };
      return { valid: false, error: ce.message ?? String(err) };
    }

    const claudeExists = dirExists(path.join(current, '.claude'));
    const pmExists = dirExists(path.join(current, 'project-memory'));

    if (claudeExists && pmExists) {
      return { valid: true, root: current };
    }

    // Track partial match — if we find one but not both,
    // remember this as the candidate root
    if ((claudeExists || pmExists) && partialRoot === null) {
      partialRoot = current;
      partialHasClaude = claudeExists;
      partialHasPm = pmExists;
    }

    // Check if we're at the filesystem root
    const parent = path.dirname(current);
    if (parent === current) {
      // If we found a partial match at some level, report from there
      if (partialRoot !== null) {
        return missingResult(partialRoot, partialHasClaude, partialHasPm);
      }
      return missingResult(current, claudeExists, pmExists);
    }
    current = parent;
  }

  // Max depth reached — treat as not found
  return missingResult(current, false, false);
}

/** Check if a path exists and is a directory. */
function dirExists(p: string): boolean {
  try {
    return fs.existsSync(p) && fs.statSync(p).isDirectory();
  } catch {
    return false;
  }
}

/** Build the missing-directories result. */
function missingResult(
  root: string,
  hasClaude: boolean,
  hasPm: boolean,
): WorkspaceDetection {
  if (!hasClaude && !hasPm) {
    return { valid: false, root, missing: ['both'], notAnAnsdlc: true };
  }
  const missing: string[] = [];
  if (!hasClaude) missing.push('.claude/');
  if (!hasPm) missing.push('project-memory/');
  return { valid: false, root, missing };
}

// ---------------------------------------------------------------------------
// validateWorkspace
// ---------------------------------------------------------------------------

/**
 * Validate that `cwd` is an ANSDLC workspace. Throws WorkspaceError if not.
 * Uses detectWorkspace internally.
 */
export function validateWorkspace(cwd?: string): void {
  const detection = detectWorkspace(cwd);

  if (detection.valid) return;

  // Filesystem/permission error → exit code 3
  if (detection.error) {
    throw new WorkspaceError(
      `Cannot access workspace: ${detection.error}`,
      3,
    );
  }

  // Missing directories → exit code 2
  if (detection.notAnAnsdlc) {
    throw new WorkspaceError(
      `Not an ANSDLC 2.0 workspace. Expected .claude/ and project-memory/ directories at ${detection.root ?? 'the project root'}.`,
      2,
    );
  }

  const missingList = (detection.missing ?? []).join(' and ');
  throw new WorkspaceError(
    `Missing ${missingList} in workspace at ${detection.root}. ANSDLC 2.0 workspaces require both .claude/ and project-memory/ directories.`,
    2,
  );
}
