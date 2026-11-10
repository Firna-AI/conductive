# Parts of a known credential pass the output filter

- **Severity:** High. **Effort:** Medium. **Confidence:** Medium. **Harder later:** No.
- **Kind:** Fix after merge.
- **Added:** 2026-11-08, from review round 1, finding 1, on the branch `calummoore/chat-title-rename`, which adds the workspace title request.
- **Location:** `runner/src/output-sanitizer.ts:83`, `OutputSanitizer.filter`.
- **Reason:** The fix changes the shared output filter of every runner event, which is outside the purpose of the branch that names workspaces. That branch applied the direct fix for its own title request.

- **Source:** Review. **Category:** Security.
- **Terms:**
  - **Agent runner:** the program in each cloud computer that runs the agents and sends numbered events to the Worker.
  - **Output filter:** the runner code that replaces each known credential, such as an agent login or the workspace token, with `[redacted]` before the runner saves or sends an event.
  - **Known credential:** a secret that the runner holds, so that the filter can hide it: the workspace token and each agent login that a command brought.
- **Background:** The filter matches only a whole known credential, at the exact characters. It holds a possible start of a credential across streamed text, so a split stream still matches. The protocol says, under "Secrets that users enter" in `docs/protocol/tokens-and-secrets.md`, that the filter hides the workspace token and the agent logins. The workspace title request of the branch above cut and stripped the agent's answer before the filter. A check proved that the first 60 characters of a 112-character known credential then passed, and that a credential wrapped in `_` passed without its edges. That branch fixed its own title request, and later removed it, because the user chose on 8 November 2026 that the Worker writes the title with a Workers AI model (decision 184 C). So no runner code cuts title text now, but the class stays for any other code that cuts or reshapes text before the filter.
- **Problem:** Any other code that cuts, strips, or reshapes text before the filter can still send a usable part of a known credential, because the filter needs the whole credential. An agent that repeats only part of a login passes the filter in the same way.
- **Impact if no action:** A later change that shortens or reshapes runner output before the filter can leak part of an agent login or the workspace token to the chat, the Worker database, or the runner state file.
- **Root question:** How does the runner keep each usable part of a known credential out of every event that it saves or sends?
- **Options:**
  - **A.** Keep the filter as it is, and add a rule to the runner README that each cut or clean-up runs after the filter. Each new piece of code must follow the rule. Effort: Small.
  - **B.** Make the filter also hide each part of a known credential that has at least a fixed length, such as 20 characters, and hold such a part across streamed text as it holds a start now. The fixed length must be longer than public key prefixes such as `sk-ant-api03-`. The change applies to every event, so its tests cover streamed text, file reports, and the retained reports. Effort: Medium.
  - **C.** Give the runner a type for filtered text, and let only filtered text reach the code that cuts or emits it. A plain cut before the emit still compiles, so it protects only the helpers that take the type. Effort: Medium.
- **Left out:** A guard that drops an event when a clean-up changed a known credential. It adds a new rejection, which needs the user, and B hides the part without a loss of the event.
- **Wider fix:** B. It removes the class, whatever the order of a future cut.
- **Previous examples:** Commit `76b7878` applied tool-output limits after the filter. Commit `66ad57d` protected the parts of a credential in streamed output. The workspace title request was a third case.
- **Recommendation:** B. It protects every event from a partial credential, and it needs no rule that each writer must remember.
- **Action:** fix after merge, apply B, because it changes the shared filter of every runner event, and the title request already has its direct fix.
