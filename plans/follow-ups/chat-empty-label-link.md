# A Markdown link with an empty label shows nothing

- **Severity:** Low. **Likelihood:** Rare. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Needs decision.
- **Added:** 2026-11-13, from `calummoore/riga-m3j3`, the implementation of links in chat text.
- **Location:** `src/chat/links/chat-parts.ts`, the Markdown link step. `src/markdown/web-links.ts`, `readsAsAddress`. `docs/protocol/chat-links.md`, "Bare addresses and Markdown links".
- **Reason:** The fix adds a rule that no requirement covers, and it touches the open question of how a reader sees where a label link leads.

- **Terms:**
  - **Label link:** a Markdown link of an answer that shows as its label. The user chose this on 10 November 2026.
  - **Label test:** the check that shows the real address in place of a label that reads as an address, with `://` or a leading `www.`.
- **Background:**
  - Sandbox code can shape agent text, so a label can lie about where its link leads.
  - The label test removes code marks, bold marks, invisible characters, and end spaces before it tests a label.
  - The mockups and the file preview draw an empty label as an empty link too.
- **Problem:** A label that shows nothing, such as `[](https://x.example)`, `[**](https://x.example)`, or a label of invisible characters only, gives a link with no visible words. A pointer cannot reach it. The keyboard can focus it.
- **Impact if no action:** Keyboard and screen reader users meet a link that nobody can see.
- **Root question:** What does a reader see for a link whose label shows nothing?
- **Options:**
  - **A.** Keep the empty link. Effort: Small.
  - **B.** Treat a label that shows nothing as a label that reads as an address, and show the real address. Add the rule to the label test and to `docs/protocol/chat-links.md`. Effort: Small.
  - **C.** Show such a link as typed, with its brackets. Cost: raw Markdown shows. Effort: Small.
- **Left out:** Remove the link. The address then leaves the text, which breaks the rule that each address of chat text is a link.
- **Wider fix:** B. One label test then covers each label that cannot show where its link leads.
- **Previous examples:** None found. The file preview behaves the same.
- **Related:** The open question of how a reader sees where a label link leads, decision 5 of `plans/pressable-chat-links.md`, sets the label rules.
- **Recommendation:** B. The reader then always sees where the link leads.
- **Action:** ask the user, because B adds a rule that no requirement covers.
