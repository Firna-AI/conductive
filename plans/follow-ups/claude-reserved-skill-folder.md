# Claude skips reserved skill folder names

- **Severity:** Medium. **Likelihood:** Rare. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Fix after merge.
- **Added:** 2026-11-17, from PR #426, review finding 402 and its independent check.
- **Location:** `runner/sdk-helper/src/providers/skills.ts:95`, `runner/sdk-helper/src/providers/skill-metadata.ts:12`, and `runner/sdk-helper/src/providers/skill-view.ts:103`.
- **Reason:** The defect requires an unusual folder name, and the branch has used its two feature fix rounds.

- **Source:** Review.
- **Category:** Product bug.
- **Terms:**
  - **Org skill:** A shared instruction folder from an organization's configured public repository.
  - **Helper:** The process under `runner/sdk-helper` that prepares skill files and starts the agent.
  - **Discovery alias:** The name of a link that the helper creates under `.claude/skills`.
  - **Shown name:** The name in the metadata header of `SKILL.md`.
  - **Root skill:** A repository whose root `SKILL.md` makes the repository itself one skill.
- **Background:** Conductive gives selected org skills to both agents, as What loads and Skills in a session in `docs/protocol/org-skills.md` require. The helper prepares a temporary view for Claude. It keeps each safe source folder name as the discovery alias. A root skill uses the repository name.
- **Problem:** `skills/synced/SKILL.md` passes selection with a valid shown name such as `sync-data`. The helper keeps `synced` as its alias. The pinned Claude reader skips that directory before reading its instructions. It also skips `SYNCED` and `synced.`. A root-skill repository named `synced` has the same defect.
- **Impact if no action:** The app lists the skill, and Codex can load it, but Claude cannot discover it. Renaming the source folder or the root-skill repository is a workaround.
- **Evidence:** Static inspection found the following behavior in SDK `0.3.318`, which bundles Claude `2.1.318`.
  - The additional-directory reader `$Lr` reads `.claude/skills` through `g$`. Its default directory kind is `skills`.
  - `g$` skips a directory when `L9(name)` is true. `L9(name)` compares `Lm(eZt(name))` with `synced`.
  - `eZt` removes trailing dots and spaces. `Lm` folds case and normalizes text.
  - A second filter, `rrt`, removes the reserved alias `anthropic-skills`, in any case. Its list is `JQe=["anthropic-skills"]`.
  - The remote feature flag `tengu_plaid_harbor` controls the second filter and defaults to on. The sandbox's remote flag value was not checked.
  - `skills.ts` accepts all these folder aliases. `skill-view.ts` creates their links. The helper gives no warning when Claude drops one.
  - Claude's model listing uses the alias first, then the shown name when they differ. Its `init` skill list also uses the alias.
  - The app receives no command list. Its generic chat tool line shows `Skill`, without the alias.
  - No native Claude process ran for this check. Only the installed Linux x64 package was read. The other platform packages were not checked.
- **Root question:** How can the helper give every selected Claude org skill a stable, readable discovery alias that Claude accepts?
- **Options:**
  - **A.** Generate aliases for `synced` and the spellings that Claude treats as equal. Cover root names too. Extend the existing provider regression test and update the helper README. This depends on that reserved name and misses the separate `anthropic-skills` filter. Effort: Small.
  - **B.** Generate collision-free numbered aliases for every Claude org skill. Keep shown names in the exported metadata. Update precedence, the existing tests, and the helper README. The model sees opaque names such as `conductive-org-skill-N`. Those names can change when a repository adds a skill. Effort: Small.
  - **C.** Give every Claude org skill a stable alias that the helper owns. Use a fixed prefix and a safe form of the shown name, such as `org-pdf`. Use a safe form of the folder name when needed. Add a short hash of the repository path for a clash with another alias or a workspace name.

    Keep the shown name in the exported metadata. Compare org skills with workspace skills by shown name and actual alias, instead of the unused source folder name. Extend the existing regression test and update the helper README. The model sees the new readable alias before the shown name. Effort: Small.
  - **D.** Compare Claude's `system`/`init` skill list with the selected user-invocable aliases. Warn once for each missing skill. Add a helper test with the fake Claude query. This can accompany another option. It does not load a missing skill and cannot check skills with `user-invocable: false`. Fake-query support for `init` was not checked. Effort: Small.
  - **E.** Complete A with every reserved alias of the pinned reader. Use Claude's comparisons for `synced` and `anthropic-skills`, including root names. Add unit cases and a README step to recheck the native rules at each SDK update. Record each update proof under `.context/`. A later version can add a reserved name without a signal. Effort: Small.
- **Left out:**
  - Repository renames, omitted skills, or no change fail the loading requirement.
  - A fork of Claude's compiled reader adds maintenance that C avoids.
  - Plugin packaging adds a namespace to skill names and changes the current precedence and duplicate rules.
  - A Worker notice does not load the skill and copies Claude's private rules into another component.
  - A runner snapshot rename loses repository paths. The helper owns discovery aliases.
  - The reader has no setting to turn off this directory skip.
  - A test of the real third-party reader is outside the testing rules. Use a one-time inspection when the SDK changes.
- **Wider fix:** C. Repository folder names no longer control Claude discovery. D is an optional detection measure and does not replace the structural fix.
- **Previous examples:** Commit `efb6cc0d2` introduced generated aliases for unsafe folder names after a folder name formed an inline shell command. Its character-only alias check left reserved names unchanged. Numbered aliases for every skill were previously rejected because they hide useful names from the model.
- **Related:**
  - `plans/follow-ups/skill-duplicate-order.md` needs a unique alias for each selected Claude skill. Two safe folders named `review` would otherwise create the same link, and the failed preparation would drop every org skill. Apply C before that item's selection change, or in the same change.
  - `plans/follow-ups/claude-reserved-skill-identities.md` records refused shown names and workspace precedence. C alone does not fix them.
  - `docs/protocol/org-skills-trust.md` gives the repository trust policy, including its effect on workspace skills. This alias change keeps that policy.
- **Recommendation:** C. It gives Claude readable, stable names and gives duplicate folder names distinct aliases. It supersedes the first review's recommendation B. Keep D optional because it cannot verify non-user-invocable skills.
- **Action:** fix after merge, apply C, because the input is rare and the fix does not get harder later.

Extend `runner/sdk-helper/src/providers/skill-safety.test.ts:129` with `synced`, `SYNCED`, `synced.`, `anthropic-skills`, and a root skill named `synced`. Preserve the hostile-name safety cases. Update the `taken-folder` case in `skill-names.test.ts` because a source folder is no longer the discovery alias. Keep normal workspace precedence and shown names. Update the alias description in `runner/sdk-helper/README.md:69`.
