import { describe, it, expect, afterEach } from 'vitest';
import { detectWorkspace, validateWorkspace } from './workspace.js';
import { WorkspaceError } from '../shared/errors.js';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';

// ---------------------------------------------------------------------------
// Helpers — real filesystem with temp directories
// ---------------------------------------------------------------------------

function tmpDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'aegis-test-'));
}

function cleanup(dir: string) {
  fs.rmSync(dir, { recursive: true, force: true });
}

// ---------------------------------------------------------------------------
// Happy Path
// ---------------------------------------------------------------------------

describe('detectWorkspace — Happy Path', () => {
  it('should detect a valid workspace when both dirs exist', () => {
    const root = tmpDir();
    fs.mkdirSync(path.join(root, '.claude'));
    fs.mkdirSync(path.join(root, 'project-memory'));
    const result = detectWorkspace(root);
    expect(result.valid).toBe(true);
    expect(result.root).toBe(path.resolve(root));
    cleanup(root);
  });

  it('should detect workspace from a subdirectory by walking up', () => {
    const root = tmpDir();
    fs.mkdirSync(path.join(root, '.claude'));
    fs.mkdirSync(path.join(root, 'project-memory'));
    const sub = path.join(root, 'src', 'cli', 'utils');
    fs.mkdirSync(sub, { recursive: true });
    const result = detectWorkspace(sub);
    expect(result.valid).toBe(true);
    expect(result.root).toBe(path.resolve(root));
    cleanup(root);
  });

  it('should use process.cwd() when no cwd is given', () => {
    // We can't easily test process.cwd() reliably, but at minimum it shouldn't crash
    const result = detectWorkspace();
    expect(typeof result.valid).toBe('boolean');
  });
});

// ---------------------------------------------------------------------------
// Missing Directories
// ---------------------------------------------------------------------------

describe('detectWorkspace — Missing Directories', () => {
  it('should report missing .claude/ only', () => {
    const root = tmpDir();
    fs.mkdirSync(path.join(root, 'project-memory'));
    const result = detectWorkspace(root);
    expect(result.valid).toBe(false);
    expect(result.missing).toEqual(['.claude/']);
    cleanup(root);
  });

  it('should report missing project-memory/ only', () => {
    const root = tmpDir();
    fs.mkdirSync(path.join(root, '.claude'));
    const result = detectWorkspace(root);
    expect(result.valid).toBe(false);
    expect(result.missing).toEqual(['project-memory/']);
    cleanup(root);
  });

  it('should report both missing when dirs absent from walk chain', () => {
    const root = tmpDir();
    const result = detectWorkspace(root);
    expect(result.valid).toBe(false);
    // missing may be ['both'] or a partial if parent walk finds markers;
    // either way valid is false and notAnAnsdlc is set when neither found at root
    if (result.notAnAnsdlc) {
      expect(result.missing).toEqual(['both']);
    }
    cleanup(root);
  });
});

// ---------------------------------------------------------------------------
// validateWorkspace
// ---------------------------------------------------------------------------

describe('validateWorkspace', () => {
  it('should not throw for a valid workspace', () => {
    const root = tmpDir();
    fs.mkdirSync(path.join(root, '.claude'));
    fs.mkdirSync(path.join(root, 'project-memory'));
    expect(() => validateWorkspace(root)).not.toThrow();
    cleanup(root);
  });

  it('should throw WorkspaceError for missing .claude/', () => {
    const root = tmpDir();
    fs.mkdirSync(path.join(root, 'project-memory'));
    expect(() => validateWorkspace(root)).toThrow(WorkspaceError);
    try { validateWorkspace(root); } catch (e) {
      expect(e).toBeInstanceOf(WorkspaceError);
      expect((e as WorkspaceError).exitCode).toBe(2);
      expect((e as WorkspaceError).message).toContain('.claude/');
    }
    cleanup(root);
  });

  it('should throw WorkspaceError for not an ANSDLC workspace', () => {
    const root = tmpDir();
    expect(() => validateWorkspace(root)).toThrow(WorkspaceError);
    try { validateWorkspace(root); } catch (e) {
      expect((e as WorkspaceError).exitCode).toBe(2);
      expect((e as WorkspaceError).message).toContain('ANSDLC');
    }
    cleanup(root);
  });
});

// ---------------------------------------------------------------------------
// Walk Boundary
// ---------------------------------------------------------------------------

describe('detectWorkspace — Walk Boundary', () => {
  it('should stop at filesystem root without error', () => {
    // Start from / (or C:\) — should not crash and return notAnAnsdlc
    const result = detectWorkspace('/');
    expect(result.valid).toBe(false);
  });

  it('should find workspace several levels up', () => {
    const root = tmpDir();
    fs.mkdirSync(path.join(root, '.claude'));
    fs.mkdirSync(path.join(root, 'project-memory'));
    const deep = path.join(root, 'a', 'b', 'c', 'd', 'e');
    fs.mkdirSync(deep, { recursive: true });
    const result = detectWorkspace(deep);
    expect(result.valid).toBe(true);
    expect(result.root).toBe(path.resolve(root));
    cleanup(root);
  });
});

// ---------------------------------------------------------------------------
// Edge Cases
// ---------------------------------------------------------------------------

describe('detectWorkspace — Edge Cases', () => {
  it('should handle non-existent cwd gracefully', () => {
    const result = detectWorkspace('/definitely/does/not/exist/anywhere');
    expect(result.valid).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('should handle empty string cwd (uses process.cwd())', () => {
    const result = detectWorkspace('');
    expect(typeof result.valid).toBe('boolean');
  });

  it('should handle undefined cwd (uses process.cwd())', () => {
    const result = detectWorkspace(undefined);
    expect(typeof result.valid).toBe('boolean');
  });

  it('should detect workspace at current project root', () => {
    // The actual project root (C:\ANSDLC\ANSDLC-Workspace) IS a valid workspace
    const result = detectWorkspace(process.cwd());
    expect(result.valid).toBe(true);
    expect(result.root).toBeDefined();
  });
});
