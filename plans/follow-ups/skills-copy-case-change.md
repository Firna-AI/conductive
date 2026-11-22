# Case-only edits remove the last good copy

- **Severity:** Medium. **Likelihood:** Rare. **Effort:** Medium. **Confidence:** High. **Harder later:** No.
- **Kind:** Fix after merge.
- **Added:** 2026-11-18, from PR #426 on branch `calummoore/oslo-3u7a`, round 6 review finding 410 and its independent check.
- **Location:** `crates/cnd-runner/src/skills/disk.rs:41-61`, `crates/cnd-runner/src/skills/disk.rs:75-101`, `crates/cnd-runner/src/skills/sweep.rs:25-28`, `crates/cnd-runner/src/config.rs:103-111`, `runner/sdk-helper/src/providers/skill-folders.ts:22`, `runner/sdk-helper/src/providers/skill-metadata.ts:21`, `runner/sdk-helper/src/providers/skill-view.ts:99`.
- **Reason:** A case-only edit of the saved name is rare, and fix D keeps the stored layout, so the fix costs the same after the merge.

### 1. Case-only edits remove the last good copy

- **Severity:** Medium. **Likelihood:** Rare. **Effort:** Medium.
- **Source:** Review.
- **Category:** Product bug.
- **Location:** `crates/cnd-runner/src/skills/disk.rs:83`. The related path checks are at lines 41-61 of the same file.
- **Terms:**
  - **Org skills repository:** The one public GitHub repository of skills that an org admin saves as `owner/name` in the Skills section of the Cloud computer tab.
  - **Runner:** The Rust program `conductive` in each cloud computer, which starts the agents and keeps the copy store.
  - **Copy store:** The folder `~/.conductive/skills/`, where the runner keeps the copies of the org skills repository for the agents.
  - **Helper:** The Node program under `runner/sdk-helper/` that gives the selected org skills to Claude or Codex.
  - **Root skill:** A repository without a `skills` folder whose root `SKILL.md` makes the whole repository one skill, named after the repository.
- **Background:** Conductive loads shared skills from one org skills repository. The Worker gives its saved name to the runner at each start and resume, and this text is the configured name. Two names match without regard to letter case, because GitHub names ignore it, and the Skills section shows the saved spelling. A failed copy or check keeps the last good copy, also across a stop and a resume. `docs/protocol/org-skills-trust.md:116-118` and `docs/protocol/org-skills-copy.md:24-26` state these rules.
- **Problem:** At start, `prepare` compares the configured name with the `name` file of the copy store as exact text, and removes the store on any difference. So a change from `Owner/Skills` to `owner/Skills` deletes a valid copy of the same repository. A fix of only that comparison is not enough, because `current` also builds and checks the store paths from the exact spelling.
- **Impact if no action:** After a case-only edit, a failed fetch at the next start or resume leaves both agents without the skills of a usable copy. A successful fetch downloads the whole repository again, and turns that start before it ends get no org skills.
- **Root question:** Which repository identity keeps the last good skills copy after a case-only name edit and agrees with GitHub and trust?
- **Options:**
  - **A.** Recognize a case-only change during preparation. Move the cached paths and repair the published pointer, the `repository` link, before fetching. Extend the existing resume regression test. A is complete, because `prepare` is the only point where the spelling can change. The renames need a crash-safe order: the folders, then the link, then the `name` file. Effort: Small.
  - **B.** Separate normalized repository identity from display spelling throughout copy storage. Use the identity consistently for selection, restore, update, and cleanup. Preserve existing copies during conversion and keep root-skill display names separate from storage paths. Add the defect regression test. B changes the stored layout, so each existing copy needs a conversion after the merge. Effort: Medium.
  - **C.** Normalize the saved source and its displayed name to lowercase. Reconcile existing cached paths and update the approved spelling rule. This changes visible behavior and needs user approval. C also needs a runner fix like A or D for the copies that already exist. Effort: Medium.
  - **D.** Keep the store under the spelling of its first copy. The recorded spelling is then the path key.
    - `prepare` compares the configured name with the `name` file without letter case. On a match, it keeps the store, the `name` file, and every path.
    - All store paths come from one accessor that reads the `name` file. Only the fetch URL and the helper use the configured name.
    - The helper names a root skill from the configured name, not from the folder name. The three naming paths are `runner/sdk-helper/src/providers/skill-folders.ts:22`, `runner/sdk-helper/src/providers/skill-metadata.ts:21`, and `runner/sdk-helper/src/providers/skill-view.ts:99`.
    - One runner function holds the identity rule for the trust match and the store.
    - Add the defect regression to `crates/cnd-runner/tests/skills/copy_tests.rs:13`. Add a helper test for the name of a root skill.
    - Update `runner/configuration.md:79` and `crates/cnd-runner/README.md:89`.
    - Cost: the layout does not change, so no conversion runs, before or after the merge. No folder is renamed between case variants. The code holds two spellings, so every later storage path must use the accessor.
    - Effort: Medium.
  - **E.** Keep the one selected copy at fixed paths that hold no repository name.
    - The `name` file holds the identity, and the runner compares it without letter case.
    - The helper names a root skill from the configured name, as in D.
    - The runner converts any existing copy once at start, with one rename and a new link.
    - Cost: no path can depend on a spelling. Every existing copy converts at the software update. An older runner on the same disk fetches again after a rollback.
    - Effort: Medium.
- **Left out:**
  - Change only the comparison. It does not work. `current` rejects the old paths at `crates/cnd-runner/src/skills/disk.rs:49-57`. The sweep reads only the folder of the new name at `crates/cnd-runner/src/skills/sweep.rs:26-28`, so the old store also stays on disk and is never cleaned up.
  - Reject case-only saves. This is a new rejection, so it is blocked. It also adds unnecessary validation.
  - Keep Save off in the app for a case-only edit. This adds a stricter Save rule. It changes "Save stays off until one of them changes" at `docs/protocol/org-skills-trust.md:126-128`. It also does not cover older apps or direct API writes.
  - Let the Worker send a fixed identity, such as the GitHub repository ID. The runner already has the identity rule. An ID needs a GitHub call at each start, a new start variable, and a new meaning of "another repository".
  - Keep the current behaviour. It fails the last-good-copy rule at `docs/protocol/org-skills-copy.md:24-26`.
  - Keep the old copy until the first copy under the new spelling succeeds, then delete it. A reaches the same end state with no second download, no second store, and no delayed cleanup.
  - Detection. A test of every case variant is a test for the whole defect class, which the outcome rules of the `decisions-and-findings` skill block. A log warning does not keep the copy.
- **Wider fix:** D. Storage paths no longer depend on the configured spelling, and no path conversion runs. B and E are the other structural fixes. A is the direct fix.
- **Previous examples:** None found in the relevant `origin/main` history or the plan search.
- **Related:**
  - `plans/follow-ups/skills-startup-cleanup-hides-restored-copy.md` has the same code and the same requirement. Its option C moves startup cleanup out of the same `prepare` at `crates/cnd-runner/src/skills/disk.rs:75-101`. It keeps the selection check that this item changes, and it extends the same resume test at `crates/cnd-runner/tests/skills/copy_tests.rs:13`. The options do not conflict. Do both in one later branch, or build this fix on top of that option C. Keep its rule that a failed selection cleanup stops restoration.
  - The repository trust match is existing code and shares the wider fix. The runner trust match at `crates/cnd-runner/src/config.rs:103-111` compares names without letter case. So do the Worker trigger at `migrations/202611181130_org_skills_repository_trust.sql:5` and the app hint at `src/app/skills-trust.ts:58-60`. Only the copy store treats a case-only change as a new repository. Put the rule in one runner function that the trust match and the store both use.
  - `plans/follow-ups/skills-layout-empty-directory.md` has the same code, for options B, D, and E only. These options change how `runner/sdk-helper/src/providers/skill-folders.ts:22` names a root skill. That item's fix changes the folder walk in the same function. No options conflict. One later branch can fix both, with one helper test setup.
  - `plans/follow-ups/claude-reserved-skill-folder.md` has the same code, for options B, D, and E only. Its fix also makes Claude aliases for the names of root skills. Whichever change lands second must start from the configured name. No options conflict.
  - `plans/follow-ups/skills-copy-status-in-app.md` has no listed kind of link. Its status design, which waits for approval, keeps the status rows when only the letter case changes. That rule matches the runner only after this fix. Neither item waits for the other.
- **Recommendation:** D, changed from the review's B after the independent check. D stops the store from depending on the configured spelling, as B does, and it changes no stored layout, so it needs no conversion.
- **Action:** fix after merge, apply D, because this rare Medium defect needs no change of the stored layout, so its cost does not grow later.

## Shared assumptions

The independent check reworded the root question. The defect is two identity rules in one product. A question about a change of spelling points toward moving files when the change happens.

- A case-only change names the same repository for the copy rules. Source: `docs/protocol/org-skills-trust.md:116-118`, and a design call of the repository trust change on 2026-11-18. That call compares valid repository identities without letter case and keeps the configured name for display. The copy doc says only "another repository" at `docs/protocol/org-skills-copy.md:32`. The reason holds, because GitHub names ignore letter case. Kept.
- The saved spelling stays the spelling that users see. Source: the same design call and `docs/protocol/org-skills-trust.md:117-118`. The reason holds. C drops this assumption and needs a user decision.
- A change to a different repository still deletes the old copy before the new fetch. Source: `docs/protocol/org-skills-copy.md:32-35`. This is a requirement. Kept.
- Store paths hold a spelling of the name, and the name of a root skill comes from the snapshot folder name. Source: the code at `crates/cnd-runner/src/skills/disk.rs:41-43` and `:168-171`, and the three helper naming paths of D. This is not a requirement. E drops it. D keeps the paths but stops deriving them from the configured name.
- The recorded B and C assume that copies in the current layout exist when the fix lands. At the review, this layout was absent from `origin/main`. After the merge of the branch that added the store, such copies can exist. So B and E need a conversion, and C needs a runner fix for the existing copies. A and D change no layout.

## Static evidence

- **Exact match and delete.** At `crates/cnd-runner/src/skills/disk.rs:78-91`, `prepare` compares the `name` file with the configured name as exact text. The test is `selected.as_deref() != repository` at line 83. On any difference, line 84 removes the whole store root: the `repository` link, the Git store, and every commit folder.
- **Exact paths.** At `crates/cnd-runner/src/skills/disk.rs:41-61`, `named` puts the configured text into the path. `current` accepts the link only under `named(repository)/commits`, with a final folder equal to the configured name part.
- **No retry with the old copy.** At `crates/cnd-runner/src/skills/schedule.rs:35-66`, `prepare` runs once for each runner process. A failed `update` keeps what is published, which is nothing after the delete.
- **The case-only name reaches the runner.**
  - The runner reads the name from `CONDUCTIVE_SKILLS_REPOSITORY` at service start, at `crates/cnd-runner/src/config.rs:89-102`.
  - The Worker sends the saved text at each start and resume, at `worker/lifecycle/sandbox-environment.ts:93-95`. The test at `worker/lifecycle/skills-environment.test.ts:42` shows `Owner/Skills` arriving unchanged.
  - Save keeps letter case, at `src/shared/skill-folders.ts:33-39` and `src/shared/skills-repository-settings.ts:26-47`.
  - The app compares the draft as exact text at `src/app/skills-trust.ts:25-27`. So Save turns on for a case-only edit, at `src/shell/settings/SkillsSection.tsx:111` and `:121`.
- **The helper has the configured name.** The runner gives it as `OrgSkills.repository`, at `crates/cnd-runner-interface/src/sdk_helper_options.rs:54-56` and `crates/cnd-runner/src/engine/provider.rs:75-76`. So D and E need no new runner message.
- **Requirement.** `docs/protocol/org-skills-copy.md:24-26` keeps the last good copy across a stop and a resume. The public guide says the same at `src/marketing/docs/cloud-computer.md:195`. The fix needs no doc change beyond the two developer docs that D names.
- **Scope.** The branch that found this defect added the store, in commits `303756dd5` and `a5e749503`. The repository trust commit `e714e5c72` did not change `disk.rs` or `sweep.rs`. In `runner/sdk-helper/src/providers/skill-folders.ts`, it only renamed one option field.
- **Second read.** A second read on 2026-11-18 rechecked `disk.rs`, `schedule.rs`, the trust match, and the helper naming paths.
- **Tests.** Every skills test uses `org/skills` only. The test helper maps URLs by exact text, at `crates/cnd-runner/tests/skills/support.rs:56-60`. No test changes the letter case of a saved name, so no test catches this defect.

## Implementation and verification

- Keep the rule of `plans/follow-ups/skills-startup-cleanup-hides-restored-copy.md`: a failed selection cleanup stops restoration.
- Keep the delete of the old copy when the org removes its repository or names another one.
- Keep the fetch URL at `crates/cnd-runner/src/skills/disk.rs:122` on the configured name.
- The helper test at `runner/sdk-helper/src/providers/skills.test.ts:131` checks the name of a root skill. Its fixture names the copy folder `org-skills` and the configured repository `Owner/Skills`, at `runner/sdk-helper/test-support/skill-providers.ts:17-19`. With D, that root skill takes its name from `Owner/Skills`. Change the expected name to the new source, and remove no assertion.

## Limits

- The review and its check used static reads only. No runtime reproduction ran. No test, build, or Git change ran for this item.
- The check did not verify how GitHub serves a URL with different letter case. The analysis relies on the documented rule that GitHub names ignore letter case.
- On a volume that ignores letter case, such as a default macOS volume, the renames of A and B and their test checks behave differently.
