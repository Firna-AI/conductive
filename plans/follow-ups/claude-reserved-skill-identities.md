# Claude rejects accepted skill identities

- **Severity:** Medium. **Likelihood:** Rare. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Fix after merge.
- **Added:** 2026-11-17, from PR #426, the independent check of review finding 402.
- **Location:** `runner/sdk-helper/src/providers/skill-metadata.ts:47-54` (the Claude name rule of `skillMetadata`), `runner/sdk-helper/src/providers/skills.ts:34-36` (`repositoryNames`), and `runner/sdk-helper/src/providers/skill-names.test.ts`.
- **Reason:** These cases require reserved names, and the branch has used its two feature fix rounds.

- **Source:** Review.
- **Category:** Product bug.
- **Terms:**
  - **Org skill:** A shared instruction folder from an organization's configured public repository.
  - **Workspace skill:** A skill in the workspace repository's `.claude/skills` folder.
  - **Shown name:** The name in the metadata header of `SKILL.md`.
  - **Helper:** The process under `runner/sdk-helper` that selects skills and starts the agent.
  - **Discovery alias:** The link name under `.claude/skills` that Claude reads.
- **Background:** The helper reads names before it selects org skills. An existing workspace skill wins a shown-name clash. `docs/protocol/org-skills.md` requires both agents to get the selected skills and defines workspace precedence.

  Since commit `7a952095e` of 25 November 2026, each org skill has one metadata result, from `readSkillMetadata`. The org skill choice, the skills list, the skill tab, and the export use it. Option B can put the usable identity into that result.
- **Problem:** Two selection rules disagree with the pinned Claude reader.
  - `skill-metadata.ts` accepts the shown name `anthropic-skills` and names that start with `anthropic-skills:`. Claude refuses those names. The app lists the skill, but Claude drops it without a helper warning. Changing the discovery alias does not repair a refused shown name.
  - `skills.ts` records workspace names even when Claude skips their directory. For example, `.claude/skills/synced/SKILL.md` can declare `name: sync-data`. The helper then excludes an org skill named `sync-data`, although Claude loads neither copy. This precedence defect is Low severity and Rare.
- **Impact if no action:** Some unusual skills stay unavailable. A workspace folder that Claude cannot use can also hide a valid org skill. Renaming the affected shown name or workspace folder is a workaround.
- **Evidence:** The independent check read SDK `0.3.318` and its bundled Claude `2.1.318`. The native directory reader skips `synced` after case folding and removal of trailing dots and spaces. Its reserved-name filters also reject `anthropic-skills` identities.

  The `tengu_plaid_harbor` flag controls part of that filtering and defaults to on. The sandbox's remote flag value was not checked. Evidence is static, from the Linux x64 package. No native Claude process ran.

  A run of the helper code on 25 November 2026, at commit `682b5b23d`, showed that both rules of the helper still hold. `readSkillMetadata` accepted `anthropic-skills` and `anthropic-skills:review` as Claude names. A workspace folder `.claude/skills/synced` with `name: sync-data` kept out an org skill `sync-data`, with the warning "The workspace skill sync-data takes precedence. The org skill will not load." The helper still pins SDK `0.3.318`. Nobody ran Claude itself again.
- **Root question:** How can the helper select org skills and apply workspace precedence using identities that the pinned Claude reader can load?
- **Options:**
  - **A.** Handle the known refusals separately. Treat a reserved org shown name as having no usable Claude name and use the existing warning. Exclude refused workspace folders from the set that takes precedence. Extend the existing name tests and update the helper README. Each selection path keeps its own native-name rule. Effort: Small.
  - **B.** Give the shared Claude metadata reader one result for a usable skill identity. Use that result in org selection and workspace precedence. Distinguish an exported org alias from an original workspace folder. A refused org shown name uses the existing warning. A workspace directory that Claude skips contributes no winning identity.

    Extend the existing name tests and update the helper README. Recheck the private native rules as a one-time proof at SDK updates. Effort: Small.
- **Left out:** Two local approaches repair both selection paths: separate handling, or one shared identity result. An alias-only change cannot repair a refused shown name. A warning from Claude's `init` list cannot restore a wrongly excluded org skill. That list also omits non-user-invocable skills. Changing the public app list adds behavior without making Claude load the skill. A third-party fork adds maintenance without an advantage over B.
- **Wider fix:** B. One Claude identity result prevents the selector and precedence reader from accepting different native identities.
- **Previous examples:** The helper already shares its YAML metadata reader between org and workspace skills. Commit `a5e749503` used that owner to fix workspace precedence for valid YAML. The new defect is in native reserved-name handling.
- **Related:**
  - `plans/follow-ups/claude-reserved-skill-folder.md` gives exported org skills safe, unique aliases. Coordinate the identity result with that mapping. Its alias change alone does not fix these two cases.
  - `plans/follow-ups/skill-duplicate-order.md` changes selection order. Keep that change independent of whether a name is usable by Claude.
  - `plans/follow-ups/skill-list-reader-line-separators.md` makes the skills list read each front matter with the shared YAML reader. Keep the identity result of B when that change lands. No options conflict.
- **Recommendation:** B. One result keeps selection and workspace precedence consistent with the same native rules.
- **Action:** fix after merge, apply B, because these inputs are rare and the fix does not get harder later.

Extend `runner/sdk-helper/src/providers/skill-names.test.ts` with a reserved org shown name and a reserved workspace folder that would otherwise hide a valid org skill. Preserve every existing workspace precedence assertion, with its expectation adjusted only for the new alias mapping. Do not change the behavior of the workspace's own skill files. Add no native Claude test.
