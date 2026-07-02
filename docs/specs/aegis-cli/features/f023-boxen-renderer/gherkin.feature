Feature: Boxen Renderer (Bordered Containers)
  As a developer using Aegis CLI
  I want the Boxen Renderer to wrap content in bordered containers that adapt to the current color mode
  So that every Terminal UI feature renders visually structured, mode-appropriate bordered output

  Background:
    Given createBox is the single entry point for creating a BoxRenderer
    And createBox accepts a Theme object from the Color Manager
    And the Theme object provides:
      | property   | type                                      |
      | mode       | "full" | "basic" | "none"               |
      | error      | (s: string) => string                     |
      | warning    | (s: string) => string                     |
      | success    | (s: string) => string                     |
      | info       | (s: string) => string                     |
      | phase      | (s: string) => string                     |
      | muted      | (s: string) => string                     |
      | heading    | (s: string) => string                     |
      | bold       | (s: string) => string                     |
      | dim        | (s: string) => string                     |
      | italic     | (s: string) => string                     |
    And every style function returns the input wrapped in ANSI escape sequences when mode is "full"
    And every style function returns the input unchanged when mode is "none"

  # ============================================================
  # Happy Path: Default Render (1 scenario)
  # ============================================================

  Scenario: Default render uses single border, padding 1, muted border color
    Given a Theme with mode "full"
    And all theme color functions are configured to wrap text in ANSI escape sequences
    When I call render with content "Ready" and no options
    Then the output starts with the character "┌"
    And the output ends with the character "┘"
    And the output contains "│ Ready │"
    And the output contains ANSI escape sequences

  # ============================================================
  # Happy Path: Custom Border Styles (4 scenarios)
  # ============================================================

  Scenario: Custom border style "double" produces double-line box
    Given a Theme with mode "full"
    When I call render with content "Ready" and options:
      | borderStyle | double |
    Then the output starts with the character "╔"
    And the output ends with the character "╝"
    And the output contains "║ Ready ║"

  Scenario: Custom border style "round" produces rounded-corner box
    Given a Theme with mode "full"
    When I call render with content "Ready" and options:
      | borderStyle | round |
    Then the output starts with the character "╭"
    And the output ends with the character "╯"
    And the output contains "│ Ready │"

  Scenario: Custom border style "bold" produces heavy-line box
    Given a Theme with mode "full"
    When I call render with content "Ready" and options:
      | borderStyle | bold |
    Then the output starts with the character "┏"
    And the output ends with the character "┛"
    And the output contains "┃ Ready ┃"

  Scenario: borderStyle "none" produces content with no border characters
    Given a Theme with mode "full"
    When I call render with content "Ready" and options:
      | borderStyle | none |
    Then the output does not contain "┌"
    And the output does not contain "┐"
    And the output does not contain "└"
    And the output does not contain "┘"
    And the output contains "Ready" with at least one space of padding on each side

  # ============================================================
  # Happy Path: Section and Prompt (2 scenarios)
  # ============================================================

  Scenario: renderSection renders a box with title centered in the top border
    Given a Theme with mode "full"
    When I call renderSection with title "Status" and content "All systems operational"
    Then the output starts with the character "┌"
    And the output ends with the character "┘"
    And the output contains "Status" in the top border line
    And the output contains "│ All systems operational │"

  Scenario: renderPrompt produces a pre-styled double-bordered box
    Given a Theme with mode "full"
    When I call renderPrompt with content "aegis prompt --agent 05"
    Then the output starts with the character "╔"
    And the output ends with the character "╝"
    And the output contains "aegis prompt --agent 05"
    And the output contains ANSI escape sequences

  # ============================================================
  # Color Mode Behavior (2 scenarios)
  # ============================================================

  Scenario: No-color mode uses ASCII borders and no ANSI escape sequences
    Given a Theme with mode "none"
    And all theme color functions are identity functions (return input unchanged)
    When I call render with content "Ready"
    Then the output starts with the character "+"
    And the output ends with the character "+"
    And the output contains "| Ready |"
    And the output does not contain ANSI escape sequences

  Scenario: Basic mode uses box-drawing characters without ANSI color on borders
    Given a Theme with mode "basic"
    And all theme color functions return the input unchanged (no ANSI)
    When I call render with content "Ready"
    Then the output starts with the character "┌"
    And the output ends with the character "┘"
    And the output contains "│ Ready │"
    And the top border line of the output does not contain ANSI escape sequences

  # ============================================================
  # Multi-line and Padding (2 scenarios)
  # ============================================================

  Scenario: Multi-line content preserves line breaks with consistent padding
    Given a Theme with mode "full"
    When I call render with content "line one\nline two\nline three"
    Then the output contains exactly 3 content lines between the top and bottom borders
    And each content line starts with "│ " followed by the corresponding input line text
    And each content line ends with " │"

  Scenario: Custom padding value increases spacing around content
    Given a Theme with mode "full"
    When I call render with content "Hello" and options:
      | padding | 3 |
    Then the output contains "│   Hello   │"
    And there are at least 2 blank padded lines between the top border and the content line
    And there are at least 2 blank padded lines between the content line and the bottom border

  # ============================================================
  # Edge Cases (3 scenarios)
  # ============================================================

  Scenario: Empty content renders as a valid minimal box structure
    Given a Theme with mode "full"
    When I call render with content ""
    Then the output starts with the character "┌"
    And the output ends with the character "┘"
    And the output contains exactly one content line between top and bottom borders
    And that content line is "│ │" (two vertical bars with padding between them)

  Scenario: Unicode and emoji content renders without breaking the box
    Given a Theme with mode "full"
    When I call render with content "Hello 世界 🎉"
    Then the output contains "Hello 世界 🎉"
    And the output starts with the character "┌"
    And the output ends with the character "┘"
    And the box structure is not broken (no misaligned border characters)

  Scenario: All six borderColor values produce different output in full mode
    Given a Theme with mode "full"
    And each theme color function wraps text in a distinct ANSI escape sequence
    When I call render with content "Hello" and borderColor "error"
    Then the output contains ANSI escape sequences
    When I call render with content "Hello" and borderColor "success"
    Then the output contains ANSI escape sequences different from the error-coded output
    When I call render with content "Hello" and borderColor "warning"
    Then the output contains ANSI escape sequences
    When I call render with content "Hello" and borderColor "phase"
    Then the output contains ANSI escape sequences
    When I call render with content "Hello" and borderColor "info"
    Then the output contains ANSI escape sequences
    When I call render with content "Hello" and borderColor "muted"
    Then the output contains ANSI escape sequences
