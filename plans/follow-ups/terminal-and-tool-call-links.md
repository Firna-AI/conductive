# Addresses in the terminal cannot be pressed

- **Severity:** Low. **Likelihood:** Common. **Effort:** Medium. **Confidence:** High. **Harder later:** No.
- **Kind:** Outside the scope.
- **Added:** 2026-11-10, from the options check of the plan `plans/pressable-chat-links.md` on branch `calummoore/chat-link-handling`.
- **Location:** `src/terminal/`, which draws the terminal with `@xterm/xterm`, and `src/chat/components/ToolGroup.tsx`, which draws the tool call lines of the chat.
- **Reason:** The user asked for links in the chat text, and the terminal and the tool call lines draw their text with other parts.

- **Terms:**
  - **Local address:** an address whose host is `localhost`, `127.0.0.1`, `[::1]`, or `0.0.0.0`, such as `http://localhost:3000`.
  - **Port preview:** the Preview tool of a workspace. It shows a web server of the cloud computer by its port.
  - **Tool call line:** one line of a run of tool calls in the chat, such as a command that the agent ran.
- **Background:**
  - From 10 November 2026, each `http` and `https` address of an agent answer or a sent message is a link. A press on a local address there opens the port preview of its port.
  - Dev servers print their local addresses in the terminal, such as "Local: http://localhost:5173/".
  - The terminal shows no links. The app loads only the fit addon of `@xterm/xterm`. The web links addon of `@xterm/xterm` can find addresses in terminal text.
  - Tool call lines show commands as code, and code keeps its text.
- **Problem:** A member cannot press an address in the terminal, also the local address of a server that the member just started.
- **Impact if no action:** The member opens the Preview tool and presses the server there, or copies the address.
- **Root question:** How does a member open an address that the terminal shows?
- **Options:**
  - **A.** Keep the terminal as it is. Effort: Small.
  - **B.** Add the web links addon of `@xterm/xterm`. A press on a web address opens it in a new tab, and a press on a local address opens its port preview, as in the chat. Cost: a new dependency, a mockup, and a protocol rule. Effort: Medium.
  - **C.** Do B, and link the addresses of tool call lines too. Cost: tool call lines show commands as code, and a press in a command can open an address that the command calls. Effort: Medium.
- **Left out:** None.
- **Wider fix:** B, with the shared link reader `src/markdown/web-links.ts` deciding each kind, so the terminal and the chat follow one rule.
- **Previous examples:** None found.
- **Related:** `plans/follow-ups/local-address-path-in-preview.md`: a local address opens the first page of its server.
- **Recommendation:** B. The terminal is where a member sees the address of a new server first.
- **Action:** ask the user, because B adds pressable addresses to the terminal, which no requirement covers.
