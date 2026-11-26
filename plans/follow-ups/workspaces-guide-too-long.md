# The Workspaces guide passes the length target

- **Severity:** Low. **Effort:** Medium. **Confidence:** High. **Harder later:** No.
- **Kind:** Fix after merge.
- **Added:** 2026-11-16, from the branch `calummoore/perth-siol` (the repository change of a workspace). Updated on 2026-11-26 by branch `calummoore/needs-input-at-the-composer-milestones-3-j8a8`, which grew the guide again, from the finding check of review finding 92 of its round 2.
- **Location:** `src/marketing/docs/workspaces.md`.
- **Reason:** A split changes the guide pages and the navigation of the public docs, which is a change of its own.

- **Terms:**
  - **Public guide:** a Markdown page under `src/marketing/docs/` that the marketing site shows under Docs.
- **Background:** The repository asks agents to keep files near 200 lines and to split a file that passes 300. The lint rule checks only JavaScript, TypeScript, and Astro files, so it does not report Markdown guides. The Workspaces guide had 331 lines before the repository change. That change added a section "Change the repository", and the guide then had about 378 lines. On 26 November 2026, it has 548 lines at `main` commit `0b04e4d54`, and the needs-input change takes it to 553. Its sections "Continue after a merge" and "Change the repository" start at lines 374 and 411.
- **Problem:** The guide passes the length target of the repository.
- **Impact if no action:** Readers and agents must read one long page. Each later feature makes it longer.
- **Root question:** How should the Workspaces guide be split so that each page stays near the target?
- **Options:**
  - **A.** Move one large topic, such as Continue and the repository change, to its own guide page, and link to it from the Workspaces guide. Effort: Medium.
  - **B.** Split the guide into two or three pages by the life of a workspace: create and work, after the merge, and archive and restore. Effort: Medium.
  - **C.** Keep the page, and shorten its sentences. Effort: Small. It may not reach the target.
- **Left out:** A change of the lint rule to check Markdown, because it is a new gate that needs the user's approval.
- **Wider fix:** None. `plans/follow-ups/shorten-existing-guides.md` covers other long guides.
- **Previous examples:** `plans/follow-ups/shorten-existing-guides.md`.
- **Related:** `plans/follow-ups/shorten-existing-guides.md` also holds two long public guides, `src/marketing/docs/security.md` and `src/marketing/docs/sessions-and-chat.md`. One branch can split the three public guides together, because each split changes the navigation of the public docs.
- **Recommendation:** A. One new page keeps the navigation simple and removes the largest topic.
- **Action:** fix after merge, apply A, because the split changes the navigation of the public docs, which this change does not cover.
