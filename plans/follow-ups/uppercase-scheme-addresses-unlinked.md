# Addresses with an uppercase scheme stay text

- **Severity:** Medium. **Likelihood:** Rare. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Fix after merge.
- **Added:** 2026-11-14, from `calummoore/riga-m3j3`, review round 2, finding 6.
- **Location:** `src/markdown/web-links.ts`, `barePattern` and the start test of `webAddressParts`. `src/chat/links/chat-tokens.ts`, the start test `text.startsWith('http', index)` in `tokens`. `src/chat/links/link-parts.ts`, `codePart`.
- **Reason:** Agents and members seldom write an uppercase scheme.

- **Terms:**
  - **Bare address:** a web address in chat text with no Markdown around it.
  - **Shared reader:** `src/markdown/web-links.ts`, which finds the addresses of chat text, the message field, and the mockups.
- **Background:**
  - Each `http` and `https` address in chat text is a link, as `docs/protocol/chat-links.md` says. The user chose this on 10 November 2026.
  - RFC 3986, section 3.1, makes a scheme case-insensitive. `webLink` uses the URL parser, so it accepts `HTTPS://`.
  - The bare address pattern `/https?:\/\/[^\s<>`]+/y` has no `i` flag. The two tokenizers test `startsWith('http')` before they call it.
- **Problem:** `HTTPS://github.com/acme/app/pull/2`, `Https://…`, `HTTP://localhost:3000/`, `<HTTPS://…>`, and an uppercase address alone in inline code stay text. `[PR #2](HTTPS://…)` is a link, because a Markdown address leaves the scheme to `webLink`.
- **Impact if no action:** Members copy such addresses into a browser by hand.
- **Root question:** How do valid HTTP addresses become links regardless of the case of their scheme?
- **Options:**
  - **A.** Make the pattern and both start tests case-insensitive. Effort: Small.
  - **B.** Put one case-insensitive start test in the shared reader, and make both tokenizers use it. Keep the start test in front of `bareAddressTokenAt` in `chat-tokens.ts`, because that function scans for the next `**`, and a call at every index costs time in the square of the text length. Add uppercase and mixed-case tests for bare text, `<…>`, inline code alone, and a sent message. Effort: Small.
  - **C.** Read a candidate at any scheme before `://`, and let the URL parser and the protocol check of `webLink` decide, as the file preview reads autolinks in `src/files/markdown/markdown-inline.ts`. Effort: Medium.
- **Left out:** A rule in `docs/protocol/chat-links.md` that only lowercase schemes count fails the goal that a member opens each address with one press. A linkify library such as `linkify-it` 5.0.0 reads no bracketed IPv6 host, so `http://[::1]:3000` would stop being a link. A rewrite of the text breaks the rule that a bare address shows as the text has it.
- **Wider fix:** C. The reader then has no case rule of its own.
- **Previous examples:** None found. On `main` before this change the old reader was lowercase only too, but only workspace chips depended on it.
- **Related:** `plans/follow-ups/bare-address-closing-bracket-cut.md` changes the same end of `bareAddressAt`. One change can apply both, with one test for both ends of a bare address.
- **Recommendation:** B. It accepts each spelling of `http` and `https` at Small effort, and one shared start test stops the tokenizers from drifting apart.
- **Action:** fix after merge, apply B, because uppercase schemes are unusual input.
