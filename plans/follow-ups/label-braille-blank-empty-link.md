# A label of Braille blanks gives an empty link

- **Severity:** Low. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Needs decision.
- **Added:** 2026-11-16, from `calummoore/riga-m3j3`, while applying the user's answer that a label that shows nothing shows the real address.
- **Location:** `src/markdown/web-links.ts`, `labelHidesAddress`. `docs/protocol/chat-links.md`, "Bare addresses and Markdown links".
- **Reason:** The fix changes the definition of invisible characters in a protocol doc, and no recorded decision covers it.

- **Terms:**
  - **Label test:** `labelHidesAddress`, the check that shows the real address in place of a Markdown label of an answer.
  - **Default ignorable code point:** a Unicode character that fonts draw as nothing, such as a zero-width space. `docs/protocol/chat-links.md` calls these "invisible characters".
- **Background:**
  - In an answer, a Markdown link shows as its label. Sandbox code can shape agent text, so a label can hide where its link leads.
  - On 16 November 2026 the user chose that a label that shows nothing shows the real address.
  - Before it tests a label, the label test removes code marks, bold marks, invisible characters, and the spaces at the ends.
- **Problem:** U+2800, the Braille pattern blank, is not a default ignorable code point and not a space. Fonts draw it as an empty cell. So `[⠀](https://x.example)` still gives a link with no visible words.
- **Impact if no action:** Sandbox code can make a link that the keyboard can focus and nobody sees. Its tooltip still gives the address.
- **Root question:** Which characters show nothing in a label?
- **Options:**
  - **A.** Keep the definition: the default ignorable code points. Effort: Small.
  - **B.** Also count U+2800 as an invisible character, in `labelHidesAddress` and in `docs/protocol/chat-links.md`. Add a test case. Cost: a font can still draw another character as blank. Effort: Small.
  - **C.** Treat each label with no letter and no number as a label that shows nothing. Cost: honest labels such as "→" or "✓" then show the address. Effort: Small.
- **Left out:** Measure the drawn width of each label. The readers run without a page layout.
- **Wider fix:** None. Each rule names a fixed set of characters, and a font can draw any character as blank.
- **Previous examples:** None found.
- **Recommendation:** B. It closes a blank character that people often use for empty names, and it changes no honest label.
- **Action:** ask the user, because B changes the definition of invisible characters in a protocol doc, and no recorded decision covers U+2800.
