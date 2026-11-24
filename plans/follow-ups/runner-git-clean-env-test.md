# A runner test cannot fail on a dirty env

- **Severity:** Low. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Outside the scope.
- **Added:** 2026-11-24, from branch `calummoore/external-mac-linux-server-cloud-j9ih`, the review of Milestone 4 of the own computers plan.
- **Location:** `crates/cnd-runner/src/skills/_tests_/git_tests.rs:41`
- **Reason:** The test belongs to the skills of the runner, which the own computers change does not touch.

- **Background:** `crates/cnd-runner/src/skills/git.rs:39` builds the Git command of the org skills with `.env_clear()`, then adds a fixed list of variables, so that no secret of the sandbox reaches Git. The test reads `Command::get_envs()` and compares it with that list.
- **Problem:** `get_envs()` returns only the variables that the code set or removed explicitly. It does not show inherited variables. So the test still passes when `.env_clear()` is removed, and secrets such as `OPENAI_API_KEY` would then reach Git.
- **Impact if no action:** A later change can drop the clean environment, and no test fails.
- **Root question:** How does the test prove that the Git command gets no inherited variable?
- **Options:**
  - **A.** Run a small child command, such as `env`, through the same builder, with a variable set in the parent, and assert that the output has only the fixed list. Effort: Small.
  - **B.** Check `get_env_clear()` when the standard library offers it, together with the list. Effort: Small.
- **Left out:** A review rule only: it detects nothing.
- **Wider fix:** A.
- **Previous examples:** Finding 7 of the Milestone 4 review of the own computers plan fixed the same gap in the host program, by reading the exact environment of the command.
- **Recommendation:** A. It tests what the child really gets.
- **Action:** fix after merge, apply A, because it is outside the scope of the own computers change.
