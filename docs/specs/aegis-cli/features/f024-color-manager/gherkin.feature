Feature: Color Manager (Chalk Wrapper)
  As a developer using Aegis CLI
  I want the Color Manager to detect the correct color mode and provide consistent semantic color functions
  So that every Terminal UI feature renders correctly regardless of terminal capabilities or user preferences

  Background:
    Given chalk is the ANSI color rendering library
    And createTheme is the single entry point for theme creation
    And every theme is created by calling createTheme with optional ColorOptions
    And every style function accepts a single string argument and returns a string

  # ============================================================
  # Color Mode Detection (5 scenarios)
  # ============================================================

  Scenario: Full color mode when terminal supports truecolor
    Given chalk reports Level 3 (truecolor) support
    And process.stdout is connected to a TTY
    And CHALK_DISABLE is not set
    When I call createTheme() with no options
    Then the theme mode is "full"
    And applying any semantic color function to "message" returns a string containing ANSI escape sequences

  Scenario: Basic color mode when terminal supports only basic ANSI colors
    Given chalk reports Level 1 (basic 16-color) support
    And process.stdout is connected to a TTY
    And CHALK_DISABLE is not set
    When I call createTheme() with no options
    Then the theme mode is "basic"
    And applying any semantic color function to "message" returns a string containing ANSI escape sequences

  Scenario: No-color mode when --no-color flag is passed
    Given chalk reports Level 3 (truecolor) support
    And process.stdout is connected to a TTY
    And CHALK_DISABLE is not set
    When I call createTheme({ noColor: true })
    Then the theme mode is "none"
    And applying "error" to "message" returns "message" unchanged
    And applying "warning" to "message" returns "message" unchanged
    And applying "success" to "message" returns "message" unchanged
    And applying "info" to "message" returns "message" unchanged
    And applying "phase" to "message" returns "message" unchanged
    And applying "muted" to "message" returns "message" unchanged
    And applying "heading" to "message" returns "message" unchanged
    And applying "bold" to "message" returns "message" unchanged
    And applying "dim" to "message" returns "message" unchanged
    And applying "italic" to "message" returns "message" unchanged

  Scenario: No-color mode when CHALK_DISABLE environment variable is set
    Given chalk reports Level 3 (truecolor) support
    And process.stdout is connected to a TTY
    And CHALK_DISABLE is set to "1"
    When I call createTheme() with no options
    Then the theme mode is "none"
    And applying "error" to "error text" returns "error text" unchanged

  Scenario: No-color mode when stdout is not a TTY (piped or redirected)
    Given chalk reports Level 3 (truecolor) support
    And process.stdout is NOT connected to a TTY
    And CHALK_DISABLE is not set
    When I call createTheme() with no options
    Then the theme mode is "none"
    And applying "success" to "done" returns "done" unchanged

  # ============================================================
  # JSON Mode (1 scenario)
  # ============================================================

  Scenario: JSON mode implies no-color regardless of terminal capability
    Given chalk reports Level 3 (truecolor) support
    And process.stdout is connected to a TTY
    And CHALK_DISABLE is not set
    When I call createTheme({ json: true })
    Then the theme mode is "none"
    And applying "info" to "info message" returns "info message" unchanged

  # ============================================================
  # Semantic Colors and Text Styles (3 scenarios)
  # ============================================================

  Scenario: All seven semantic colors produce colored output in full mode
    Given chalk reports Level 3 (truecolor) support
    And process.stdout is connected to a TTY
    When I call createTheme() with no options
    Then theme.error("text") produces output containing ANSI escape sequences
    And theme.warning("text") produces output containing ANSI escape sequences
    And theme.success("text") produces output containing ANSI escape sequences
    And theme.info("text") produces output containing ANSI escape sequences
    And theme.phase("text") produces output containing ANSI escape sequences
    And theme.muted("text") produces output containing ANSI escape sequences
    And theme.heading("text") produces output containing ANSI escape sequences

  Scenario: Bold, dim, and italic text styles produce styled output in full mode
    Given chalk reports Level 3 (truecolor) support
    And process.stdout is connected to a TTY
    When I call createTheme() with no options
    Then theme.bold("bold text") produces output containing ANSI escape sequences
    And theme.dim("dim text") produces output containing ANSI escape sequences
    And theme.italic("italic text") produces output containing ANSI escape sequences

  Scenario: All styles return input unchanged in no-color mode
    Given chalk reports Level 3 (truecolor) support
    And process.stdout is connected to a TTY
    When I call createTheme({ noColor: true })
    Then theme.error("x") returns "x" unchanged
    And theme.warning("x") returns "x" unchanged
    And theme.success("x") returns "x" unchanged
    And theme.info("x") returns "x" unchanged
    And theme.phase("x") returns "x" unchanged
    And theme.muted("x") returns "x" unchanged
    And theme.heading("x") returns "x" unchanged
    And theme.bold("x") returns "x" unchanged
    And theme.dim("x") returns "x" unchanged
    And theme.italic("x") returns "x" unchanged

  # ============================================================
  # Mode Detection Priority Chain (3 scenarios)
  # ============================================================

  Scenario: --no-color flag overrides CHALK_DISABLE env var
    Given chalk reports Level 3 (truecolor) support
    And process.stdout is connected to a TTY
    And CHALK_DISABLE is set to "1"
    When I call createTheme({ noColor: true })
    Then the theme mode is "none"
    And theme.error("error") returns "error" unchanged
    # Priority: --no-color flag > CHALK_DISABLE env var > isTTY > chalk Level

  Scenario: CHALK_DISABLE env var overrides terminal capability and TTY
    Given chalk reports Level 3 (truecolor) support
    And process.stdout is connected to a TTY
    And CHALK_DISABLE is set to "true"
    When I call createTheme() with no options
    Then the theme mode is "none"
    And theme.warning("warn") returns "warn" unchanged
    # Priority: CHALK_DISABLE env var > isTTY > chalk Level

  Scenario: Non-TTY stdout overrides chalk level when no env var is set
    Given chalk reports Level 3 (truecolor) support
    And process.stdout is NOT connected to a TTY
    And CHALK_DISABLE is not set
    When I call createTheme() with no options
    Then the theme mode is "none"
    And theme.success("done") returns "done" unchanged
    # Priority: isTTY=false > chalk Level

  # ============================================================
  # Edge Cases (3 scenarios)
  # ============================================================

  Scenario: Theme object is immutable after creation
    Given chalk reports Level 3 (truecolor) support
    And process.stdout is connected to a TTY
    When I call createTheme() with no options
    Then the theme is frozen via Object.isFrozen
    And adding a new property to the theme is silently rejected
    And modifying an existing function on the theme is silently rejected
    And deleting an existing property from the theme is silently rejected
    And the theme mode property silently rejects overwriting (no throw, frozen)

  Scenario: Unknown or intermediate chalk level falls back to basic color mode
    Given chalk reports Level 2 (256-color) support
    And process.stdout is connected to a TTY
    And CHALK_DISABLE is not set
    When I call createTheme() with no options
    Then the theme mode is "basic"
    And applying "success" to "done" returns a string containing ANSI escape sequences
    # Level 2 (256-color) not equal to Level 3 (truecolor) so falls to "basic" safe fallback

  Scenario: NO_COLOR env var disables color via chalk internal handling
    Given NO_COLOR is set to "1"
    And CHALK_DISABLE is not set
    And chalk reports Level 0 (disabled) because chalk processes NO_COLOR internally
    And process.stdout is connected to a TTY
    When I call createTheme() with no options
    Then the theme mode is "none"
    And theme.info("data") returns "data" unchanged

  Scenario: Color mode is logged once on theme creation
    Given chalk reports Level 3 (truecolor) support
    And process.stdout is connected to a TTY
    And a logger spy is installed
    When I call createTheme() with no options
    Then the logger is called exactly once
    And the logger receives the message "[INFO] Color mode: full"
