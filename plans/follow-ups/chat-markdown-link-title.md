# Chat shows a Markdown link with a title as typed

- **Severity:** Low. **Likelihood:** Rare. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Needs decision.
- **Added:** 2026-11-14, from `calummoore/riga-m3j3`, review round 1, a check of finding 1.
- **Location:** `src/chat/links/chat-tokens.ts`, `markdownLinkAt`. `docs/protocol/chat-links.md`, "Bare addresses and Markdown links".
- **Reason:** No requirement says whether a link title counts in chat text, so the user decides.

- **Terms:**
  - **Label link:** a Markdown link of an answer that shows as its label. The user chose this on 10 November 2026.
  - **File preview:** the Files view that shows a Markdown file of the branch as formatted text.
  - **Link title:** the quoted text after the address of a Markdown link, as in `[docs](https://example.com/a "Docs")`.
- **Background:**
  - In an answer, a Markdown link shows as its label. Its address is the link.
  - The file preview reads a link title, and shows the link as its label.
  - Chat text reads no title. So in an answer, `[docs](https://example.com/a "Docs")` shows as typed, with its brackets.
- **Problem:** The same Markdown shows as a label in the file preview and as raw text in the chat. No protocol line says which is right for the chat.
- **Impact if no action:** Agents that write a link title show raw Markdown in an answer.
- **Root question:** How does chat text show a Markdown link that has a title?
- **Options:**
  - **A.** Keep it as typed. Its address stays a link as a bare address. Effort: Small.
  - **B.** Read the title as the file preview does, and show the link as its label. Drop the title, because the title of a link gives its real address. Add the rule to `docs/protocol/chat-links.md`. Effort: Small.
  - **C.** Do B, and show the title after the label. Cost: more text, and untrusted text in a new place. Effort: Small.
- **Left out:** Use the link title as the tooltip. The tooltip gives the real address, so that a label cannot hide where it leads.
- **Wider fix:** B. One reader then serves both views with one syntax.
- **Previous examples:** None found.
- **Recommendation:** B. The chat and the file preview then read the same Markdown the same way.
- **Action:** ask the user, because B adds a rule at the boundary that no requirement covers.
