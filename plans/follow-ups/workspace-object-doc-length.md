# The workspace object page passes 300 lines

- **Severity:** Low. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Outside the scope.
- **Added:** 2026-11-24, from branch `calummoore/own-computers-milestone-8-builds-over-ef32`, Milestone 8 of the own computers plan.
- **Location:** `worker/lifecycle/workspace-object.md:172-334`
- **Reason:** The page had 405 lines before the branch that found it, and that branch changed only one sentence of it.

- **Source:** Implementation.
- **Category:** Repository rule.
- **Terms:**
  - **Pointer section:** a heading that keeps an existing anchor and links to content that moved to another page.
- **Background:**
  - `worker/lifecycle/workspace-object.md` is a page of the lifecycle README. It describes the Durable Object of each workspace and of each image coordinator.
  - It has 406 lines. Its largest section is "Creates and resumes", lines 172-334, about 163 lines. The other sections are "Start step records", "The git credential sender", "Turn recovery", "The shown state", and the sections before line 172.
  - The always-on rules say: keep files short, target about 200 lines, and split a file that passes 300.
  - Eight links in seven files point to `workspace-object.md#creates-and-resumes`. Search `worker/`, `docs/`, and `plans/` for that anchor to find them.
  - The Milestone 8 branch split `worker/lifecycle/image-builds.md` and `worker/lifecycle/README.md` in the same way, into the pages `build-machine.md`, `refresh-timers.md`, and `stop-time.md`.
- **Problem:** The page passes 300 lines.
- **Impact if no action:** The page stays long and slow to read. Each change to it meets the same rule.
- **Root question:** How does the workspace object page get under 300 lines, with every inbound link still working?
- **Options:**
  - **A.** Move "Creates and resumes" word for word to a new page, such as `worker/lifecycle/creates-and-resumes.md`. Leave a pointer section in its place. Update the inbound links, or keep them working through the pointer section. Add the page to the page list of the lifecycle README. The page then has about 247 lines. Effort: Small.
- **Left out:** Only one approach meets the goal, because only that section is long enough. Moving the smaller sections: together they cannot bring the page under 300 lines. Cutting sentences: the page must describe the current code. Changing nothing: the page stays over the limit.
- **Wider fix:** None. The always-on rules already give the length rule. A length lint for Markdown would be a new gate that only the user can add.
- **Previous examples:** The Milestone 8 split of `image-builds.md` and the lifecycle README. `plans/follow-ups/service-adjacent-doc-length.md` records the same class for other pages.
- **Recommendation:** A. One move brings the page well under the limit.
- **Action:** fix after merge, apply A, because the page passed 300 lines before this branch, and the split reaches seven files that the branch does not change.
