# Bare IPv6 addresses are not terminal links

- **Severity:** Medium. **Likelihood:** Rare. **Effort:** Medium. **Confidence:** High. **Harder later:** No.
- **Kind:** Fix after merge.
- **Added:** 2026-11-13, from review finding 2 of branch `calummoore/delft-vl39` (terminal links).
- **Location:** `src/terminal/xtermLinks.ts` (the `WebLinksAddon`), `src/markdown/web-links.ts` (`bareAddressAt`).
- **Reason:** Only a server that prints an IPv6 host with no port and no path meets it.

- **Terms:**
  - **Link addon:** `@xterm/addon-web-links`, which finds web addresses in the terminal output.
  - **Shared address reader:** `src/markdown/web-links.ts`, which finds and sorts addresses for the chat, and sorts them for the terminal.
- **Background:** Each `http` and `https` address in the terminal is a link, as `docs/protocol/workspace-tools.md#terminal` says. The link addon never ends an address with `]`.
- **Problem:** `http://[::1]`, `https://[2001:db8::1]`, and any other IPv6 host with no port and no path are not links. `http://[::1]:8080` and `http://[::1]/` work. The chat reader drops a final `]` too.
- **Impact if no action:** The user copies such an address by hand, or adds a slash.
- **Root question:** How can every accepted terminal address with an IPv6 host become an openable link?
- **Options:**
  - **A.** Give the addon a `urlRegex` that keeps the `]` of an IPv6 host. Add a case through written output. Effort: Small.
  - **B.** One terminal link provider (`registerLinkProvider`) that finds candidates, checks them with `terminalLink`, and gives their ranges. Effort: Medium.
  - **D.** Fix `bareAddressAt` for IPv6 hosts and build the provider of B on `webAddressParts(text, false)`, so chat and terminal share one recognizer. Needs the wrapped-row mapping of B. Effort: Medium.
- **Left out:** An upstream fix of the addon: A does the same with its documented option. Dropping IPv6: it breaks the local host rule.
- **Wider fix:** D. One recognizer for chat and the terminal.
- **Previous examples:** None found.
- **Related:** `plans/follow-ups/terminal-link-press-rule.md` changes the same file. A provider of B or D also shows no underline for an address that opens nothing.
- **Recommendation:** D, once the chat links branch is on `main`. A is a valid small fix before that.
- **Action:** fix after merge, apply D, because the case is rare and D changes the shared reader of the chat links work.
