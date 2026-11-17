# Turn off inline shell in Claude skills

- **Severity:** Medium. **Effort:** Medium. **Confidence:** High. **Harder later:** No.
- **Kind:** Needs decision.
- **Added:** 2026-11-17, from branch `calummoore/oslo-3u7a`, the wider fix of review findings 101 and 301.
- **Location:** `runner/sdk-helper/src/providers/skill-metadata.ts`, `runner/sdk-helper/src/providers/claude.ts`.
- **Reason:** The user chose repository trust on 2026-11-17. The detailed design awaits plan approval before implementation.

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
- **Root question:** Who may allow automatic commands from shared org skills, and what keeps those commands off after a Claude update?
- **Options:**
  - **A.** Keep the helper's filter only, and update it with each Claude version. Effort: Small for each change.
  - **B.** Also set Claude's `disableSkillShellExecution: true` for every session. Claude then makes every inline command inert, whatever its form. The workspace repository's own skills also lose their inline commands. Change the protocol. Effort: Medium.
  - **C.** Add an admin-controlled trust setting beside the org skills repository. Default to B for a configured source. Explicit trust permits Claude inline shell in that source. Explain the session-wide effect and future updates. Effort: Medium.
  - **D.** Give each member a trust choice for their own sessions. This needs a second settings scope and different behavior between members. Effort: Large.
  - **E.** Use C, but trust only one reviewed commit. Each later push needs another admin approval. Store and show the approved commit. Effort: Large.
  - **F.** Give each workspace a trust choice. Add a settings scope, permissions, and rules for automation run workspaces. Effort: Large.
- **Left out:** Loading org skills without files breaks the skill-folder requirement. A custom parser or patched Claude build still needs maintenance when Claude changes. A pointer-only skill body still depends on generated text. A Skill-tool hook misses other invocation paths. The SDK exposes no text-only skill-folder source.
- **Wider fix:** C uses the native restriction for an untrusted source. Trusted execution follows an explicit repository choice.
- **Previous examples:** Review findings 101 and 301 of the same branch, and the `!$ARGUMENTS` case of the 301 check.
- **Recommendation:** C, changed from B after the user's answer. It makes automatic execution an explicit choice for the configured repository.
- **Action:** ask the user, because the detailed design needs plan approval before implementation. The approach is answered.

## User answer and remaining work

On 2026-11-17, Cal chose a repository trust setting with explanatory help
text or a documentation link. He chose B when the source is untrusted.
This answer is option C above. It is conversation decision 403.

The proposed setting belongs beside the org Skills repository. Only an
admin changes that shared source today. Trust starts off and binds to the
named repository. Replacement or removal clears inherited trust. Trust
covers future updates. Changes apply at the next cloud-computer start or
resume, like changes to the skills source.

Store the name of the trusted repository. Trust applies only when it
matches the configured repository. On a save retry, a mismatched grant
saves the result as untrusted and returns that saved state. No new
rejection is needed. This is a proposed design for approval.

The native restriction also stops inline shell in workspace skills and
custom slash commands. It leaves the agent's ordinary shell tool
available. Agents can still choose to run commands suggested by a skill.
The restriction also applies when the saved source gives no skills.
The explanation must state these effects.

An active cloud computer can keep its old trust indefinitely. To revoke
trust there, stop and resume the workspace. Repository updates can arrive
within five minutes before that restart. Explain this timing in the guide.

Trusted Claude exports must preserve inline-shell body syntax. Merely
omitting the native restriction leaves the current helper filter active.
Trust does not allow hooks, MCP servers, settings, or executable metadata.
Codex behavior stays unchanged. With no org source, retain the existing
workspace behavior.

An independent options check kept C and added E and F on 2026-11-17.
It confirmed native coverage for added skill folders in Claude 2.1.318.
The SDK does not document this source separately under the flag. Keep
the helper filter as a backup for untrusted sources.

Implementation is pending. This record stays until the chosen behavior
is implemented and checked. It does not depend on a plan or review report.
