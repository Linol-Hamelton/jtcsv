/**
 * commitlint configuration — enforce Conventional Commits.
 *
 * Wired into the `commit-msg` git hook by husky (.husky/commit-msg).
 * The conventional preset accepts: feat, fix, docs, style, refactor,
 * perf, test, build, ci, chore, revert. Scopes are free-form.
 *
 * Examples that pass:
 *   feat(workers): add concurrency option
 *   fix: handle quoted newlines in CSV chunker
 *   chore(plugins): triage 7 client adapters
 */
module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    // Allow our existing emoji-augmented commits during the bedding-in
    // period (e.g. "fix: 🐛 ..."). Tighten later.
    'subject-case': [0],
    // We routinely write detailed multi-paragraph bodies for milestone
    // commits; let them flow.
    'body-max-line-length': [1, 'always', 200],
    'footer-max-line-length': [1, 'always', 200],
  },
};
