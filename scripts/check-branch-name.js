#!/usr/bin/env node
// Validates branch names against the project's `tag/issue-id-slug` convention.
// Used by the CI commit-lint job.

const TAGS = [
  "init",
  "feat",
  "fix",
  "chore",
  "docs",
  "refactor",
  "test",
  "style",
  "perf",
  "ci",
  "build",
  "revert",
];

const PATTERN = new RegExp(`^(${TAGS.join("|")})/\\d+-[a-z0-9-]+$`, "i");

function main() {
  const branch = process.argv[2];
  if (!branch) {
    console.error("Usage: check-branch-name.js <branch-name>");
    process.exit(1);
  }

  if (!PATTERN.test(branch)) {
    console.error(
      `Invalid branch name: "${branch}"\n` +
        `Expected format: tag/issue-id-slug (e.g. "feat/1-initialize-project")\n` +
        `Allowed tags: ${TAGS.join(", ")}`
    );
    process.exit(1);
  }
}

main();
