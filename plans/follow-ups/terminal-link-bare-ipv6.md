# Terminal link recognition differs from acceptance

- **Severity:** Medium. **Likelihood:** Rare. **Effort:** Medium. **Confidence:** High. **Harder later:** No.
- **Kind:** Fix after merge.
- **Added:** 2026-11-13, from review findings 2 and 6 of branch `calummoore/delft-vl39` (terminal links).
- **Location:** `src/terminal/xtermLinks.ts` (the `WebLinksAddon`), `src/markdown/web-links.ts` (`bareAddressAt`).
- **Reason:** Only an IPv6 host with no port and no path, or an address that opens nothing, meets it, and the fix needs a link provider of the app.

- **Terms:**
  - **Link addon:** `@xterm/addon-web-links`, which finds web addresses in the terminal output.
  - **Shared address reader:** `src/markdown/web-links.ts`, which finds and sorts addresses for the chat, and sorts them for the terminal.
- **Background:** Each `http` and `https` address in the terminal is a link, as `docs/protocol/workspace-tools.md#terminal` says. The link addon never ends an address with `]`.
- **Problem:**
  - `http://[::1]`, `https://[2001:db8::1]`, and any other IPv6 host with no port and no path are not links. `http://[::1]:8080` and `http://[::1]/` work. The chat reader drops a final `]` too (finding 2).
  - An address that opens nothing, such as `https://user:pw@example.com/` or an app address that is no page, still gets the xterm.js underline and pointer, because the addon gives it to xterm.js before the app checks it (finding 6).
  - An OSC 8 link with such an address also gets the underline and pointer. xterm.js 6 always decorates OSC 8 links, with no public way to turn it off.
- **Impact if no action:** The user copies an IPv6 address by hand, and sees links that open nothing.
- **Root question:** How can each terminal link look openable exactly when it can open?
- **Options:**
  - **A.** Give the addon a `urlRegex` that keeps the `]` of an IPv6 host. Add a case through written output. Effort: Small.
  - **B.** One terminal link provider (`registerLinkProvider`) that finds candidates, checks them with `terminalLink`, and gives their ranges. Effort: Medium.
  - **D.** Fix `bareAddressAt` for IPv6 hosts and build the provider of B on `webAddressParts(text, false)`, so chat and terminal share one recognizer. Needs the wrapped-row mapping of B. Effort: Medium.
  - **C.** Wrap the addon's provider: pass a terminal whose `registerLinkProvider` drops each link that `terminalLink` refuses to `addon.activate`. Fixes finding 6 for bare addresses only. Risk: undocumented addon behaviour. Effort: Small.
  - **E.** For OSC 8 links, propose an acceptance callback or per-link decorations upstream in xterm.js, and adopt the release. Effort: Large.
- **Left out:** An upstream fix of the addon: A does the same with its documented option. Dropping IPv6: it breaks the local host rule.
- **Wider fix:** D. One recognizer for chat and the terminal.
- **Previous examples:** None found.
- **Related:** `plans/follow-ups/terminal-link-press-rule.md` changes the same file. `plans/follow-ups/terminal-links-to-the-app.md` decides which app addresses open; B and D follow its answer through `terminalLink`.
- **Recommendation:** D, once the chat links branch is on `main`, by copying the wrapped-row mapping of the addon under its MIT licence. Add E for OSC 8 links. A and C are valid small steps before that.
- **Action:** fix after merge, apply D and E, because the cases are rare and D changes the shared reader of the chat links work.
