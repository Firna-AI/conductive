# Secret requests doc is past its length target

- **Severity:** Low. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Fix after merge.
- **Added:** 2026-11-20, from branch `calummoore/workspace-capability-prompts-issue-2daj`, finding 3 of the Milestone 2 report of the capability prompts work.
- **Location:** `docs/protocol/secret-requests.md`, the sections "Temporary values" at line 183 and "Mixed requests" at line 224.
- **Reason:** The split moves two sections that the capability prompts change does not touch, and it needs a new line in the protocol docs index.

- **Terms:**
  - **Protocol doc:** a file under `docs/protocol/` that holds the requirements and the decisions in force of one feature.
  - **Protocol docs index:** `docs/architecture/protocol-docs.md`, which lists each protocol doc and its linked pages.
  - **Temporary value:** a value that a member types for a secret name that the org has no secret for. It lasts 15 minutes or until its workspace is archived.
  - **Mixed request:** a secret request that names secrets of the org and names that the org has no secret for.
- **Background:**
  - The `documentation` skill targets about 250 lines for a protocol doc. It says that a change that touches a doc over the target splits it into linked pages. The always-on rules split a file only after 300 lines.
  - `docs/protocol/secret-requests.md` holds the two secret calls of the workspace tools, the requests, covered requests, the time limit, temporary values, mixed requests, what the chat shows, the exact-copy filter, and the end of a request. Its linked pages `docs/protocol/secret-late-answers.md` and `docs/protocol/secret-variables.md` already hold the late answers and the variable names.
  - The doc had 282 lines. The change that tells each agent the capabilities of its session added three lines, which say that the tool text tells the agent when to use each secret call. The doc now has 285 lines.
- **Problem:** The doc is past the length target, and the touch did not split it.
- **Impact if no action:** The doc keeps growing, and its rules get harder to find. A few more additions reach the limit of 300 lines.
- **Root question:** How does the secret requests doc get back near its length target?
- **Options:**
  - **A.** Move "Temporary values" and "Mixed requests", lines 183 to 234, to a new linked page, such as `docs/protocol/secret-temporary-values.md`. Keep a short section under each old heading that links to the new page. The links from `docs/protocol/secrets.md` line 40 and `docs/protocol/secret-variables.md` line 42 then keep working. Add the page to the protocol docs index under "Secret requests", and update the list of topics in the intro of the doc. Effort: Small.
  - **B.** Move "What the chat shows", "The exact-copy filter", and "The end of a request", lines 235 to 285, to a new linked page instead. More docs link to these sections, so more links need a short section or an update. Effort: Small.
- **Left out:** Shorter wording, because the rules forbid squeezing text to meet a limit.
- **Wider fix:** None. The `documentation` skill already sets the target.
- **Previous examples:** Commit 4ff3a95a2 split this doc once before, when it moved the variable names to `docs/protocol/secret-variables.md`. `plans/follow-ups/github-banner-doc-length.md` records the same choice for another long protocol doc.
- **Recommendation:** A. Temporary values and mixed requests form one topic, the requests that ask a member for a value, and only two docs link to them.
- **Action:** fix after merge, apply A, because the split moves sections that the capability prompts change does not touch.
