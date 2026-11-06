# Open connections each check access their own way

- **Severity:** High. **Effort:** Medium. **Confidence:** Medium. **Harder later:** Yes.
- **Kind:** Fix after merge.
- **Added:** 2026-11-06, from PR #9, branch `conductor/boat-native-remote-workspaces-milestone-11`, round 2 finding 4, wider fix E, and three new problems of its check.
- **Location:** the terminal connection helper in `worker/terminal/`, the tab access check of the chat in `worker/chat/`, `worker/desktop/README.md:14`, and `worker/terminal/service.ts:19`.
- **Reason:** the wider fix changes the merged chat code, outside the branch that found it.

- **Terms:**
  - **Signed-in connection:** a socket that a browser tab opens with its session, such as the chat events socket or the terminal socket.
  - **Desktop stream:** the remote desktop view, which the browser loads straight from Boat with a short-lived URL.
- **Background:** Decision 70 says that an open workspace connection loses access within 30 seconds after its user loses it. The chat checks its tabs in the workspace Durable Object, and the terminal checks its sockets in the Worker, each with its own session read.
- **Problem:**
  - The two checks read the session in different code, so they can drift apart, as the terminal check did from the gate.
  - An open desktop stream goes from the browser straight to Boat. It keeps playing after a sign-out or a removal until the sandbox stops.
  - ttyd ends the shell when its socket closes. Cloudflare gives open Worker sockets at most 20 minutes after a runtime update, so each update ends open shells and their running commands.
- **Impact if no action:** A later change can weaken one access check without the other. A removed member can keep watching a desktop. Users lose their shell commands at each Cloudflare update.
- **Root question:** How does every signed-in connection lose access on time, and keep its work across a reconnect?
- **Options:**
  - **A.** Keep one check in each area, each with its own tests. Effort: Small.
  - **B.** One shared session read and access check that the Worker and the Durable Object both call. Effort: Medium.
  - **C.** B, plus a desktop proxy through the Worker, so that the access check also ends desktop streams, and a terminal multiplexer such as tmux, so that a shell survives its socket. Effort: Large.
- **Left out:** None.
- **Wider fix:** C.
- **Previous examples:** finding 1 of PR #6, and finding 4 of PR #9.
- **Recommendation:** B now, and decide the desktop and shell parts of C with the user, because they change what the user sees.
- **Action:** fix after merge, apply B, because it changes merged code in two areas.
