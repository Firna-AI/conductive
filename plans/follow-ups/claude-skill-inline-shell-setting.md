# Turn off inline shell in Claude skills

- **Severity:** Medium. **Effort:** Medium. **Confidence:** High. **Harder later:** No.
- **Kind:** Needs decision.
- **Added:** 2026-11-17, from branch `calummoore/oslo-3u7a`, the wider fix of review findings 101 and 301.
- **Location:** `runner/sdk-helper/src/providers/skill-metadata.ts`, `runner/sdk-helper/src/providers/claude.ts`.
- **Reason:** The wider fix also turns off inline commands in the workspace repository's own skills, which work on `main`, so the user decides.

### 1. Turn off inline shell in Claude skills

- **Severity:** Medium. **Effort:** Medium.
- **Source:** Review.
- **Category:** Security.
- **Location:** `runner/sdk-helper/src/providers/skill-metadata.ts`.
- **Terms:**
  - **Inline shell:** text such as `` !`command` `` or a block that starts with ```` ```! ```` in a `SKILL.md`. Claude runs it when it renders the skill.
- **Background:** The org skills rule says that no inline command from an org skill runs. The SDK helper therefore rewrites each org `SKILL.md` and makes the inline shell markers inert. Claude also adds its own text, such as the skill's base folder and the arguments, before it runs its inline shell parser.
- **Problem:** Each new form of text that Claude adds can create a new inline command, as review finding 301 and its check showed twice. The filter must follow Claude's syntax.
- **Impact if no action:** A later Claude version can add a form that the filter misses, and an org skill can then run a command.
- **Root question:** Who stops inline commands in org skills, the helper's filter or Claude itself?
- **Options:**
  - **A.** Keep the helper's filter only, and update it with each Claude version. Effort: Small for each change.
  - **B.** Also set Claude's `disableSkillShellExecution: true` for every session. Claude then makes every inline command inert, whatever its form. The workspace repository's own skills also lose their inline commands. Change the protocol. Effort: Medium.
- **Left out:** Loading org skills without files, because the agents must get the skill folders.
- **Wider fix:** B.
- **Previous examples:** Review findings 101 and 301 of the same branch, and the `!$ARGUMENTS` case of the 301 check.
- **Recommendation:** B. It closes the whole class, at the cost of inline commands in workspace skills.
- **Action:** ask the user, because B changes how the workspace repository's own skills work on `main`.
