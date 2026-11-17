# The page infers a terminal end from code 1006

- **Severity:** Low. **Likelihood:** Rare. **Effort:** Small. **Confidence:** Medium. **Harder later:** No.
- **Kind:** Fix after merge.
- **Added:** 2026-11-17, from the review of the automatic terminal reconnect on branch `calummoore/investigate-error-m9o4`, finding 4.
- **Location:** `src/app/terminal-transport.ts` (`LOST_CODES`, `closeEnd`), `worker/previews/socket.ts` (`wireCloseCode`, `bridgeSocket`).
- **Reason:** the structural fix changes the close codes of the Worker for every bridged socket, and it needs a measurement on a production deploy first.

- **Terms:**
  - **Automatic try:** after a terminal connection drops with no close of the server, the Terminal tool reads the terminal state again and connects once by itself. Cal chose this on 17 November 2026.
  - **Close frame:** the message that ends a WebSocket with a code. A connection that drops with no close frame reaches the page as code 1006.
- **Background:**
  - `closeEnd` in `src/app/terminal-transport.ts` counts code 1006, 1001, 1012, a close event with no code, and an error event as a lost connection. It counts every other code as an end of the shell, with no automatic try.
  - On 17 November 2026, ttyd 1.7.4 closed with no close frame when its shell exited, also with exit code 0. A WebSocket client saw 1006.
  - `bridgeSocket` relays that end to the page through `wireCloseCode`, which maps 1006 to 1011. So `exit` reaches the page as 1011.
  - On the same day, a local `wrangler dev` reload of a Durable Object's code dropped the client socket with an error event and 1006. Production was not measured.
  - The Worker also closes with 1011 after a relay error, and with 1008 at a loss of access.
- **Problem:** The rule rests on a local measurement. If Cloudflare closes the page socket with a close frame, such as 1011, when it restarts a Durable Object in production, a deploy counts as an end of the shell, and the automatic try never runs.
- **Impact if no action:** If production differs, the terminal still shows Disconnected after each deploy, as before the change.
- **Root question:** How does the page tell an end of the shell from a drop of the server with certainty?
- **Options:**
  - **A.** Check one production deploy: keep a terminal open in a browser with its developer tools, deploy, and read the close code. Change `LOST_CODES` when the code differs. Effort: Small.
  - **B.** Do A. Also make `bridgeSocket` close the page socket with a code of its own in the range 4000 to 4999 when the sandbox side ends. The page then counts only that code and the closes of the Worker, 1000 and 1008, as an end of the shell, and every other code as lost. Older pages treat each close as ended, so they keep working. Effort: Small.
  - **C.** Change nothing. Effort: Small.
- **Left out:** A message in the terminal stream before the close, because ttyd sends none at the exit of its shell.
- **Wider fix:** B, because it makes the meaning of each close code explicit.
- **Previous examples:** None found.
- **Recommendation:** B. A drop of the server then never depends on the code that Cloudflare chooses.
- **Action:** fix after merge, apply B.
