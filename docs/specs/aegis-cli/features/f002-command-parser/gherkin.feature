Feature: CLI Entry Point (Command Parser, Help, Version, Flags, Error Handling)
  As a developer using Aegis CLI
  I want the CLI to parse my commands, route them to handlers, display help, handle flags, and report errors
  So that every `aegis <command>` invocation works correctly with helpful feedback

  Background:
    Given the CLI router is configured with 8 registered commands:
      | command   | handler         |
      | start     | start-handler   |
      | phase     | phase-handler   |
      | prompt    | prompt-handler  |
      | agent     | agent-handler   |
      | status    | status-handler  |
      | config    | config-handler  |
      | workflow  | workflow-handler|
      | help      | help-handler    |
    And the router invokes handlers with an options object containing parsed flags and arguments
    And stub handlers are registered for all commands to capture their invocation

  # ============================================================
  # Happy Path: Command Routing (8 scenarios)
  # ============================================================

  Scenario: Route "start" command
    When I execute "aegis start"
    Then the start-handler is invoked exactly once
    And no other handler is invoked

  Scenario: Route "phase" command
    When I execute "aegis phase"
    Then the phase-handler is invoked exactly once
    And no other handler is invoked

  Scenario: Route "prompt" command
    When I execute "aegis prompt"
    Then the prompt-handler is invoked exactly once
    And no other handler is invoked

  Scenario: Route "agent" command with agent name argument
    When I execute "aegis agent decomposition-guide"
    Then the agent-handler is invoked exactly once
    And the handler receives argument "name" with value "decomposition-guide"
    And no other handler is invoked

  Scenario: Route "agent" command without arguments
    When I execute "aegis agent"
    Then the agent-handler is invoked exactly once
    And the handler receives no value for argument "name"
    And no other handler is invoked

  Scenario: Route "status" command
    When I execute "aegis status"
    Then the status-handler is invoked exactly once
    And no other handler is invoked

  Scenario: Route "config" command with "key" subcommand
    When I execute "aegis config key"
    Then the config-handler is invoked exactly once
    And the handler receives subcommand "key"
    And no other handler is invoked

  Scenario: Route "workflow" command (placeholder)
    When I execute "aegis workflow"
    Then the workflow-handler is invoked exactly once
    And no other handler is invoked

  # ============================================================
  # Happy Path: Version and Help (3 scenarios)
  # ============================================================

  Scenario: Display version string
    When I execute "aegis --version"
    Then the command outputs "aegis-cli v0.1.0" to stdout
    And the exit code is 0

  Scenario: Display help with all commands listed
    When I execute "aegis --help"
    Then the output to stdout contains "start"
    And the output to stdout contains "phase"
    And the output to stdout contains "prompt"
    And the output to stdout contains "agent"
    And the output to stdout contains "status"
    And the output to stdout contains "config"
    And the output to stdout contains "workflow"
    And the exit code is 0

  Scenario: Display help when no command is provided
    When I execute "aegis" with no arguments
    Then the output to stdout contains all 8 registered command names
    And the exit code is 0

  # ============================================================
  # Happy Path: Global Flags (4 scenarios)
  # ============================================================

  Scenario: Parse --json flag with command
    When I execute "aegis start --json"
    Then the start-handler is invoked exactly once
    And the handler receives option "json" with value true

  Scenario: Parse --no-color flag with command
    When I execute "aegis status --no-color"
    Then the status-handler is invoked exactly once
    And the handler receives option "noColor" with value true

  Scenario: Global flag before command routes correctly
    When I execute "aegis --json status"
    Then the status-handler is invoked exactly once
    And the handler receives option "json" with value true

  Scenario: Combined global flags both parsed
    When I execute "aegis --no-color --json phase"
    Then the phase-handler is invoked exactly once
    And the handler receives option "noColor" with value true
    And the handler receives option "json" with value true

  # ============================================================
  # Error Path (2 scenarios)
  # ============================================================

  Scenario: Unknown command displays suggestion and exits with code 1
    When I execute "aegis starrt"
    Then the output to stderr contains "[ERROR]"
    And the output to stderr contains "Unknown command"
    And the output to stderr contains "Did you mean"
    And no handler is invoked
    And the exit code is 1

  Scenario: Unknown command outputs error to stderr only
    When I execute "aegis xyzzy"
    Then the output to stderr is not empty
    And the output to stdout is empty
    And the exit code is 1

  # ============================================================
  # Edge Cases (5 scenarios)
  # ============================================================

  Scenario: Case-sensitive command matching rejects uppercase
    When I execute "aegis START"
    Then the output to stderr contains "[ERROR]"
    And the start-handler is not invoked
    And the exit code is 1

  Scenario: Extra whitespace between command tokens
    When I execute "aegis   status"
    Then the status-handler is invoked exactly once
    And no other handler is invoked

  Scenario: Config command without subcommand shows subcommand help
    When I execute "aegis config"
    Then the output to stdout contains the subcommand name "key"
    And the exit code is 0

  Scenario: Command-specific help with --help flag
    When I execute "aegis agent --help"
    Then the output to stdout contains "agent"
    And the output to stdout contains "Usage"
    And the agent-handler is not invoked
    And the exit code is 0

  Scenario: --help flag before command shows global help
    When I execute "aegis --help start"
    Then the output to stdout contains all 8 registered command names
    And the start-handler is not invoked
    And the exit code is 0

  # ============================================================
  # Additional Scenarios from Spec Review (5 scenarios)
  # ============================================================

  Scenario: Display version with short flag -V
    When I execute "aegis -V"
    Then the command outputs "aegis-cli v0.1.0" to stdout
    And the exit code is 0

  Scenario: Display help with short flag -h
    When I execute "aegis -h"
    Then the output to stdout contains all 8 registered command names
    And the exit code is 0

  Scenario: Explicit "help" command shows global help
    When I execute "aegis help"
    Then the output to stdout contains all 8 registered command names
    And the exit code is 0

  Scenario: Route "agent" command with numeric agent ID
    When I execute "aegis agent 00"
    Then the agent-handler is invoked exactly once
    And the handler receives argument "name" with value "00"
    And no other handler is invoked

  Scenario: Unknown flag with valid command does not crash
    When I execute "aegis start --unknown-flag"
    Then the start-handler is invoked exactly once
    And no error is written to stderr
    And the exit code is 0

  # ============================================================
  # Resolved Open Question Behaviors (3 scenarios)
  # ============================================================

  Scenario: Unknown command with no close match omits suggestion clause
    When I execute "aegis zzzzz"
    Then the output to stderr contains "[ERROR]"
    And the output to stderr contains "Unknown command 'zzzzz'"
    And the output to stderr does not contain "Did you mean"
    And no handler is invoked
    And the exit code is 1

  Scenario: Workflow command shows coming-soon stub output
    When I execute "aegis workflow"
    Then the workflow-handler is invoked exactly once
    And the output to stdout contains "not yet implemented"

  Scenario: Workflow listed as coming soon in help output
    When I execute "aegis --help"
    Then the output to stdout contains "workflow"
    And the output to stdout contains "(coming soon)"
