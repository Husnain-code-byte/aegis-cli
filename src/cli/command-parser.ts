import { Command } from 'commander';
import type { HandlerCall, ProgramResult } from '../shared/types.js';
import { VERSION, COMMAND_NAMES, EXIT_SENTINEL } from '../shared/constants.js';
import { UnknownCommandError, findSuggestions, classifyCommanderError } from '../shared/errors.js';

export type { HandlerCall as HandlerSpy, ProgramResult };

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Register a leaf command with flag passthrough and a simple action. */
function registerCommand(
  program: Command,
  nameAndArgs: string,
  description: string,
  action: (...args: string[]) => void,
): void {
  program
    .command(nameAndArgs)
    .description(description)
    .allowUnknownOption(true)
    .allowExcessArguments(true)
    .action((...args: string[]) => action(...args));
}

// ---------------------------------------------------------------------------
// createProgram
// ---------------------------------------------------------------------------

export function createProgram(): {
  program: Command;
  parseAndCapture(argv: string[]): ProgramResult;
} {
  const handlerCalls: HandlerCall[] = [];

  function recordCall(handler: string, args: Record<string, unknown> = {}) {
    handlerCalls.push({ handler, args, opts: {} });
  }

  // -------------------------------------------------------------------
  // Build Commander program
  // -------------------------------------------------------------------
  const program = new Command();

  program
    .name('aegis')
    .description('ANSDLC 2.0 workflow guide — your command center for AI-assisted development')
    .version(VERSION, '-V, --version', 'Output the version string')
    .helpOption('-h, --help', 'Display help for commands')
    .option('--no-color', 'Disable terminal colors')
    .option('--json', 'Output in JSON format')
    .allowUnknownOption(true)
    .exitOverride();

  // -------------------------------------------------------------------
  // Register 8 commands
  // -------------------------------------------------------------------
  registerCommand(program, 'start', 'Full dashboard with phase, status, and prompt', () => recordCall('start'));
  registerCommand(program, 'phase', 'Show current ANSDLC phase info', () => recordCall('phase'));
  registerCommand(program, 'prompt', 'Generate a prompt for Claude Code', () => recordCall('prompt'));
  registerCommand(program, 'status', 'Workspace summary', () => recordCall('status'));

  // agent — has optional argument, registered manually
  program
    .command('agent [name]')
    .description('Agent details or directory listing')
    .allowUnknownOption(true)
    .action((name?: string) => recordCall('agent', { name }));

  // config + subcommand
  const configCmd = program
    .command('config')
    .description('API key and configuration management')
    .allowUnknownOption(true)
    .allowExcessArguments(true)
    .exitOverride()
    .action(() => configCmd.outputHelp());
  configCmd
    .command('key')
    .description('Manage DeepSeek API key')
    .allowUnknownOption(true)
    .allowExcessArguments(true)
    .exitOverride()
    .action(() => recordCall('config', { subcommand: 'key' }));

  // workflow — with stub output
  program
    .command('workflow')
    .description('Workflow operations (coming soon)')
    .allowUnknownOption(true)
    .allowExcessArguments(true)
    .action(() => {
      recordCall('workflow');
      process.stdout.write('Workflow management is not yet implemented.\n');
    });

  // help — accepts optional [command] arg
  program
    .command('help [command]')
    .description('Show help for all commands, or help for a specific command')
    .allowUnknownOption(true)
    .allowExcessArguments(true)
    .action((cmd?: string) => {
      const target = cmd ? program.commands.find(c => c.name() === cmd) : null;
      (target || program).outputHelp();
    });

  // -------------------------------------------------------------------
  // Unknown command handler
  // -------------------------------------------------------------------
  program.on('command:*', (unknownArgs: string[]) => {
    const input = unknownArgs[0];
    const suggestions = findSuggestions(input, COMMAND_NAMES as unknown as string[]);
    process.stderr.write(`${new UnknownCommandError(input, suggestions).message}\n`);
    const exitErr = new Error(EXIT_SENTINEL) as Error & { code: string; exitCode: number };
    exitErr.code = EXIT_SENTINEL;
    exitErr.exitCode = 1;
    throw exitErr;
  });

  // -------------------------------------------------------------------
  // Test harness (returned alongside raw program)
  // -------------------------------------------------------------------

  return {
    program,

    parseAndCapture(argv: string[]): ProgramResult {
      let stdout = '';
      let stderr = '';
      let exitCode = 0;

      const stdoutWrite = process.stdout.write.bind(process.stdout);
      const stderrWrite = process.stderr.write.bind(process.stderr);

      process.stdout.write = ((chunk: string | Uint8Array) => {
        stdout += typeof chunk === 'string' ? chunk : new TextDecoder().decode(chunk);
        return true;
      }) as typeof process.stdout.write;

      process.stderr.write = ((chunk: string | Uint8Array) => {
        stderr += typeof chunk === 'string' ? chunk : new TextDecoder().decode(chunk);
        return true;
      }) as typeof process.stderr.write;

      try {
        handlerCalls.length = 0;

        if (argv.length === 0) {
          program.outputHelp();
        } else {
          try {
            program.parse(argv, { from: 'user' });
          } catch (err: unknown) {
            const classified = classifyCommanderError(err);
            if (classified.isFatal) throw err;
            exitCode = classified.exitCode;
          }
        }

        // Enrich handler calls with global options
        const rawOpts = program.opts<{ json?: boolean; color?: boolean }>();
        for (const call of handlerCalls) {
          call.opts = {
            json: rawOpts.json === true,
            noColor: rawOpts.color === false,
          };
        }

        return { handlerCalls: [...handlerCalls], stdout, stderr, exitCode };
      } finally {
        process.stdout.write = stdoutWrite;
        process.stderr.write = stderrWrite;
      }
    },
  };
}
