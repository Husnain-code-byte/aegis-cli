import type { CommandName } from './types.js';

/** Package version, read from package.json at build time. */
export const VERSION = 'aegis-cli v0.1.0';

/** All 8 registered command names. */
export const COMMAND_NAMES: CommandName[] = [
  'start',
  'phase',
  'prompt',
  'agent',
  'status',
  'config',
  'workflow',
  'help',
];

/** Sentinel thrown by command:* handler to signal exit code 1. */
export const EXIT_SENTINEL = '__AEGIS_EXIT_1__';

/** Commander error codes that indicate a successful operation (exit 0). */
export const EXIT_OK_CODES = ['commander.helpDisplayed', 'commander.version'] as const;

/** Commander error codes that indicate a handled error (exit 1). */
export const EXIT_ERR_CODES = [
  'commander.error',
  'commander.unknownCommand',
  'commander.help',
  EXIT_SENTINEL,
] as const;

/** Command descriptions shown in help output. */
export const COMMAND_DESCRIPTIONS: Record<CommandName, string> = {
  start: 'Full dashboard with phase, status, and prompt',
  phase: 'Show current ANSDLC phase info',
  prompt: 'Generate a prompt for Claude Code',
  agent: 'Agent details or directory listing',
  status: 'Workspace summary',
  config: 'API key and configuration management',
  workflow: 'Workflow operations (coming soon)',
  help: 'Show help for all commands',
};
