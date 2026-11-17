# Addresses with an uppercase scheme stay text

- **Severity:** Medium. **Likelihood:** Rare. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Fix after merge.
- **Added:** 2026-11-14, from `calummoore/riga-m3j3`, review round 2, finding 6. Updated on 2026-11-17 on branch `calummoore/output-summary-f7sm`, after the shared Markdown parser took over the agent messages and brought in `linkify-it` 6.1.0.
- **Location:** `src/markdown/web-links.ts`, `barePattern` and the start test of `webAddressParts`. `src/chat/links/chat-tokens.ts:124`, the start test `text.startsWith('http', index)` in `tokens`. `src/chat/markdown/answer-text.ts:60`, the start test `text.indexOf('http', at)` in `nextUnit`. `src/chat/links/link-parts.ts:26`, `codePart`.
- **Reason:** Agents and members seldom write an uppercase scheme.

- **Terms:**
  - **Bare address:** a web address in chat text with no Markdown around it.
  - **Shared reader:** `src/markdown/web-links.ts`, which finds the addresses of chat text, the message field, and the mockups.
- **Background:**
  - Each `http` and `https` address in chat text is a link, as `docs/protocol/chat-links.md` says. The user chose this on 10 November 2026.
  - RFC 3986, section 3.1, makes a scheme case-insensitive. `webLink` uses the URL parser, so it accepts `HTTPS://`.
  - The bare address pattern `/https?:\/\/[^\s<>`]+/y` has no `i` flag. The tokenizer of sent messages tests `startsWith('http')`, and the reader of agent messages tests `indexOf('http')`, before they call it.
  - Agent messages read Markdown links and addresses in angle brackets with the shared `markdown-it` parser, which leaves the scheme to `webLink`.
- **Problem:** `HTTPS://github.com/acme/app/pull/2`, `Https://…`, `HTTP://localhost:3000/`, and an uppercase address alone in inline code stay text. In a sent message, `<HTTPS://…>` stays text too. In an agent message it is now a link, through the parser. `[PR #2](HTTPS://…)` is a link in both, because a Markdown address leaves the scheme to `webLink`. A probe of 17 November 2026 confirmed the bare, the code, the angle, and the Markdown forms with `HTTPS://`.
- **Impact if no action:** Members copy such addresses into a browser by hand.
- **Root question:** How do valid HTTP addresses become links regardless of the case of their scheme?
- **Options:**
  - **A.** Make the pattern and both start tests case-insensitive. Effort: Small.
  - **B.** Put one case-insensitive start test in the shared reader, and make the tokenizer of sent messages and the reader of agent messages use it. Add uppercase and mixed-case tests for bare text, `<…>`, inline code alone, a sent message, and an agent message. Effort: Small.
  - **C.** Read a candidate at any scheme before `://`, and let the URL parser and the protocol check of `webLink` decide, as the shared parser reads an address in angle brackets. Effort: Medium.
  - **D.** Find bare addresses with `linkify-it` 6.1.0, which the app already loads as a dependency of `markdown-it`. With only `http` and `https` on, a probe of 17 November 2026 linked `HTTPS://github.com/acme/app/pull/2`, `Https://github.com/acme`, and `HTTP://localhost:3000/`. It also linked `http://[::1]:3000`. Cost: it reverses the rejection of a link library in `docs/protocol/chat-markdown.md`, so it needs the user's decision and a safety review. The end rules of the library then replace the end rule of `docs/protocol/chat-links.md`. Effort: Medium.
- **Left out:** A rule in `docs/protocol/chat-links.md` that only lowercase schemes count fails the goal that a member opens each address with one press. A rewrite of the text breaks the rule that a bare address shows as the text has it.
- **Wider fix:** C. The reader then has no case rule of its own.
- **Previous examples:** None found. On `main` before this change the old reader was lowercase only too, but only workspace chips depended on it.
- **Related:** `plans/follow-ups/bare-address-closing-bracket-cut.md` changes the end of `bareAddressAt`, and this item changes its start. One change can apply both, with one test for both ends of a bare address. Option D of this item is option B of that item: one `linkify-it` reader would fix both.
- **Recommendation:** B. It accepts each spelling of `http` and `https` at Small effort, and one shared start test stops the two readers from drifting apart.
- **Action:** fix after merge, apply B, because uppercase schemes are unusual input.
