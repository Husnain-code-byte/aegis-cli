Feature: Error Formatter
  As a developer using Aegis CLI
  I want consistent error, fatal, and warning messages with styled prefixes, correct exit codes, and stderr output
  So that every command reports failures and warnings in a predictable, professional format regardless of terminal capabilities

  Background:
    Given the Color Manager provides a Theme object with semantic style functions
    And the Theme object has error, warning, bold style functions
    And the Theme object has a mode property indicating color capability

  # ============================================================
  # formatError -- String Output (4 scenarios)
  # ============================================================

  Scenario: formatError returns formatted string with correct severity prefix
    Given a Theme with full color mode
    When I call formatError(theme, "Directory not found", { severity: "error" })
    Then the returned string starts with "[ERROR]"
    And the returned string ends with "Directory not found"
    And the returned string matches the pattern "[ERROR] Directory not found"
    And no output was written to stdout or stderr
    And process.exit was not called

  Scenario: formatError produces different prefixes for each severity level
    Given a Theme with full color mode
    When I call formatError(theme, "message", { severity: "fatal" })
    Then the returned string contains "[FATAL]"
    When I call formatError(theme, "message", { severity: "error" })
    Then the returned string contains "[ERROR]"
    When I call formatError(theme, "message", { severity: "warn" })
    Then the returned string contains "[WARN]"

  Scenario: formatError styles the prefix and leaves the message body plain
    Given a Theme with full color mode
    And theme.error("text") returns a string containing ANSI escape sequences
    And theme.warning("text") returns a string containing ANSI escape sequences
    When I call formatError(theme, "file not found", { severity: "error" })
    Then the "[ERROR]" portion of the output contains ANSI escape sequences
    And the "file not found" portion of the output does NOT contain ANSI escape sequences
    When I call formatError(theme, "session missing", { severity: "warn" })
    Then the "[WARN]" portion of the output contains ANSI escape sequences
    And the "session missing" portion of the output does NOT contain ANSI escape sequences

  Scenario: formatError is a pure function with no side effects
    Given a Theme with full color mode
    And a spy on process.stderr.write is installed
    And a spy on process.exit is installed
    When I call formatError(theme, "pure function", { severity: "error" }) repeatedly with the same arguments
    Then every invocation returns the identical string
    And process.stderr.write was never called
    And process.exit was never called

  # ============================================================
  # printError -- stderr Output and Exit (3 scenarios)
  # ============================================================

  Scenario: printError writes formatted message to stderr and exits with default code
    Given a Theme with full color mode
    And a spy on process.stderr.write is installed
    And a spy on process.exit is installed
    When I call printError(theme, "Missing directory", { severity: "error" })
    Then process.stderr.write was called exactly once
    And the stderr output equals "[ERROR] Missing directory\n"
    And process.exit was called exactly once
    And process.exit was called with argument 2

  Scenario: printError exits with default exit code for each severity
    Given a Theme with full color mode
    And a spy on process.exit is installed
    When I call printError(theme, "Corrupted file", { severity: "fatal" })
    Then process.exit was called with argument 3
    When I call printError(theme, "Invalid state", { severity: "error" })
    Then process.exit was called with argument 2

  Scenario: printError with exitCode option overrides default exit code
    Given a Theme with full color mode
    And a spy on process.exit is installed
    When I call printError(theme, "Unknown command", { severity: "error", exitCode: 1 })
    Then process.exit was called with argument 1
    And process.exit was not called with argument 2

  # ============================================================
  # printWarning -- stderr Output Without Exit (1 scenario)
  # ============================================================

  Scenario: printWarning writes to stderr and does not call process.exit
    Given a Theme with full color mode
    And a spy on process.stderr.write is installed
    And a spy on process.exit is installed
    When I call printWarning(theme, "No session log found")
    Then process.stderr.write was called exactly once
    And the stderr output contains "[WARN]"
    And the stderr output contains "No session log found"
    And process.exit was never called

  # ============================================================
  # No-Color Mode (2 scenarios)
  # ============================================================

  Scenario: formatError in no-color mode produces plain text prefix without ANSI codes
    Given a Theme with mode "none"
    And theme.error("text") returns "text" unchanged
    And theme.warning("text") returns "text" unchanged
    When I call formatError(theme, "Directory not found", { severity: "error" })
    Then the returned string is "[ERROR] Directory not found"
    And the returned string does NOT contain ANSI escape sequences
    When I call formatError(theme, "Session missing", { severity: "warn" })
    Then the returned string is "[WARN] Session missing"
    And the returned string does NOT contain ANSI escape sequences

  Scenario: printError in no-color mode writes plain text to stderr and exits
    Given a Theme with mode "none"
    And a spy on process.stderr.write is installed
    And a spy on process.exit is installed
    When I call printError(theme, "Missing directory", { severity: "error" })
    Then the stderr output equals "[ERROR] Missing directory\n"
    And the stderr output does NOT contain ANSI escape sequences
    And process.exit was called with argument 2

  # ============================================================
  # Edge Cases (2 scenarios)
  # ============================================================

  Scenario: formatError with empty message string produces prefix with trailing space
    Given a Theme with full color mode
    When I call formatError(theme, "", { severity: "error" })
    Then the returned string is "[ERROR] "

  Scenario: formatError with warn severity and no exitCode option does not cause exit
    Given a Theme with full color mode
    And a spy on process.exit is installed
    When I call formatError(theme, "Something not ideal", { severity: "warn" })
    Then the returned string contains "[WARN]"
    And process.exit was never called
