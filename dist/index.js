#!/usr/bin/env node

// src/cli/command-parser.ts
import { Command } from "commander";

// src/shared/constants.ts
var VERSION = "aegis-cli v0.1.0";
var COMMAND_NAMES = [
  "start",
  "phase",
  "prompt",
  "agent",
  "status",
  "config",
  "workflow",
  "help"
];
var EXIT_SENTINEL = "__AEGIS_EXIT_1__";
var EXIT_OK_CODES = ["commander.helpDisplayed", "commander.version"];
var EXIT_ERR_CODES = [
  "commander.error",
  "commander.unknownCommand",
  "commander.help",
  EXIT_SENTINEL
];

// src/shared/errors.ts
import levenshteinPkg from "fast-levenshtein";
var levenshteinDistance = levenshteinPkg.get;
var UnknownCommandError = class extends Error {
  input;
  suggestions;
  constructor(input, suggestions) {
    const hasSuggestions = suggestions.length > 0;
    const suggestionClause = hasSuggestions ? `. Did you mean '${suggestions.join("', '")}'?` : ".";
    super(`[ERROR] Unknown command '${input}'${suggestionClause}`);
    this.name = "UnknownCommandError";
    this.input = input;
    this.suggestions = suggestions;
  }
};
function findSuggestions(input, candidates, maxDistance = 3, maxSuggestions = 3) {
  return candidates.map((candidate) => ({
    name: candidate,
    distance: levenshteinDistance(input, candidate)
  })).filter((r) => r.distance <= maxDistance).sort((a, b) => a.distance - b.distance).slice(0, maxSuggestions).map((r) => r.name);
}
function classifyCommanderError(err) {
  if (err === null || err === void 0 || typeof err !== "object") {
    return { exitCode: 1, isFatal: false };
  }
  const ce = err;
  if (EXIT_OK_CODES.includes(ce.code)) {
    return { exitCode: ce.exitCode ?? 0, isFatal: false };
  }
  if (EXIT_ERR_CODES.includes(ce.code) || ce.message === EXIT_SENTINEL) {
    return { exitCode: ce.exitCode ?? 1, isFatal: false };
  }
  return { exitCode: ce.exitCode ?? 1, isFatal: true };
}

// src/cli/command-parser.ts
function registerCommand(program, nameAndArgs, description, action) {
  program.command(nameAndArgs).description(description).allowUnknownOption(true).allowExcessArguments(true).action((...args) => action(...args));
}
function createProgram() {
  const handlerCalls = [];
  function recordCall(handler, args = {}) {
    handlerCalls.push({ handler, args, opts: {} });
  }
  const program = new Command();
  program.name("aegis").description("ANSDLC 2.0 workflow guide \u2014 your command center for AI-assisted development").version(VERSION, "-V, --version", "Output the version string").helpOption("-h, --help", "Display help for commands").option("--no-color", "Disable terminal colors").option("--json", "Output in JSON format").allowUnknownOption(true).exitOverride();
  registerCommand(program, "start", "Full dashboard with phase, status, and prompt", () => recordCall("start"));
  registerCommand(program, "phase", "Show current ANSDLC phase info", () => recordCall("phase"));
  registerCommand(program, "prompt", "Generate a prompt for Claude Code", () => recordCall("prompt"));
  registerCommand(program, "status", "Workspace summary", () => recordCall("status"));
  program.command("agent [name]").description("Agent details or directory listing").allowUnknownOption(true).action((name) => recordCall("agent", { name }));
  const configCmd = program.command("config").description("API key and configuration management").allowUnknownOption(true).allowExcessArguments(true).exitOverride().action(() => configCmd.outputHelp());
  configCmd.command("key").description("Manage DeepSeek API key").allowUnknownOption(true).allowExcessArguments(true).exitOverride().action(() => recordCall("config", { subcommand: "key" }));
  program.command("workflow").description("Workflow operations (coming soon)").allowUnknownOption(true).allowExcessArguments(true).action(() => {
    recordCall("workflow");
    process.stdout.write("Workflow management is not yet implemented.\n");
  });
  program.command("help [command]").description("Show help for all commands, or help for a specific command").allowUnknownOption(true).allowExcessArguments(true).action((cmd) => {
    const target = cmd ? program.commands.find((c) => c.name() === cmd) : null;
    (target || program).outputHelp();
  });
  program.on("command:*", (unknownArgs) => {
    const input = unknownArgs[0];
    const suggestions = findSuggestions(input, COMMAND_NAMES);
    process.stderr.write(`${new UnknownCommandError(input, suggestions).message}
`);
    const exitErr = new Error(EXIT_SENTINEL);
    exitErr.code = EXIT_SENTINEL;
    exitErr.exitCode = 1;
    throw exitErr;
  });
  return {
    program,
    parseAndCapture(argv) {
      let stdout = "";
      let stderr = "";
      let exitCode = 0;
      const stdoutWrite = process.stdout.write.bind(process.stdout);
      const stderrWrite = process.stderr.write.bind(process.stderr);
      process.stdout.write = ((chunk) => {
        stdout += typeof chunk === "string" ? chunk : new TextDecoder().decode(chunk);
        return true;
      });
      process.stderr.write = ((chunk) => {
        stderr += typeof chunk === "string" ? chunk : new TextDecoder().decode(chunk);
        return true;
      });
      try {
        handlerCalls.length = 0;
        if (argv.length === 0) {
          program.outputHelp();
        } else {
          try {
            program.parse(argv, { from: "user" });
          } catch (err) {
            const classified = classifyCommanderError(err);
            if (classified.isFatal) throw err;
            exitCode = classified.exitCode;
          }
        }
        const rawOpts = program.opts();
        for (const call of handlerCalls) {
          call.opts = {
            json: rawOpts.json === true,
            noColor: rawOpts.color === false
          };
        }
        return { handlerCalls: [...handlerCalls], stdout, stderr, exitCode };
      } finally {
        process.stdout.write = stdoutWrite;
        process.stderr.write = stderrWrite;
      }
    }
  };
}

// src/cli/index.ts
async function main(argv = process.argv) {
  const { program } = createProgram();
  try {
    await program.parseAsync(argv);
  } catch (err) {
    const classified = classifyCommanderError(err);
    if (classified.isFatal) {
      console.error(
        "Aegis CLI encountered an unexpected error:",
        err instanceof Error ? err.message : String(err)
      );
    }
    process.exit(classified.exitCode);
  }
}

// src/index.ts
main().catch((err) => {
  console.error("Aegis CLI encountered an unexpected error:", err instanceof Error ? err.message : String(err));
  process.exit(1);
});
//# sourceMappingURL=index.js.map