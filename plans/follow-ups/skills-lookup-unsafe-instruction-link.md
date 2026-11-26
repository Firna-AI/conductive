# Skills list counts unsafe instruction links

- **Severity:** Medium. **Likelihood:** Rare. **Effort:** Medium. **Confidence:** High. **Harder later:** No.
- **Kind:** Fix after merge.
- **Added:** 2026-11-18, from PR #426 on branch `calummoore/oslo-3u7a`, a new problem from the independent check of round 6 review finding 411.
- **Location:** `worker/app-api/skills-github.ts:80-86`, `crates/cnd-runner/src/skills/links.rs:17-26`, `docs/protocol/org-skills-list.md:25-27`, `docs/protocol/org-skills.md:147`.
- **Reason:** It needs a `SKILL.md` link that leaves the repository or points nowhere, which is rare, and the fix costs the same later.

### 1. Skills list counts unsafe instruction links

- **Severity:** Medium. **Likelihood:** Rare. **Effort:** Medium.
- **Source:** Review.
- **Category:** Product bug.
- **Location:** `worker/app-api/skills-github.ts:84`.
- **Terms:**
  - **Runner:** The Rust program `conductive` in each cloud computer, which copies the org skills repository and removes unsafe links from the copy.
  - **Lookup:** The Worker's read of the saved repository's file tree on GitHub, which gives the list of skills in the Skills section.
  - **Selector:** `findSkillFolders` in `src/shared/skill-folders.ts`, which the lookup and the agents' Node helper both call with relative paths.
  - **Instruction link:** A `SKILL.md` entry that is a symbolic link, which Git stores as a blob that holds the target path.
  - **Folder layout:** The rule that selects skill folders under `skills/`, at the top level, or as one root skill at the repository root.
- **Background:** An org admin saves one public GitHub repository of skills. The Skills section lists its skills from the lookup, and both agents load the skill folders of the runner's copy. The list rule says that the lookup finds skill folders by the same rule as the agents, at `docs/protocol/org-skills-list.md:25-27`. That rule removes a link that leaves the copy or points nowhere, at `docs/protocol/org-skills.md:147`. A relative link that stays inside the copy remains, so a contained instruction link loads.
- **Problem:** The lookup records each GitHub `blob` entry as a file from its path and type, and it reads no mode or link target. So an instruction link that leaves the repository or points nowhere still names a skill in the list. In a repository without a `skills` folder, a root link of this kind also selects the root layout.
- **Impact if no action:** The list names a skill that the agents never get, because the runner removes its link. With a root link, the list shows one root skill, while the agents get the top-level skills or none.
- **Root question:** How does the lookup apply the link rule of the copy, so that the list names the skills and the layout that the agents get?
- **Options:**
  - **A.** Add an exception to the list rule: the lookup does not check instruction links.
    - The list can then name a skill whose link the copy removes. The mismatch stays.
    - Change no code. Update `docs/protocol/org-skills-list.md:25-27`.
    - Follow the `AGENTS.md` rule for a protocol change. Read the legal pages and the public guides, and update each sentence that restates the rule.
    - Cost: this changes a requirement, so it needs the user's approval.
    - Effort: Small.
  - **B.** Count no instruction link as a skill, on both sides.
    - The lookup skips each `SKILL.md` entry with the link mode `120000`. It needs no extra read.
    - The copy side also drops every instruction link, in the runner or the helper, so the agents match the list.
    - Update the link rule at `docs/protocol/org-skills.md:147` under the same `AGENTS.md` rule. Add runner and Worker cases for an instruction link.
    - Cost: valid contained instruction links stop loading. This is a stricter rule and a new removal, so it needs the user's approval.
    - Effort: Medium.
  - **C.** Apply the link rule of the copy in the lookup, with a confined, link-aware GitHub read.
    - The lookup reads the `mode` of each tree entry. A `SKILL.md` entry with the link mode `120000` is an instruction link.
    - The read is confined. It reads only instruction links, and it resolves each target only against the tree of the same commit.
    - It reads each target by the blob ID of its tree entry, so the target belongs to the same commit as the tree.
    - It drops an absolute target, a target that leaves the repository, and a target that reaches no entry. This matches the rule of the runner.
    - It gives the other entries to the selector unchanged. So a valid contained instruction link stays in the list.
    - Keep the existing lookup failure and incomplete-tree rules. Add no new read limit or fallback to this fix.
    - Add Worker route cases for an escaping link, a dangling link, a root link, and a valid contained link. The fake GitHub server then needs link entries and target reads.
    - Cost: each lookup with instruction links makes extra GitHub requests with the viewer's sign-in. A chain of links needs care, because the runner follows each link of a chain.
    - C changes no requirement, because the list rule already requires the link rule of the copy.
    - Effort: Medium.
- **Left out:**
  - Change nothing. This fails the list rule at `docs/protocol/org-skills-list.md:25-27` together with `docs/protocol/org-skills.md:147`.
  - Keep unsafe instruction links in the copy, so that the agents match the list. This breaks link confinement at `docs/protocol/org-skills.md:147`.
  - Show a notice in the list for instruction links. The list still names skills that the agents never get. The notice is also new behaviour that no requirement covers.
  - Build the list from runner reports of the copy. The list comes from GitHub, not from the copies, at `docs/protocol/org-skills-copy.md:41-43`. An org without a running workspace would also get no list.
  - Download the whole repository archive at each lookup. This gives the same link facts as C at a much larger cost.
  - Give the selector a typed input that makes each caller state link safety. The helper reads a copy whose unsafe links are already gone, so this adds no protection there. It also changes the same selector signature as option C of `plans/follow-ups/skill-duplicate-order.md`.
  - Detection. A test that runs one fixture through both callers is a test for the class, which the outcome rules of the `decisions-and-findings` skill block.
- **Wider fix:** C, together with the folder entries of `plans/follow-ups/skills-layout-empty-directory.md`. The lookup and the helper then give the selector the same entries that the closed copy holds.
- **Previous examples:** None found.
- **Related:**
  - `plans/follow-ups/skills-layout-empty-directory.md` has the same entry list, on the other caller. That item makes the helper record folders as the lookup does. This item makes the lookup drop the links that the copy removes. No options conflict, and neither item waits for the other.
  - `plans/follow-ups/skill-duplicate-order.md` has the same code. Its option C changes the selector output and the `clashes` field of the same lookup reply, at `worker/app-api/skills-github.ts:99`. This item changes only the entries before the selector. No options conflict.
  - The runner's link removal is existing code. It is the rule that this item applies. A and C keep it as it is. B widens it to every instruction link.
- **Recommendation:** C. It applies the existing link rule in the lookup, so the list follows the agents and valid contained instruction links stay listed. A and B change a requirement, so neither applies without the user's approval.
- **Action:** fix after merge, apply C, because the case is rare, C changes no requirement, and the fix costs the same after the merge.

## Static evidence

- At `worker/app-api/skills-github.ts:80-86`, the lookup builds its path list from the `path` and the `type` of each tree entry. A `blob` becomes a file path at line 84. A `tree` becomes `path/` at line 85. The lookup reads no `mode` and no link target.
- A second read on 2026-11-18 confirmed this mode-blind read at lines 84-85.
- At `src/shared/skill-folders.ts:46-64`, the selector counts each path that ends in `SKILL.md` under the chosen layout. A root `SKILL.md` gives the root layout when no path starts with `skills/`.
- At `crates/cnd-runner/src/skills/links.rs:17-26`, the runner removes a link that is absolute, cannot be resolved, or resolves outside the copy. It closes each new copy before publication, at `crates/cnd-runner/src/skills/disk.rs:192`. It closes the restored copy at line 97 of the same file.
- At `runner/sdk-helper/src/providers/skill-folders.ts:17-18`, the helper reads the closed copy. A removed link is not there, so the agents never load its skill.
- The runner test at `crates/cnd-runner/tests/skills/safety_tests.rs:18-44` removes escaping and dangling links. It keeps the links that stay inside the copy.
- The Worker tree fixture builds each entry from a path, with a type and no mode, at `worker/app-api/skills-test-support.ts:91-94`.
- The grades fit.
  - Medium: the list and the agents disagree, and the list rule breaks. The runner still removes the link, so no unsafe file reaches an agent.
  - Rare: the case needs a `SKILL.md` that is a link that leaves the repository or points nowhere.
  - Product bug, not security: the repository author already controls every skill.

## Implementation and verification

- Keep the runner, the helper, and the shared selector as they are.
- Match the runner's cases at `crates/cnd-runner/tests/skills/safety_tests.rs:18-44`: an absolute target, a dangling target, a target outside the repository, and a target inside it.
- Keep a valid contained instruction link in the list.
- Record the read transport and the handling of link chains as design calls in the branch that does the work.
- Keep the existing lookup failure and incomplete-tree behavior.

## Limits

- The independent check that found this problem and the second read used static reads only. No runtime reproduction ran. No test, build, probe, or GitHub call ran.
- The tree types come from GitHub's API documentation and the Worker test setup. They are `blob` for links, `tree` for folders, and `commit` for submodules. No live GitHub reply was checked for these types or for the link mode `120000`.
- Check a relative target that leaves the root, then returns through its on-disk name. The runner checks the final canonical target. No runtime check compared this case with tree-only resolution.
