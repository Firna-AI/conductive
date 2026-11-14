# Typed Markdown links lose the escapes of their address

- **Severity:** Medium. **Likelihood:** Rare. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Fix after merge.
- **Added:** 2026-11-14, from `calummoore/riga-m3j3`, review round 2, finding 5, and its check.
- **Location:** `src/chat/links/chat-tokens.ts`, `markdownLinkAt`. `src/chat/links/chat-parts.ts`, the fallback that shows a Markdown link as typed, and `addAddress`. `src/markdown/markdown-destination.ts`, `angleEnd`. `src/chat/agent-text.md`, the sentence that says the address "reads as a bare address".
- **Reason:** Only a backslash escape inside a Markdown address meets the bug, and members and agents seldom write one.

- **Terms:**
  - **Shared destination reader:** `readMarkdownAddress` in `src/markdown/markdown-destination.ts`. The chat and the file preview read each Markdown address with it. It decodes backslash escapes, such as `\(`, and gives the source offsets of the address.
  - **Typed link:** a Markdown link that chat text shows as typed: each Markdown link of a sent message, the Markdown of an image, and a Markdown link whose address stays text.
- **Background:**
  - `docs/protocol/chat-links.md` says that a sent message shows a Markdown link as typed, as the member typed it, and its address is a link.
  - The link must open the decoded address. Without the decoding, the URL parser turns each `\` into `/`.
  - The tokenizer keeps only the decoded address as `href`. The typed fallback shows that `href` as the words of the address.
- **Problem:**
  - `[Wiki](https://example.com/a\(b\))` in a sent message shows as `[Wiki](https://example.com/a(b))`. Answers lose the escapes of an image, such as `![pic](https://example.com/a\(b\).png)`, and of a link whose address stays text.
  - `angleEnd` stops at an escaped `\>`. So `[x](<https://example.com/a\>b>)` links `https://example.com/a\`, which opens `https://example.com/a/`.
- **Impact if no action:** The shown text differs from the sent text, and a copy gives the changed words. An escaped `>` in an angle address opens another page.
- **Root question:** How does text that shows Markdown as typed keep each address exactly as typed, while its link opens the decoded address?
- **Options:**
  - **A.** Take the address source back from the token source and its offsets in the fallback. Effort: Small.
  - **B.** Keep the address source beside the decoded address in the link token, from the offsets that the shared reader already returns. Show the source in the typed fallback of `chat-parts.ts`, so answers get the fix too. Skip an escaped `>` in `angleEnd`, as CommonMark does. Add regression cases for a sent message, an answer image, an answer link whose address stays text, and an escaped `>`. Update `src/chat/agent-text.md`. Effort: Small.
  - **C.** Draw each typed link from its source spans, apart from the label path. Effort: Medium.
- **Left out:** Stop the decoding: the link then opens another page again. Show the decoded address and change the doc: it breaks the rule that a sent message shows as typed. Read the typed Markdown again as bare addresses, as the mockups do: a label with a `]` in code then reads the raw address, which opens another page.
- **Wider fix:** B. The token then holds both forms, and no consumer derives the source again.
- **Previous examples:** None found. The decoding came with the shared destination reader on 14 November 2026.
- **Related:** `plans/follow-ups/chat-markdown-link-title.md`: a Markdown link with a title reads as a bare address that keeps its escapes, so `[docs](https://example.com/a\(b\) "Docs")` opens `https://example.com/a/(b/)`. Its option B removes that case.
- **Recommendation:** B. It removes the only path where a decoded address becomes shown text, at Small effort.
- **Action:** fix after merge, apply B, because only an unusual input meets the bug.
