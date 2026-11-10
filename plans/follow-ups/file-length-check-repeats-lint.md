# The gate runs the whole lint twice

- **Severity:** Low. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Outside the scope.
- **Added:** 2026-11-10, from the options check of `plans/follow-ups/missing-await-passes-lint.md` on branch `calummoore/account-routing-flake-fix`.
- **Location:** `package.json`, the scripts `lint`, `file-length:check`, and `check`. `eslint.config.js`. `AGENTS.md`, the early check under `## Commands`.
- **Reason:** That branch fixes a flaky test and changes no lint script, so one fix in a separate branch reaches every open branch.

- **Terms:**
  - **Complete gate:** `npm run check`. CI runs it on each pull request as the job "Complete gate".
- **Background:**
  - `package.json` defines `lint` as `eslint .` and `file-length:check` as `eslint . --rule 'max-lines: [error, 300]'`. The complete gate runs both.
  - So the second run parses each file and runs each lint rule again, only to add the `max-lines` rule. `AGENTS.md` says that the check rejects JavaScript, TypeScript, and Astro files over 300 lines, including comments and blank lines.
  - On 10 November 2026, on a 4-core machine, `npm run lint` took 30.3 seconds, and `npm run file-length:check` took 32.0 seconds. Both passed.
- **Problem:** The complete gate and the early check run the whole lint twice.
- **Impact if no action:** Each gate run and each early check costs about 30 seconds more than it needs. Each lint rule that a later change adds costs twice.
- **Root question:** How does the gate check file length without a second run of every lint rule?
- **Options:**
  - **A.** Add `max-lines: ['error', 300]` to `eslint.config.js` for every file that the lint checks. Then `npm run lint` checks file length too. Keep `npm run file-length:check` as a name for `npm run lint`, and take it out of `npm run check`. Update `AGENTS.md`. Effort: Small.
  - **B.** Keep the two runs, but give `file-length:check` its own configuration with the parsers and only the `max-lines` rule. Each file is still parsed twice. Effort: Small.
  - **C.** Replace `file-length:check` with a small Node script that counts the lines of each JavaScript, TypeScript, and Astro file. It needs no parse, but it must follow the ignore list of `eslint.config.js`. Effort: Small.
- **Left out:** Running the two checks in parallel, because each file still costs two full lint runs of processor time.
- **Wider fix:** None. The problem is one script, and A removes the second run.
- **Previous examples:** None found in the history of `main` or in `plans/follow-ups/`.
- **Related:** `plans/follow-ups/missing-await-passes-lint.md` proposes lint rules with type information. Until this item is fixed, each second that those rules add counts twice in the gate.
- **Recommendation:** A. One lint run then checks file length and every other rule, and the gate still checks the same things.
- **Action:** fix after merge, apply A, because the problem is outside the scope of the branch that found it, and one fix reaches every open branch.
