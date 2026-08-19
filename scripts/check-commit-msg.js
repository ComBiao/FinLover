#!/usr/bin/env node
// Validates commit messages against the project's `tag:message` convention.
// Used by both the husky commit-msg hook and the CI commit-lint job.

const fs = require("fs");

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

const PATTERN = new RegExp(`^(${TAGS.join("|")}):\\s*.{1,100}$`, "i");

function validate(message) {
  const firstLine = message.split("\n")[0].trim();
  return PATTERN.test(firstLine);
}

function main() {
  const arg = process.argv[2];
  if (!arg) {
    console.error("Usage: check-commit-msg.js <message|commit-msg-file>");
    process.exit(1);
  }

  const message = fs.existsSync(arg) ? fs.readFileSync(arg, "utf8") : arg;

  if (!validate(message)) {
    console.error(
      `Invalid commit message: "${message.split("\n")[0]}"\n` +
        `Expected format: tag: message (e.g. "init: initialize repo")\n` +
        `Allowed tags: ${TAGS.join(", ")}`
    );
    process.exit(1);
  }
}

main();
