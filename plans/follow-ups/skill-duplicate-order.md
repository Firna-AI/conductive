# Duplicate org skills load in the wrong order

- **Severity:** Medium. **Likelihood:** Rare. **Effort:** Medium. **Confidence:** High. **Harder later:** No.
- **Kind:** Fix after merge.
- **Added:** 2026-11-17, from branch `calummoore/oslo-3u7a`, review finding 302.
- **Location:** `src/shared/skill-folders.ts:74`, `runner/sdk-helper/src/providers/skills.ts`, `worker/app-api/skills-github.ts:99`.
- **Reason:** It needs two org skill folders whose shown names are equal and whose folder names sort in another order than their paths, which is rare.

### 1. Duplicate org skills load in the wrong order

- **Severity:** Medium. **Likelihood:** Rare. **Effort:** Medium.
- **Source:** Review.
- **Category:** Product bug.
- **Location:** `src/shared/skill-folders.ts:74`.
- **Terms:**
  - **Org skills repository:** the one public GitHub repository of skills that an org admin names on the Cloud computer tab. `docs/protocol/org-skills.md` states its rules.
  - **Shown name:** the name under which an agent lists a skill, read from the `SKILL.md` frontmatter with each agent's rules.
- **Background:** The shared selector `findSkillFolders` finds the skill folders of the copy and drops a later folder that repeats a folder name. The SDK helper then drops a later folder that repeats a shown name. The protocol says that, for two folders with the same shown name, the first in path order loads.
- **Problem:** The selector sorts by folder name before the helper applies the shown-name rule, so the wrong folder can win. The selector also drops a folder that repeats only a folder name, so Codex loses a skill whose shown name is unique, for example `skills/.curated/review` and `skills/.system/review`. The lookup also returns a `clashes` field that no screen shows.
- **Impact if no action:** In rare repositories, agents load the later duplicate, or miss a skill.
- **Root question:** How does each agent load the first folder in path order for each name that it shows, and also every folder whose shown name is unique?
- **Options:**
  - **A.** Sort the selector by path, and keep both duplicate rules. Effort: Small.
  - **B.** Keep the folder-name rule in the selector, but apply it in path order. Effort: Medium.
  - **C.** The selector returns every eligible folder in path order with no name check. The lookup sorts names for display. The helper keeps the first folder in path order for each shown name, and warns. Remove the unused `clashes` field or show it. Update `src/shared/README.md`. Needs generated Claude link names, which review finding 301 added. Effort: Medium.
- **Left out:** Letting the agents handle duplicates, because Claude shows a qualified duplicate and Codex lists both copies.
- **Wider fix:** C. One rule on the agent path removes the second rule.
- **Previous examples:** Review finding 104 of the same branch.
- **Related:** `plans/follow-ups/claude-reserved-skill-folder.md` provides the unique Claude aliases that option C needs. The current helper generates aliases only for unsafe folder names. Two safe folders named `review` would otherwise create the same link and fail the whole view. Apply that alias fix before C, or in the same change. `plans/follow-ups/claude-reserved-skill-identities.md` keeps native name handling consistent with workspace precedence.
- **Recommendation:** C. It fixes the wrong winner and the lost skill with one rule.
- **Action:** fix after merge, apply C, because the case is rare and the fix does not get harder later.
