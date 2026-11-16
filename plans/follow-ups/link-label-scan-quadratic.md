# Long lines of brackets slow the chat link scan

- **Severity:** Medium. **Likelihood:** Rare. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Outside the scope.
- **Added:** 2026-11-16, from `calummoore/riga-m3j3`, while applying the link title answer.
- **Location:** `src/chat/links/chat-tokens.ts`, `markdownLinkAt`. `src/markdown/web-links.ts`, `webAddressParts`.
- **Reason:** The same scan is on `main`, so its fix serves every branch.

- **Terms:**
  - **Label scan:** the search for the `]` that ends the label of a Markdown link, which starts at each `[` of chat text.
- **Background:** The chat reads links from the text in the browser, on the main thread, at each update of an answer. The message field and the mockups read the same way through `webAddressParts`.
- **Problem:** The label scan starts again at each `[` and runs to the end of its line. A line of 80,001 `[` took 6,024 ms on the main thread on 16 November 2026. Sandbox code can shape agent text, so it can write such a line.
- **Impact if no action:** One such answer freezes the tab for seconds at each update.
- **Root question:** How does the chat read the labels of a line in time that grows with the line, not with its square?
- **Options:**
  - **A.** Stop the label scan after a fixed length, as the file preview limits an address to 2,000 characters. Effort: Small.
  - **B.** Find the end of each label once per line, with one pass that pairs `[` and `]` outside code, and reuse the result for each `[`. Effort: Small.
  - **C.** Read chat text with the inline parser of the file preview. Cost: a larger change of the chat reader. Effort: Medium.
- **Left out:** Read links in a worker. It moves the cost, and the tab still waits for the links.
- **Wider fix:** B. Each `[` then costs constant time after one pass.
- **Previous examples:** The label scan of `chatParts` on `main` has the same cost. The link title answer of 16 November 2026 fixed the same cost for the target reading.
- **Recommendation:** B. It keeps every label rule and removes the square cost.
- **Action:** fix after merge, apply B, because the same scan is on `main`.
