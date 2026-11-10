# Several guides exceed the file length target

- **Severity:** Low. **Effort:** Medium. **Confidence:** High. **Harder later:** No.
- **Kind:** Outside the scope.
- **Added:** 2026-11-10, during documentation integration on `calummoore/github-status-bar-actions`.
- **Location:** `src/app/README.md`, `docs/mockups/design.md`, `docs/mockups/catalogue.md`, and `docs/deployment.md`.
- **Reason:** These guides already exceeded 300 lines before the pull request action change. Their structure needs a separate documentation change.

- **Terms:**
  - **Pointer section:** A retained heading with a link to content moved to another page. It keeps an existing anchor valid.
- **Background:** The repository asks agents to keep files near 200 lines and split files that pass 300. These four guides combine several topics. Each guide already passed 300 lines at the common base before the pull request action change.
- **Problem:** After integration, `src/app/README.md` has 402 lines. `docs/mockups/design.md` has 400. `docs/mockups/catalogue.md` has 367. `docs/deployment.md` has 360. Their common-base lengths were 387, 360, 330, and 327. The current file-length command checks JavaScript, TypeScript, and Astro files, so it does not report these Markdown files.
- **Impact if no action:** Readers must scan long guides. New changes must maintain several topics in each file. The files remain above the repository target.
- **Root question:** How can these guides stay short while keeping their facts and working links?
- **Options:**
  - **A.** Move cohesive topics to linked guides. Keep each current fact and each useful heading as a pointer section. Check all relative links and inbound anchors. Effort: Medium.
- **Left out:** Dropping live content loses facts. Compacting lines does not improve the guides and breaks the file-length rule. A new Markdown gate would require approval and would not split the content.
- **Wider fix:** Already in force. The documentation skill gives content homes, short pages, and pointer sections. No new gate or test is needed.
- **Previous examples:** `docs/architecture/components.md`, `docs/protocol/workspace-life.md`, and `worker/chat/access.md` preserve content moved from their parent guides.
- **Recommendation:** A. It preserves the documentation while giving each topic a shorter home.
- **Action:** fix after merge, apply A, because the existing long-guide structure is outside the pull request action diff.

Read each guide and its linked pages before choosing its split. Keep requirements in protocol docs, component responsibilities in architecture docs, and code entry points in area READMEs. Preserve the mockup catalogue paths and the deployment setup facts. Do not add tests of prose or a stricter gate. Check changed Markdown links and the inbound anchors after the move.
