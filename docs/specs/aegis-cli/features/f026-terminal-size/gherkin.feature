Feature: Terminal Size Detection
  As a developer building Aegis CLI terminal UI features
  I want the terminal dimensions to be detected automatically with caching and fallback support
  So that responsive layout decisions are based on accurate, up-to-date terminal size information

  Background:
    Given getSize is the single entry point for terminal size detection
    And getSize reads process.stdout.columns and process.stdout.rows as the primary source
    And getSize reads process.stderr.columns and process.stderr.rows as the fallback source
    And the result is a TerminalSize object with columns, rows, and isTTY fields
    And isNarrow and isWarnNarrow are pure functions accepting a TerminalSize object

  # ============================================================
  # TTY Detection (3 scenarios)
  # ============================================================

  Scenario: Returns stdout dimensions when stdout is a TTY
    Given process.stdout.columns is 120
    And process.stdout.rows is 30
    And process.stdout.isTTY is true
    When I call getSize()
    Then the result.columns is 120
    And the result.rows is 30
    And the result.isTTY is true

  Scenario: Falls back to stderr when stdout is not a TTY
    Given process.stdout.columns is undefined
    And process.stdout.isTTY is false
    And process.stderr.columns is 80
    And process.stderr.rows is 25
    And process.stderr.isTTY is true
    When I call getSize()
    Then the result.columns is 80
    And the result.rows is 25
    And the result.isTTY is true

  Scenario: Returns default dimensions when neither stdout nor stderr is a TTY
    Given process.stdout.columns is undefined
    And process.stdout.isTTY is false
    And process.stderr.columns is undefined
    And process.stderr.isTTY is false
    When I call getSize()
    Then the result.columns is 80
    And the result.rows is 24
    And the result.isTTY is false

  # ============================================================
  # Cache Behavior (3 scenarios)
  # ============================================================

  Scenario: Returns cached result within debounce window
    Given the system clock starts at time 0
    And process.stdout.columns is 120
    And process.stdout.rows is 30
    And process.stdout.isTTY is true
    When I call getSize()
    And I immediately call getSize() again after advancing the clock by 50ms
    Then both calls return the same object (reference equality)
    And the result.columns is 120

  Scenario: Refreshes result after debounce window expires
    Given the system clock starts at time 0
    And process.stdout.columns is 120
    And process.stdout.rows is 30
    And process.stdout.isTTY is true
    When I call getSize()
    And I advance the clock by 150ms
    And process.stdout.columns is now 100 due to a terminal resize
    And I call getSize() again
    Then the result.columns is 100 (the new value, not the cached 120)
    And the result.rows is 30

  Scenario: Force refresh bypasses cache regardless of debounce window
    Given the system clock starts at time 0
    And process.stdout.columns is 120
    And process.stdout.rows is 30
    And process.stdout.isTTY is true
    When I call getSize() to populate the cache
    And I advance the clock by 10ms
    And process.stdout.columns is now 100 due to a terminal resize
    And I call getSize({ refresh: true })
    Then the result.columns is 100 (the new value, not the cached 120)
    And the result.isTTY is true

  # ============================================================
  # Narrow Detection (4 scenarios)
  # ============================================================

  Scenario: isNarrow returns true when columns is less than 60
    Given a TerminalSize with columns 59 and rows 24
    When I call isNarrow(size)
    Then the result is true

  Scenario: isNarrow returns false when columns is exactly 60
    Given a TerminalSize with columns 60 and rows 24
    When I call isNarrow(size)
    Then the result is false

  Scenario: isWarnNarrow returns true when columns is less than 50
    Given a TerminalSize with columns 49 and rows 24
    When I call isWarnNarrow(size)
    Then the result is true

  Scenario: isWarnNarrow returns false when columns is exactly 50
    Given a TerminalSize with columns 50 and rows 24
    When I call isWarnNarrow(size)
    Then the result is false

  # ============================================================
  # Edge Cases (2 scenarios)
  # ============================================================

  Scenario: Undefined or zero columns on stdout falls through fallback chain
    Given process.stdout.columns is 0
    And process.stdout.rows is 0
    And process.stdout.isTTY is false
    And process.stderr.columns is undefined
    And process.stderr.isTTY is false
    When I call getSize()
    Then the result.columns is 80
    And the result.rows is 24
    And the result.isTTY is false
    # Zero or undefined on both streams produces the default fallback

  Scenario: Mixed stdout TTY with zero columns falls back to stderr
    Given process.stdout.columns is 0
    And process.stdout.rows is 0
    And process.stdout.isTTY is true
    And process.stderr.columns is 100
    And process.stderr.rows is 40
    And process.stderr.isTTY is true
    When I call getSize()
    Then the result.columns is 100
    And the result.rows is 40
    And the result.isTTY is true
    # Even though stdout.isTTY is true, columns being 0 triggers fallback
