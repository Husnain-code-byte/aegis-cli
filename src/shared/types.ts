/** CLI command names — all 8 registered commands. */
export type CommandName =
  | 'start'
  | 'phase'
  | 'prompt'
  | 'agent'
  | 'status'
  | 'config'
  | 'workflow'
  | 'help';

/** Global flags parsed from argv. */
export interface GlobalFlags {
  json: boolean;
  noColor: boolean;
}

/** Context passed to command handlers. */
export interface CommandContext {
  /** Parsed global flag values. */
  opts: GlobalFlags;
  /** Named/positional arguments for the command. */
  args: Record<string, string | undefined>;
}

/** A recorded handler invocation captured during testing. */
export interface HandlerCall {
  handler: string;
  args: Record<string, unknown>;
  opts: Record<string, unknown>;
}

/** The parsed result of a CLI invocation. */
export interface ProgramResult {
  handlerCalls: HandlerCall[];
  stdout: string;
  stderr: string;
  exitCode: number;
}

/** Result of ANSDLC workspace detection. */
export interface WorkspaceDetection {
  valid: boolean;
  root?: string;
  missing?: string[];
  notAnAnsdlc?: boolean;
  error?: string;
}
