Feature: Workspace Detection
  As a developer using Aegis CLI
  I want the CLI to detect whether the current directory is part of an ANSDLC 2.0 workspace and locate its root
  So that workspace validation is reliable and downstream features (agent scanner, git reader, project memory scanner) can operate from the correct project root

  Background:
    Given the filesystem contains a temporary workspace root at "/workspace"
    And a subdirectory "/workspace/src/cli/utils" exists
    And a directory "/workspace/.claude" exists
    And a directory "/workspace/project-memory" exists
    And detectWorkspace and validateWorkspace are imported from the workspace detection module

  # ============================================================
  # Happy Path (3 scenarios)
  # ============================================================

  Scenario: Detect valid workspace from project root
    When I call detectWorkspace("/workspace")
    Then the result has valid === true
    And the result root equals "/workspace"
    And the result has no missing directories
    And the result has no missing field
    And the result has no error field

  Scenario: Detect valid workspace from subdirectory via upward walk
    When I call detectWorkspace("/workspace/src/cli/utils")
    Then the result is "{ valid: true }"
    And the result root equals "/workspace"
    And the result has no missing field

  Scenario: validateWorkspace succeeds for valid workspace
    When I call validateWorkspace("/workspace")
    Then no error is thrown

  # ============================================================
  # Error Path (5 scenarios)
  # ============================================================

  Scenario: Detect workspace missing only .claude/ directory
    Given directory "/workspace/.claude" does not exist
    And directory "/workspace/project-memory" exists
    When I call detectWorkspace("/workspace")
    Then the result is "{ valid: false }"
    And the result missing equals [".claude/"]
    And the result root equals "/workspace"
    And the result notAnAnsdlc is not set

  Scenario: Detect workspace missing only project-memory/ directory
    Given directory "/workspace/.claude" exists
    And directory "/workspace/project-memory" does not exist
    When I call detectWorkspace("/workspace")
    Then the result is "{ valid: false }"
    And the result missing equals ["project-memory/"]
    And the result root equals "/workspace"
    And the result notAnAnsdlc is not set

  Scenario: Detect workspace missing both directories (notAnAnsdlc)
    Given directory "/workspace/.claude" does not exist
    And directory "/workspace/project-memory" does not exist
    When I call detectWorkspace("/workspace")
    Then the result is "{ valid: false }"
    And the result missing equals ["both"]
    And the result notAnAnsdlc is true
    And the result has no root field

  Scenario: validateWorkspace throws WorkspaceError for missing directories
    Given directory "/workspace/.claude" does not exist
    And directory "/workspace/project-memory" exists
    When I call validateWorkspace("/workspace")
    Then a WorkspaceError is thrown
    And the error message contains "Missing"
    And the error exitCode is 2

  Scenario: validateWorkspace throws WorkspaceError for notAnAnsdlc
    Given directory "/workspace/.claude" does not exist
    And directory "/workspace/project-memory" does not exist
    When I call validateWorkspace("/workspace")
    Then a WorkspaceError is thrown
    And the error message contains "Not an ANSDLC 2.0 workspace"
    And the error exitCode is 2

  # ============================================================
  # Edge Cases (8 scenarios)
  # ============================================================

  Scenario: CWD fallback uses process.cwd() when cwd is null
    Given process.cwd() returns "/workspace"
    When I call detectWorkspace(null)
    Then the detectWorkspace function uses process.cwd() as the starting directory
    And the result is "{ valid: true }"
    And the result root equals "/workspace"

  Scenario: CWD fallback uses process.cwd() when cwd is undefined
    Given process.cwd() returns "/workspace"
    When I call detectWorkspace(undefined)
    Then the detectWorkspace function uses process.cwd() as the starting directory

  Scenario: CWD fallback uses process.cwd() when cwd is empty string
    Given process.cwd() returns "/workspace"
    When I call detectWorkspace("")
    Then the detectWorkspace function uses process.cwd() as the starting directory

  Scenario: Filesystem root boundary stops upward walk
    Given no ".claude" directory exists at any level above "/"
    And no "project-memory" directory exists at any level above "/"
    When I call detectWorkspace("/tmp/some/deep/path")
    Then the walk stops at the filesystem root "/"
    And the result is "{ valid: false }"
    And the result notAnAnsdlc is true

  Scenario: Symlink to valid workspace resolves to real path
    Given a symlink at "/symlink-workspace" pointing to "/workspace"
    And directory "/workspace/.claude" exists
    And directory "/workspace/project-memory" exists
    When I call detectWorkspace("/symlink-workspace")
    Then the result is "{ valid: true }"
    And the result root equals "/workspace"
    And the result root does not equal "/symlink-workspace"

  Scenario: Symlink cycle returns error instead of infinite loop
    Given a symlink at "/cycle-a" pointing to "/cycle-b"
    And a symlink at "/cycle-b" pointing to "/cycle-a"
    When I call detectWorkspace("/cycle-a")
    Then the result is "{ valid: false }"
    And the result error contains "symlink cycle" or "max depth"
    And the result has no root field

  Scenario: Permission denied on intermediate directory returns error
    Given directory "/workspace" has no read permission (EACCES)
    And directory "/workspace/.claude" exists but is inaccessible
    When I call detectWorkspace("/workspace")
    Then the result is "{ valid: false }"
    And the result error contains "EACCES"
    And the result has no root field

  Scenario: Non-existent starting path returns error
    When I call detectWorkspace("/nonexistent/path")
    Then the result is "{ valid: false }"
    And the result error contains "ENOENT" or "no such file or directory"
    And the result has no root field
