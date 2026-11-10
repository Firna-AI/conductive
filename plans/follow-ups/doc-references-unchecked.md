# No check finds broken doc references

- **Severity:** Low. **Effort:** Medium. **Confidence:** High. **Harder later:** No.
- **Kind:** Fix after merge.
- **Added:** 2026-11-10, the blocked wider fix of finding 101 of round 3 of the final review of branch `conductor/model-gateway-worker-model-proxy-decision-120`. The user answered it as item 15 of that review on the same day.
- **Location:** The `check` script in `package.json`. A new Node script, such as one under `tools/`. The rule on Markdown links under "Repository rules" in `AGENTS.md`, and the "Complete gate" line under "Commands" in the same file. The `npm run check` row of the command table in `README.md`.
- **Reason:** On 10 November 2026 the user chose to add this check after the merge of the model gateway branch, not in that branch.

- **Terms:**
  - **Live content:** text that states the current state. `docs/` and every `README.md` are live. In an active plan, completed milestones and checked TODOs are history, and the rest is live. In a completed plan, only open findings and unchecked post-merge tasks are live.
  - **Relative link:** a Markdown link to a path in the repository, with or without a heading anchor.
  - **Heading anchor:** the part of a link after `#`. It names a heading by GitHub's slug rules: lower case, a hyphen for each space, and most punctuation removed.
  - **Doc path in code:** a path that starts with `docs/protocol/` or `docs/architecture/`, in a file that is not Markdown, such as a code comment.
- **Background:**
  - A rule under "Repository rules" in `AGENTS.md` says: "Prettier ignores Markdown and `plans/`, and no command checks the links in Markdown. Check each relative link of a changed Markdown file yourself."
  - Protocol pages move often. A split moves sections to new pages and leaves stub sections. A merge of `main` brings the splits of other branches.
  - Code comments cite protocol pages by path, for example in `src/chat/components/WorkFold.tsx`, `src/shared/session-title.ts`, and `src/shell/workspace/tools/tool-address.ts`. Mockup entries name pages in `relatedDocs`.
  - On 10 November 2026 a review found that `src/chat/components/WorkFold.tsx` cited `docs/protocol/messages-and-turns.md`. A branch had moved the citation to that page, which its own doc split made. A merge of `main` then deleted the page and kept the citation. The line merged without a conflict, so the merge did not show it. The fix restored the citation of `docs/protocol/chat-and-events.md`.
  - On the same day, the 295 Markdown files outside the top-level plan files held 2,073 relative links, and each one resolved. Five code files held a doc path, and each one resolved.
  - `docs/protocol/workspace-links.md` shows a Markdown link to a workspace inside inline code, with the target `<link>`. A simple link pattern reads it as a link to a missing file.
  - A section name in plain text is not a link, for example a Location line that names a section. A link check does not see it.
  - On 10 November 2026, an integration check found a broken link already present at `df93a191`.
    `docs/protocol/file-mentions.md:24` links to `access-and-security.md#secrets-that-users-enter`.
    The heading lives in `tokens-and-secrets.md`.
    The baseline repair must change the target to `tokens-and-secrets.md#secrets-that-users-enter`.
    The routines change at `d39e64eb` later corrected that target.
    This remains an example of a reference error that the proposed check would find.
- **Problem:** No command finds a relative link to a missing page or heading, or a doc path in code that names a missing page. Agents check links by hand, and a merge can miss a citation on a line that it does not change.
- **Impact if no action:** A reader follows a link or a citation to a page or a heading that does not exist, and cannot find the requirement.
- **Root question:** How does the repository find each reference to a doc page or a heading that no longer exists?
- **Options:**
  - **A.** Keep the manual rule of `AGENTS.md`. Cost: it depends on each agent, and a merge that does not change the line of a citation shows nothing to check. Effort: Small.
  - **B.** Add a reference check to `npm run check`. It fails on a relative link in live content that names a missing page or heading. It also fails on a doc path in code that names a missing page. It skips fenced code, inline code, links with a scheme, and history content. The same change replaces the rule of `AGENTS.md` with a sentence that names the check. It also adds the check to the gate descriptions in `AGENTS.md` and `README.md`. Cost: a new gate step, and each failure blocks a pull request until its reference is fixed. Effort: Medium.
  - **C.** Widen the search for removed and renamed names in the shared `git-commit` skill to every tracked file. The skill now searches `docs/`, `plans/`, and every `README.md`. The change lives in the shared skills repository `futex-ai/skills`. Cost: it still depends on each agent, and it finds only the names that the change itself removes, not those that a merge removes. Effort: Small.
- **Left out:**
  - A check of external links, because it needs the network, which makes the gate flaky. The goal covers only references inside the repository.
  - A check of section names in plain text, because no pattern tells a section name from other words.
- **Wider fix:** B, a detection fix for the class.
- **Previous examples:** The citation in `src/chat/components/WorkFold.tsx`, which the background describes.
- **Related:** None.
- **Recommendation:** B. It finds each broken link and code citation in the gate, with no manual step.
- **Action:** fix after merge, apply B, because the user chose on 10 November 2026 to add this check after the merge of the model gateway branch.
- **Answer:** On 10 November 2026, the user chose B, after the merge of the model gateway branch, and approved the new gate.
- **Evidence update, 2026-11-10:** a link check of the merge of `main` at `08cbe3cd` into branch `calummoore/workspace-archive-error` found two relative links on `main` that name a missing heading. The check left out inline code and code blocks.
  - `docs/protocol/file-mentions.md` links `access-and-security.md#secrets-that-users-enter`. That heading is in `docs/protocol/tokens-and-secrets.md`.
  - `docs/protocol/terminal-previews-and-desktop.md` links `../architecture.md#sandbox-software`. That heading is in `docs/architecture/components.md`.
  - Both links are broken on `main` itself, not because of that merge. This note fixes neither. Option B of this item would find both.
