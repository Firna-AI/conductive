# Several guides exceed the file length target

- **Severity:** Low. **Effort:** Medium. **Confidence:** High. **Harder later:** No.
- **Kind:** Outside the scope.
- **Added:** 2026-11-10, during documentation integration on `calummoore/github-status-bar-actions`.
- **Location:** `docs/deployment.md` and `image/README.md`.
- **Reason:** These long guides are unchanged by the pull request action diff. Their structure needs a separate documentation change.

- **Terms:**
  - **Pointer section:** A retained heading with a link to content moved to another page. It keeps an existing anchor valid.
- **Background:** The repository asks agents to keep files near 200 lines and split files that pass 300. These guides combine several topics. The deployment guide already passed 300 lines before the latest main integration. Main's provider-account work grew the sandbox guide from 219 to 304 lines. Its computer ledger work grew the member guide from 299 to 303 lines. Its software-image work grew the image guide past the target.
- **Problem:** `docs/deployment.md` has 405 lines and `image/README.md` has 302. Captured main `6fd184c53e77dee208687512244ebcaf5fa120e9` shortened the sandbox guide to 251 lines and the member guide to 273. Those two observations are closed. The file-length rule of `npm run lint` checks JavaScript, TypeScript, and Astro files, so it does not report these Markdown files.
- **Impact if no action:** Readers must scan long guides. New changes must maintain several topics in each file. The files remain above the repository target.
- **Root question:** How can these guides stay short while keeping their facts and working links?
- **Options:**
  - **A.** Move cohesive topics to linked guides. Keep each current fact and each useful heading as a pointer section. Check all relative links and inbound anchors. Effort: Medium.
- **Left out:** Dropping live content loses facts. Compacting lines does not improve the guides and breaks the file-length rule. A new Markdown gate would require approval and would not split the content.
- **Wider fix:** Already in force. The documentation skill gives content homes, short pages, and pointer sections. No new gate or test is needed.
- **Previous examples:** Main shortened `src/app/README.md` through `key-code.md`. It split mockup design into `design-chat.md` and `design-operator.md`, and the catalogue into `catalogue-operator.md`. It split `src/marketing/README.md` into linked picture, legal, comparison, and authoring guides. It also split `worker/operator/README.md` into overview, waitlist, and test guides. Those five earlier overlong-guide observations are closed. `docs/architecture/components.md` and `worker/chat/access.md` also preserve content moved from parent guides.
- **Recommendation:** A. It preserves the documentation while giving each topic a shorter home.
- **Action:** fix after merge, apply A, because the existing long-guide structure is outside the pull request action diff.

The deployment guide holds model configuration, runner and software-image deployment, and error tracking. The sandbox guide holds provider-account configuration and routing. Main added ledger cleanup facts to the member guide and shared software-image facts to the image guide. Read every guide and its linked pages before choosing a split.

Keep requirements in protocol docs, component responsibilities in architecture docs, and code entry points in area READMEs. Preserve deployment setup, provider routing, public-text rules, and existing anchors. Do not add tests of prose or a stricter gate. Check changed Markdown links and inbound anchors after each move.
