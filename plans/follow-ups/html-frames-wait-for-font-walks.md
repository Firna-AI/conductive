# HTML frames each wait for one font walk

- **Severity:** Low. **Likelihood:** Rare. **Effort:** Medium. **Confidence:** Medium. **Harder later:** No.
- **Kind:** Fix after merge.
- **Added:** 2026-11-23, from `calummoore/fonts-loading-issue-kjto`, a new problem of review finding 3.
- **Location:** `crates/cnd-runner/src/file_server/font_files.rs:64`, `crates/cnd-runner/src/file_server/policy.rs:131`.
- **Reason:** The cost is about 1 ms for each HTML reply with the fonts of the default image, so it hurts only pages with many frames or cloud computers with large font sets.

- **Terms:**
  - **Files preview:** the private web address that shows an HTML file of a workspace and the files that it loads, served by the runner's file server on port 7683.
  - **Font walk:** the scan of `/usr/share/fonts` and `/usr/local/share/fonts` that builds the font stylesheet at `/__conductive/system-fonts.css`.
- **Background:** Each HTML reply of the files preview adds a link to the font stylesheet only when that stylesheet has a rule. So each HTML request, also a `HEAD` request and a 304, runs one font walk under one lock. A warm walk lists each folder and checks the metadata of each font, and reads only the changed fonts. With 97 fonts in 22 folders, a walk takes about 1 ms. CSS and SVG replies do not walk.
- **Problem:** A page with many HTML frames, or a burst of HTML requests, waits for one full walk for each request, one after the other. The cost grows with the number of fonts.
- **Impact if no action:** Pages with many frames load more slowly on cloud computers with large font sets.
- **Root question:** How does each HTML reply learn whether the font stylesheet has a rule, at a low cost, while a new font still shows at the next page load?
- **Options:**
  - **A.** Let the requests that arrive during a walk share one new walk after it. Each request still reads the fonts after it arrives. Effort: Medium.
  - **B.** Answer from one font that gave a rule at the last walk, while its real path and version stay the same. Walk only when that check fails. Effort: Medium.
  - **C.** Add the link to each HTML page whose start the scan can classify, also when the stylesheet has no rule. No HTML reply then needs the fonts. This changes the protocol rule that a page gets no link when the stylesheet has no rule, so it needs a user decision. Effort: Small.
- **Left out:** A time-based cache breaks the rule that a new font shows at the next load.
- **Wider fix:** C, because no reply body then depends on the font folders.
- **Previous examples:** Review finding 3 of the same branch, which removed the walk from CSS and SVG replies.
- **Related:** None.
- **Recommendation:** B. It keeps the protocol and makes the common case a few system calls.
- **Action:** fix after merge, apply B, because the cost is small today and the fix needs its own cache tests.
