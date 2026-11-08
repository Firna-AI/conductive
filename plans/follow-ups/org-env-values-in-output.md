# Org env values reach the chat, and short ones vanish from logs

- **Severity:** Medium. **Effort:** Medium. **Confidence:** Medium. **Harder later:** No.
- **Kind:** Needs decision.
- **Added:** 2026-11-08, two problems outside the scope of the check of finding 12 of PR #42, branch `conductor/boat-native-remote-workspaces-milestone-8i`, round 2.
- **Location:** the runner's output filter in `runner/src/runner.ts:50`, and the start-log masker in `worker/lifecycle/masked-start-log.ts:14`.

- **Terms:**
  - **Org env vars:** the names and values that an admin enters in the org settings. The Worker gives them to each sandbox at its start, and the access protocol says that the browser never gets the values back.
  - **Output filter:** the runner's `OutputSanitizer`, which replaces known secrets with `[redacted]` before the runner saves and sends agent output.
  - **Start-log masker:** the Worker's `MaskedStartLog`, which hides each start setting in a start log before the Worker releases the log.
- **Background:** The output filter knows only the workspace token and the agent logins. The start-log masker hides every org env value, whatever its length.
- **Problem:** An agent can repeat an org env value into saved chat, so a secret value reaches every reader of the chat. The start-log masker also hides short, common values, such as `1` or `production`, wherever they appear in a start log.
- **Impact if no action:** A secret that an admin stores as an org env var can show in the chat history. Start logs lose ordinary text that matches a short value.
- **Root question:** Which org env values count as secrets, and how do the chat and the start logs hide only those?
- **Options:**
  - **A.** Keep both rules, and state in the access protocol that agent output can show org env values. Effort: Small.
  - **B.** One list of start secrets in the Worker feeds both the start-log masker and the output filter, and only values of at least 8 characters count. Short values stay visible everywhere. Effort: Medium.
  - **C.** Add a "secret" mark to each org env var in the org settings. Only marked values are hidden, in the start logs and in the chat, and the settings never show a marked value again. Effort: Medium.
- **Left out:** A second filter in the Worker where it stores runner events, because the runner must filter before it writes events to disk.
- **Wider fix:** C. The admin says which values are secrets, so no length rule guesses.
- **Previous examples:** finding 12 of PR #42, where a start setting was missing from the output filter.
- **Recommendation:** C. It hides real secrets and keeps ordinary values readable.
- **Action:** ask the user, because C adds a setting to the org env vars, and B changes what the chat and the logs show.
