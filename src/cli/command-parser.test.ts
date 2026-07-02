import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createProgram, type HandlerSpy, type ProgramResult } from './command-parser.js';

// ---------------------------------------------------------------------------
// Test Harness
// ---------------------------------------------------------------------------

function run(args: string): ProgramResult {
  const argv = args.split(/\s+/).filter(Boolean);
  const program = createProgram();
  return program.parseAndCapture(argv);
}

// ---------------------------------------------------------------------------
// 1. Command Routing (8 scenarios)
// ---------------------------------------------------------------------------

describe('Command Routing', () => {
  let result: ProgramResult;

  describe('Route "start" command', () => {
    it('should invoke the start handler exactly once', () => {
      result = run('start');
      expect(result.handlerCalls).toHaveLength(1);
      expect(result.handlerCalls[0].handler).toBe('start');
    });

    it('should not invoke any other handler', () => {
      result = run('start');
      const called = result.handlerCalls.map(c => c.handler);
      expect(called.filter(h => h !== 'start')).toHaveLength(0);
    });
  });

  describe('Route "phase" command', () => {
    it('should invoke the phase handler exactly once', () => {
      result = run('phase');
      expect(result.handlerCalls).toHaveLength(1);
      expect(result.handlerCalls[0].handler).toBe('phase');
    });

    it('should not invoke any other handler', () => {
      result = run('phase');
      const called = result.handlerCalls.map(c => c.handler);
      expect(called.filter(h => h !== 'phase')).toHaveLength(0);
    });
  });

  describe('Route "prompt" command', () => {
    it('should invoke the prompt handler exactly once', () => {
      result = run('prompt');
      expect(result.handlerCalls).toHaveLength(1);
      expect(result.handlerCalls[0].handler).toBe('prompt');
    });

    it('should not invoke any other handler', () => {
      result = run('prompt');
      const called = result.handlerCalls.map(c => c.handler);
      expect(called.filter(h => h !== 'prompt')).toHaveLength(0);
    });
  });

  describe('Route "agent" command with agent name argument', () => {
    it('should invoke the agent handler exactly once', () => {
      result = run('agent decomposition-guide');
      expect(result.handlerCalls).toHaveLength(1);
      expect(result.handlerCalls[0].handler).toBe('agent');
    });

    it('should receive the agent name as an argument', () => {
      result = run('agent decomposition-guide');
      expect(result.handlerCalls[0].args.name).toBe('decomposition-guide');
    });

    it('should not invoke any other handler', () => {
      result = run('agent decomposition-guide');
      const called = result.handlerCalls.map(c => c.handler);
      expect(called.filter(h => h !== 'agent')).toHaveLength(0);
    });
  });

  describe('Route "agent" command without arguments', () => {
    it('should invoke the agent handler exactly once', () => {
      result = run('agent');
      expect(result.handlerCalls).toHaveLength(1);
      expect(result.handlerCalls[0].handler).toBe('agent');
    });

    it('should receive no value for the name argument', () => {
      result = run('agent');
      expect(result.handlerCalls[0].args.name).toBeUndefined();
    });

    it('should not invoke any other handler', () => {
      result = run('agent');
      const called = result.handlerCalls.map(c => c.handler);
      expect(called.filter(h => h !== 'agent')).toHaveLength(0);
    });
  });

  describe('Route "status" command', () => {
    it('should invoke the status handler exactly once', () => {
      result = run('status');
      expect(result.handlerCalls).toHaveLength(1);
      expect(result.handlerCalls[0].handler).toBe('status');
    });

    it('should not invoke any other handler', () => {
      result = run('status');
      const called = result.handlerCalls.map(c => c.handler);
      expect(called.filter(h => h !== 'status')).toHaveLength(0);
    });
  });

  describe('Route "config" command with "key" subcommand', () => {
    it('should invoke the config handler exactly once', () => {
      result = run('config key');
      expect(result.handlerCalls).toHaveLength(1);
      expect(result.handlerCalls[0].handler).toBe('config');
    });

    it('should receive the subcommand "key"', () => {
      result = run('config key');
      expect(result.handlerCalls[0].handler).toBe('config');
      expect(result.handlerCalls[0].args.subcommand).toBe('key');
    });

    it('should not invoke any other handler', () => {
      result = run('config key');
      const called = result.handlerCalls.map(c => c.handler);
      expect(called.filter(h => h !== 'config')).toHaveLength(0);
    });
  });

  describe('Route "workflow" command (placeholder)', () => {
    it('should invoke the workflow handler exactly once', () => {
      result = run('workflow');
      expect(result.handlerCalls).toHaveLength(1);
      expect(result.handlerCalls[0].handler).toBe('workflow');
    });

    it('should not invoke any other handler', () => {
      result = run('workflow');
      const called = result.handlerCalls.map(c => c.handler);
      expect(called.filter(h => h !== 'workflow')).toHaveLength(0);
    });
  });
});

// ---------------------------------------------------------------------------
// 2. Version and Help (3 scenarios)
// ---------------------------------------------------------------------------

describe('Version and Help', () => {
  describe('Display version string', () => {
    it('should output "aegis-cli v0.1.0" to stdout', () => {
      const result = run('--version');
      expect(result.stdout).toContain('aegis-cli v0.1.0');
    });

    it('should exit with code 0', () => {
      const result = run('--version');
      expect(result.exitCode).toBe(0);
    });
  });

  describe('Display help with all commands listed', () => {
    const commands = ['start', 'phase', 'prompt', 'agent', 'status', 'config', 'workflow'];

    for (const cmd of commands) {
      it(`should list "${cmd}" in help output`, () => {
        const result = run('--help');
        expect(result.stdout).toContain(cmd);
      });
    }

    it('should exit with code 0', () => {
      const result = run('--help');
      expect(result.exitCode).toBe(0);
    });
  });

  describe('Display help when no command is provided', () => {
    it('should output all 8 registered command names', () => {
      const result = run('');
      const cmdNames = ['start', 'phase', 'prompt', 'agent', 'status', 'config', 'workflow', 'help'];
      for (const name of cmdNames) {
        expect(result.stdout).toContain(name);
      }
    });

    it('should exit with code 0', () => {
      const result = run('');
      expect(result.exitCode).toBe(0);
    });
  });
});

// ---------------------------------------------------------------------------
// 3. Global Flags (4 scenarios)
// ---------------------------------------------------------------------------

describe('Global Flags', () => {
  describe('Parse --json flag with command', () => {
    it('should invoke the start handler', () => {
      const result = run('start --json');
      expect(result.handlerCalls).toHaveLength(1);
      expect(result.handlerCalls[0].handler).toBe('start');
    });

    it('should pass json option as true', () => {
      const result = run('start --json');
      expect(result.handlerCalls[0].opts.json).toBe(true);
    });
  });

  describe('Parse --no-color flag with command', () => {
    it('should invoke the status handler', () => {
      const result = run('status --no-color');
      expect(result.handlerCalls).toHaveLength(1);
      expect(result.handlerCalls[0].handler).toBe('status');
    });

    it('should pass noColor option as true', () => {
      const result = run('status --no-color');
      expect(result.handlerCalls[0].opts.noColor).toBe(true);
    });
  });

  describe('Global flag before command routes correctly', () => {
    it('should invoke the status handler when --json is before the command', () => {
      const result = run('--json status');
      expect(result.handlerCalls).toHaveLength(1);
      expect(result.handlerCalls[0].handler).toBe('status');
    });

    it('should pass json option as true', () => {
      const result = run('--json status');
      expect(result.handlerCalls[0].opts.json).toBe(true);
    });
  });

  describe('Combined global flags both parsed', () => {
    it('should invoke the phase handler', () => {
      const result = run('--no-color --json phase');
      expect(result.handlerCalls).toHaveLength(1);
      expect(result.handlerCalls[0].handler).toBe('phase');
    });

    it('should pass both noColor and json as true', () => {
      const result = run('--no-color --json phase');
      expect(result.handlerCalls[0].opts.noColor).toBe(true);
      expect(result.handlerCalls[0].opts.json).toBe(true);
    });
  });
});

// ---------------------------------------------------------------------------
// 4. Error Path (2 scenarios)
// ---------------------------------------------------------------------------

describe('Error Path', () => {
  describe('Unknown command displays suggestion and exits with code 1', () => {
    it('should output [ERROR] to stderr', () => {
      const result = run('starrt');
      expect(result.stderr).toContain('[ERROR]');
    });

    it('should output "Unknown command" to stderr', () => {
      const result = run('starrt');
      expect(result.stderr).toContain('Unknown command');
    });

    it('should output "Did you mean" to stderr', () => {
      const result = run('starrt');
      expect(result.stderr).toContain('Did you mean');
    });

    it('should not invoke any handler', () => {
      const result = run('starrt');
      expect(result.handlerCalls).toHaveLength(0);
    });

    it('should exit with code 1', () => {
      const result = run('starrt');
      expect(result.exitCode).toBe(1);
    });
  });

  describe('Unknown command outputs error to stderr only', () => {
    it('should have non-empty stderr', () => {
      const result = run('xyzzy');
      expect(result.stderr.length).toBeGreaterThan(0);
    });

    it('should have empty stdout', () => {
      const result = run('xyzzy');
      expect(result.stdout).toBe('');
    });

    it('should exit with code 1', () => {
      const result = run('xyzzy');
      expect(result.exitCode).toBe(1);
    });
  });
});

// ---------------------------------------------------------------------------
// 5. Edge Cases (5 scenarios)
// ---------------------------------------------------------------------------

describe('Edge Cases', () => {
  describe('Case-sensitive command matching rejects uppercase', () => {
    it('should output [ERROR] to stderr', () => {
      const result = run('START');
      expect(result.stderr).toContain('[ERROR]');
    });

    it('should not invoke the start handler', () => {
      const result = run('START');
      const called = result.handlerCalls.map(c => c.handler);
      expect(called).not.toContain('start');
    });

    it('should exit with code 1', () => {
      const result = run('START');
      expect(result.exitCode).toBe(1);
    });
  });

  describe('Extra whitespace between command tokens', () => {
    it('should invoke the status handler despite extra spaces', () => {
      const result = run('   status');
      expect(result.handlerCalls).toHaveLength(1);
      expect(result.handlerCalls[0].handler).toBe('status');
    });

    it('should not invoke any other handler', () => {
      const result = run('   status');
      const called = result.handlerCalls.map(c => c.handler);
      expect(called.filter(h => h !== 'status')).toHaveLength(0);
    });
  });

  describe('Config command without subcommand shows subcommand help', () => {
    it('should show the subcommand name "key" in output', () => {
      const result = run('config');
      expect(result.stdout).toContain('key');
    });

    it('should exit with code 0', () => {
      const result = run('config');
      expect(result.exitCode).toBe(0);
    });
  });

  describe('Command-specific help with --help flag', () => {
    it('should show "agent" in help output', () => {
      const result = run('agent --help');
      expect(result.stdout).toContain('agent');
    });

    it('should show "Usage" in help output', () => {
      const result = run('agent --help');
      expect(result.stdout).toContain('Usage');
    });

    it('should not invoke the agent handler', () => {
      const result = run('agent --help');
      const called = result.handlerCalls.map(c => c.handler);
      expect(called).not.toContain('agent');
    });

    it('should exit with code 0', () => {
      const result = run('agent --help');
      expect(result.exitCode).toBe(0);
    });
  });

  describe('--help flag before command shows global help', () => {
    it('should output all 8 registered command names', () => {
      const result = run('--help start');
      const cmdNames = ['start', 'phase', 'prompt', 'agent', 'status', 'config', 'workflow', 'help'];
      for (const name of cmdNames) {
        expect(result.stdout).toContain(name);
      }
    });

    it('should not invoke the start handler', () => {
      const result = run('--help start');
      const called = result.handlerCalls.map(c => c.handler);
      expect(called).not.toContain('start');
    });

    it('should exit with code 0', () => {
      const result = run('--help start');
      expect(result.exitCode).toBe(0);
    });
  });
});

// ---------------------------------------------------------------------------
// 6. Spec-Reviewer Addition Scenarios (5 scenarios)
// ---------------------------------------------------------------------------

describe('Spec-Reviewer Additions', () => {
  describe('Display version with short flag -V', () => {
    it('should output "aegis-cli v0.1.0" to stdout', () => {
      const result = run('-V');
      expect(result.stdout).toContain('aegis-cli v0.1.0');
    });

    it('should exit with code 0', () => {
      const result = run('-V');
      expect(result.exitCode).toBe(0);
    });
  });

  describe('Display help with short flag -h', () => {
    it('should output all 8 registered command names', () => {
      const result = run('-h');
      const cmdNames = ['start', 'phase', 'prompt', 'agent', 'status', 'config', 'workflow', 'help'];
      for (const name of cmdNames) {
        expect(result.stdout).toContain(name);
      }
    });

    it('should exit with code 0', () => {
      const result = run('-h');
      expect(result.exitCode).toBe(0);
    });
  });

  describe('Explicit "help" command shows global help', () => {
    it('should output all 8 registered command names', () => {
      const result = run('help');
      const cmdNames = ['start', 'phase', 'prompt', 'agent', 'status', 'config', 'workflow', 'help'];
      for (const name of cmdNames) {
        expect(result.stdout).toContain(name);
      }
    });

    it('should exit with code 0', () => {
      const result = run('help');
      expect(result.exitCode).toBe(0);
    });
  });

  describe('Route "agent" command with numeric agent ID', () => {
    it('should invoke the agent handler exactly once', () => {
      const result = run('agent 00');
      expect(result.handlerCalls).toHaveLength(1);
      expect(result.handlerCalls[0].handler).toBe('agent');
    });

    it('should receive the name "00" as an argument', () => {
      const result = run('agent 00');
      expect(result.handlerCalls[0].args.name).toBe('00');
    });

    it('should not invoke any other handler', () => {
      const result = run('agent 00');
      const called = result.handlerCalls.map(c => c.handler);
      expect(called.filter(h => h !== 'agent')).toHaveLength(0);
    });
  });

  describe('Unknown flag with valid command does not crash', () => {
    it('should invoke the start handler', () => {
      const result = run('start --unknown-flag');
      expect(result.handlerCalls).toHaveLength(1);
      expect(result.handlerCalls[0].handler).toBe('start');
    });

    it('should have empty stderr', () => {
      const result = run('start --unknown-flag');
      expect(result.stderr).toBe('');
    });

    it('should exit with code 0', () => {
      const result = run('start --unknown-flag');
      expect(result.exitCode).toBe(0);
    });
  });
});

// ---------------------------------------------------------------------------
// 7. Resolved OQ Behaviors (3 scenarios)
// ---------------------------------------------------------------------------

describe('Resolved Open Question Behaviors', () => {
  describe('Unknown command with no close match omits suggestion clause', () => {
    it('should output [ERROR] to stderr', () => {
      const result = run('zzzzz');
      expect(result.stderr).toContain('[ERROR]');
    });

    it('should output "Unknown command \'zzzzz\'" to stderr', () => {
      const result = run('zzzzz');
      expect(result.stderr).toContain("Unknown command 'zzzzz'");
    });

    it('should NOT contain "Did you mean"', () => {
      const result = run('zzzzz');
      expect(result.stderr).not.toContain('Did you mean');
    });

    it('should not invoke any handler', () => {
      const result = run('zzzzz');
      expect(result.handlerCalls).toHaveLength(0);
    });

    it('should exit with code 1', () => {
      const result = run('zzzzz');
      expect(result.exitCode).toBe(1);
    });
  });

  describe('Workflow command shows coming-soon stub output', () => {
    it('should invoke the workflow handler', () => {
      const result = run('workflow');
      expect(result.handlerCalls).toHaveLength(1);
      expect(result.handlerCalls[0].handler).toBe('workflow');
    });

    it('should output "not yet implemented"', () => {
      const result = run('workflow');
      expect(result.stdout).toContain('not yet implemented');
    });
  });

  describe('Workflow listed as coming soon in help output', () => {
    it('should contain "workflow" in help output', () => {
      const result = run('--help');
      expect(result.stdout).toContain('workflow');
    });

    it('should contain "(coming soon)" in help output', () => {
      const result = run('--help');
      expect(result.stdout).toContain('(coming soon)');
    });
  });
});
