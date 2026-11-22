# Link removal changes the selected skill layout

- **Severity:** Medium. **Likelihood:** Rare. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Fix after merge.
- **Added:** 2026-11-18, from PR #426 on branch `calummoore/oslo-3u7a`, round 6 review finding 411 and its independent check.
- **Location:** `runner/sdk-helper/src/providers/skill-folders.ts:17-18`, `src/shared/skill-folders.ts:46-52`, `src/shared/README.md:50-52`, `worker/app-api/skills-github.ts:84-85`, `crates/cnd-runner/src/skills/links.rs:17-26`.
- **Reason:** It needs a rare repository whose `skills/` folder holds no file in the copy, and the fix costs the same after the merge.

### 1. Link removal changes the selected skill layout

- **Severity:** Medium. **Likelihood:** Rare. **Effort:** Small.
- **Source:** Review.
- **Category:** Product bug.
- **Location:** `runner/sdk-helper/src/providers/skill-folders.ts:17`. The supporting code is at `src/shared/skill-folders.ts:46`, `worker/app-api/skills-github.ts:85`, and `crates/cnd-runner/src/skills/links.rs:24`.
- **Terms:**
  - **Runner:** The Rust program `conductive` in each cloud computer, which copies the org skills repository and removes unsafe links from the copy.
  - **Helper:** The Node program under `runner/sdk-helper/` that selects the org skills of the copy for Claude or Codex.
  - **Lookup:** The Worker's read of the saved repository's file tree on GitHub, which gives the list of skills in the Skills section.
  - **Selector:** `findSkillFolders` in `src/shared/skill-folders.ts`, which the lookup and the helper both call with a list of relative paths.
  - **Folder layout:** The rule that selects skill folders under `skills/`, at the top level, or as one root skill at the repository root.
- **Background:** An org admin saves one public GitHub repository of skills, and both agents get its skill folders. A repository with a `skills` folder at its top must load skills only from that folder. The root and top-level layouts apply only when that folder is absent. The runner removes unsafe links from the copy before the helper selects folders. `docs/protocol/org-skills.md:145-157` states these rules.
- **Problem:** The helper records files and links, but it omits directory entries. Consider a valid root `SKILL.md` and a dangling link at `skills/escape`. The runner removes the link but leaves `skills/`, so the helper wrongly selects the root skill.
- **Impact if no action:** Both agents load instructions that the folder layout excludes. The lookup correctly reports no skills for the same repository.
- **Root question:** How do the agents keep the correct skill layout when a folder has no files?
- **Options:**
  - **A.** Record `skills/` whenever that physical directory exists. Add a provider regression with an empty `skills/` folder and a valid root skill. Effort: Small.
  - **B.** Record each physical directory with a trailing slash during traversal, as the Worker does. Add the same provider regression. Effort: Small.
  - **C.** Give the shared selector an explicit layout input. Make both callers determine directory presence before selection. Update the selector and caller tests, and carry over the root-skill cases at `src/shared/skill-folders.test.ts:40-49`. A caller can still answer the folder question from files, so C adds no protection for the two existing callers. Effort: Medium.
- **Left out:**
  - A and B are one approach in the helper walk. C is a second approach in the shared selector. The independent check found no other real choice.
  - Keep unsafe links. This breaks link confinement, a security rule at `docs/protocol/org-skills.md:147`.
  - Choose the layout from the files that remain. This breaks the approved rule that the layout depends on whether the `skills` folder exists. The protocol, the public guide, and the Worker test state that rule.
  - Let the runner write a Git-tree file list for the helper. It decides the layout before link removal. A removed root `SKILL.md` link would then still select a root skill that the copy cannot load. It also needs a new file and a new path from the runner to the helper. B is better on every point.
  - Let the runner remove empty folders. This fails the goal, because the helper still would not see `skills/`.
  - Change the lookup or the protocol. The lookup already applies the rule, and its route test pins this case. A layout rule from the files that remain is the approach above.
  - Detection. A test that runs one fixture through both callers is a test for the class, which the outcome rules of the `decisions-and-findings` skill block. B removes the difference instead.
- **Wider fix:** B. Both callers supply directory information in the same `path/` form, including empty directories.
- **Previous examples:** None found in the relevant `origin/main` history or the focused plan search.
- **Related:**
  - The runner's link removal is existing code and has the same cause. It empties `skills/` in this case. It is at `crates/cnd-runner/src/skills/links.rs:17-26`, and it runs at `crates/cnd-runner/src/skills/disk.rs:97` and `:192`. Every option keeps it. The fix belongs where the helper reads the closed copy.
  - The layout-first selection is existing code in the same area. An earlier fix put the layout decision first at `src/shared/skill-folders.ts:46-52`, so that a child skill cannot replace a root skill. A and B change no selector code, so they keep its cases at `src/shared/skill-folders.test.ts:40-49`.
  - `plans/follow-ups/skill-duplicate-order.md` has the same code. Its option C changes the output of the same selector. It also removes the clash warning at `runner/sdk-helper/src/providers/skill-folders.ts:23-26`, in the helper function that B changes. B does not conflict with it. Option C of this item changes the same selector signature, so the two options C need one branch or a fixed order.
  - `plans/follow-ups/skills-copy-case-change.md` has the same code. Its options B, D, and E change how the helper names a root skill at `runner/sdk-helper/src/providers/skill-folders.ts:22`. B of this item changes the same function at line 17. That item recommends D, which takes that name from the configured repository. No options conflict. One later branch can carry both fixes with one helper test setup.
  - `plans/follow-ups/skills-lookup-unsafe-instruction-link.md` has the same entry list, on the other caller. It covers a separate defect: the lookup counts a `SKILL.md` link that the runner removes. No options conflict, and neither item waits for the other.
- **Recommendation:** B, unchanged after the independent check. B gives the helper the same folder form, `path/`, that the Worker and its route test already use. It covers both triggers and changes no shared code.
- **Action:** fix after merge, apply B, because this needs an unusual repository whose `skills/` contents disappear from the copy, and the fix costs the same later.

## Shared assumptions

The independent check reworded the root question. The first question named only one trigger, link removal. A `skills/` folder that holds only submodules can give the same wrong layout without any link.

- The runner keeps removing links that leave the copy or point nowhere. Source: `docs/protocol/org-skills.md:147` and the runner's link removal. The reason holds. Kept.
- The layout depends on whether the `skills` folder exists, not on the files that remain in it. Source: `docs/protocol/org-skills.md:148-157`, the public guide at `src/marketing/docs/cloud-computer.md:161-178`, and the Worker test. The reason holds. Kept.
- The agents select from the closed copy on disk, not from the Git tree. Source: "the skill folders of the copy" at `docs/protocol/org-skills.md:145`, and the code. The reason holds. Kept.
- Only the helper side changes, because the lookup is right. Source: the impact of the finding. This holds for folders. For removed `SKILL.md` links, the lookup is the wrong side. `plans/follow-ups/skills-lookup-unsafe-instruction-link.md` records that separate problem. Kept.
- Link removal is the only trigger. Source: the background and the first root question of the finding. This does not hold, because submodules can give the same result. No option has to drop it, because A, B, and C all read physical folders. Only the root question and the wording of the regression change.

## Static evidence

1. The lines do what the finding says.
   - At `runner/sdk-helper/src/providers/skill-folders.ts:17-18`, the walk only goes into folders. It records files and links, but never folders.
   - At `crates/cnd-runner/src/skills/links.rs:17-26`, the runner removes a link that is absolute, cannot be resolved, or resolves outside the copy. It never removes a folder.
   - At `src/shared/skill-folders.ts:46-52`, the layout is `skills` only when a path starts with `skills/`. Otherwise a root `SKILL.md` gives the root layout.
   - So a root `SKILL.md` and a removed `skills/escape` give the helper the list `['SKILL.md']`, and the helper selects the root skill.
   - At `worker/app-api/skills-github.ts:84-85`, the Worker records a GitHub tree folder as `skills/`. So it gets the `skills` layout and shows the no-skills notice, at lines 94-98.
   - Both agents use this path. `claude-skills.ts:14` and `codex-skills.ts:35` call `prepareSkillView`. It calls `selectAgentSkills` at `skill-view.ts:93`, which calls `orgSkillFolders` at `skills.ts:60`. These four files are in `runner/sdk-helper/src/providers/`.
2. The branch that found the defect also added its code. None of the four code files of the **Location** field exists on `origin/main` at `f85ffc2cf`. The helper walk has skipped folders since commit `303756dd5`. The Worker has recorded `path/` since commit `5b8b6f384`. Link removal came with commit `a5e749503`.
3. The rule says what the finding claims, at `docs/protocol/org-skills.md:145-157`. `docs/protocol/org-skills-list.md:25-27` says that the lookup uses the same rule. The public guide repeats it at `src/marketing/docs/cloud-computer.md:161`, `:171`, and `:178`.
4. The impact is visible. The agents load a root skill, or top-level skills, that the list does not show. The section shows the no-skills notice. For a repository that an admin trusts under `docs/protocol/org-skills-trust.md`, Claude also keeps the inline commands of that root skill. Trust covers the whole repository, so this does not raise the grade.
5. The grades fit.
   - Medium: the list and the agents disagree, and the rule breaks. But the extra skill comes from the chosen repository, and no intended skill is lost. An earlier High defect, where a child skill replaced a root skill, lost an intended skill.
   - Rare: the case needs a `skills/` folder that holds only removed links or only submodules, and a root or top-level skill.
   - Product bug, not security: the repository author already controls every skill.
6. No test catches it. No helper test has an empty `skills/` folder. The independent check read `skills.test.ts`, `skill-safety.test.ts`, `skills-trust.test.ts`, and `skill-names.test.ts` in `runner/sdk-helper/src/providers/`. The selector case at `src/shared/skill-folders.test.ts:60-64` uses a file, `skills/README.md`, not a folder. The runner test at `crates/cnd-runner/tests/skills/safety_tests.rs:18-44` checks only the removal. Only the Worker side pins this case, at `worker/app-api/skills-lookup.test.ts:104-108`.
7. A second read on 2026-11-18 rechecked the helper walk, the shared selector, the Worker tree read, and the runner link cleanup.
8. A second trigger is possible but not verified. `crates/cnd-runner/src/skills/disk.rs:176-191` exports the copy with `read-tree` and `checkout-index --all --force`, with no submodule option. The independent check expects Git to create an empty folder for each submodule entry, while GitHub lists the parent as a tree. So a `skills/` folder that holds only submodules would give the same wrong layout.

## Implementation and verification

- In the walk at `runner/sdk-helper/src/providers/skill-folders.ts:17`, record each physical directory as `path/`, then walk into it. Keep the `.git` skip.
- Record physical directories only. A link stays an entry without a slash, as a link blob does in the lookup.
- Change `src/shared/README.md:50-52`, which says that the selector takes "file paths". Say that each folder entry is `path/`.
- Add a helper regression that matches the Worker case at `worker/app-api/skills-lookup.test.ts:104-108`. Give it an empty `skills/` folder, `top/SKILL.md`, and a root `SKILL.md`.
- Run that regression for Claude and for Codex. Expect no org skill for either agent.
- Name the regression for a folder that holds no file, not only for link removal.
- Keep the selector cases at `src/shared/skill-folders.test.ts:40-49` unchanged.

## Limits

- All checks were static reads only. No runtime reproduction ran. No test, build, Git command on a copy, probe, or network request ran.
- The submodule trigger depends on how Git checks out submodule entries. Nobody ran it, so it stays unverified Git behaviour.
- The GitHub tree types come from GitHub's API and the Worker test setup at `worker/app-api/skills-test-support.ts:93-94`. They are `blob` for links, `tree` for folders, and `commit` for submodules. No live GitHub call checked them.
