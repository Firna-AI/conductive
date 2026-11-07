# A Worker update ends each open shell

- **Severity:** Medium. **Likelihood:** Common. **Effort:** Medium. **Confidence:** Medium. **Harder later:** No.
- **Kind:** Needs decision.
- **Added:** 2026-11-07, option C of `shared-session-check-for-connections`, which Milestone 11b applies with option B and deletes. The user sees it as item 118.
- **Location:** `worker/terminal/service.ts:19`, the terminal setup of the org image in `image/`, and the section "Terminal" of `docs/protocol/workspaces-and-sandboxes.md`.
- **Reason:** the fix changes what the user sees in the terminal.

- **Terms:**
  - **ttyd:** the program in the sandbox that runs the shell of the Terminal tab and serves it over one socket.
  - **Terminal multiplexer:** a program, such as tmux, that keeps a shell running when its screen disconnects, so that a new screen can attach to it.
- **Background:** The Terminal tab connects through the Worker to ttyd in the sandbox. ttyd ends the shell when its socket closes. Cloudflare closes open Worker sockets at most 20 minutes after each runtime update.
- **Problem:** Each Cloudflare runtime update, and each dropped connection, ends the open shells and the commands that run in them.
- **Impact if no action:** A user loses a running command, such as a dev server or a long build, now and then, with no warning.
- **Root question:** How does a shell keep its running commands when its connection drops?
- **Options:**
  - **A.** Accept it, and state in the protocol that a dropped connection ends the shell. Effort: Small.
  - **B.** Run each shell of the Terminal tab inside a terminal multiplexer, such as tmux, so that a new connection attaches to the same shell, with its running commands and its screen. Effort: Medium.
- **Left out:** Keep the socket open across the update, because Cloudflare controls the end of open sockets.
- **Wider fix:** B.
- **Previous examples:** the check of finding 4 of PR #9.
- **Recommendation:** B. Users keep their running commands, and the terminal reconnects to the same shell.
- **Action:** ask the user, because B changes what the Terminal tab shows after a reconnect.
