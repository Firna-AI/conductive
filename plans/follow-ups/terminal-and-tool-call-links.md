# Addresses in tool call lines cannot be pressed

- **Severity:** Low. **Likelihood:** Common. **Effort:** Medium. **Confidence:** High. **Harder later:** No.
- **Kind:** Outside the scope.
- **Added:** 2026-11-10, from the options check of the plan `plans/pressable-chat-links.md` on branch `calummoore/chat-link-handling`. Narrowed on 2026-11-13 to the tool call lines by the plan `plans/terminal-links.md` on branch `calummoore/delft-vl39`, which makes the terminal addresses open.
- **Location:** `src/chat/components/ToolGroup.tsx`, which draws the tool call lines of the chat.
- **Reason:** The user asked for links in the chat text and in the terminal, and the tool call lines draw their text with another part.

- **Terms:**
  - **Local address:** an address whose host is `localhost`, `127.0.0.1`, `[::1]`, or `0.0.0.0`, such as `http://localhost:3000`.
  - **Port preview:** the Preview tool of a workspace. It shows a web server of the cloud computer by its port.
  - **Tool call line:** one line of a run of tool calls in the chat, such as a command that the agent ran.
- **Background:**
  - Each `http` and `https` address of an agent answer or a sent message is a link. A press on a local address there opens the port preview of its port.
  - Each address in the terminal is a link too. A held Cmd, or Ctrl off a Mac, and a click open it. A local address opens the port preview of its port.
  - Tool call lines show commands as code, and code keeps its text.
- **Problem:** A member cannot press an address in a tool call line, such as the address in a `curl` command that the agent ran.
- **Impact if no action:** The member copies the address, or opens the Preview tool and presses the server there.
- **Root question:** How does a member open an address that a tool call line shows?
- **Options:**
  - **A.** Keep the tool call lines as they are. Effort: Small.
  - **B.** Link the addresses of tool call lines with the shared link part of the chat. Cost: a press in a command can open an address that the command calls. Effort: Medium.
- **Left out:** None.
- **Wider fix:** B, with the shared link reader `src/markdown/web-links.ts` deciding each kind, so the tool call lines, the chat, and the terminal follow one rule.
- **Previous examples:** The chat links of `plans/pressable-chat-links.md` and the terminal links of `plans/terminal-links.md`.
- **Related:** `plans/follow-ups/local-address-path-in-preview.md`: a local address opens the first page of its server.
- **Recommendation:** A. A tool call line shows a command, and a press there can open an address that the command calls.
- **Action:** ask the user, because B adds pressable addresses to the tool call lines, which no requirement covers.
