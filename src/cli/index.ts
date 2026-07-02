import { createProgram } from './command-parser.js';
import { classifyCommanderError } from '../shared/errors.js';

export async function main(argv: string[] = process.argv): Promise<void> {
  const { program } = createProgram();
  try {
    await program.parseAsync(argv);
  } catch (err: unknown) {
    const classified = classifyCommanderError(err);
    if (classified.isFatal) {
      console.error(
        'Aegis CLI encountered an unexpected error:',
        err instanceof Error ? err.message : String(err),
      );
    }
    process.exit(classified.exitCode);
  }
}
