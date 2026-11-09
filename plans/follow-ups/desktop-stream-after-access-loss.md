# A removed member can keep watching the desktop

- **Severity:** Medium. **Effort:** Large. **Confidence:** High. **Harder later:** No.
- **Kind:** Needs decision.
- **Added:** 2026-11-07, option C of `shared-session-check-for-connections`, which Milestone 11b applies with option B and deletes. The user sees it as item 117.
- **Location:** `worker/desktop/README.md:14`, and the sections "Orgs and workspaces" and "Desktop" of `docs/protocol/access-and-security.md`.
- **Reason:** The user deferred the replacement desktop transport on 8 November 2026. It needs a gateway, a viewer, startup wiring, and new dependencies.

- **Terms:**
  - **Desktop stream:** the live desktop of the sandbox, which the browser loads straight from Boat with a URL that works for 10 minutes.
- **Background:** An open tab loses its workspace connection within 30 seconds after its user loses access. The chat tabs and terminal sockets use one shared check. The desktop stream does not pass through the Worker, so that check cannot end it.
- **Problem:** An open desktop stream keeps playing after a sign-out, a removal from the org, or a deleted org, until the sandbox stops.
- **Impact if no action:** A removed member can keep watching the agent's desktop, which breaks the rule of decision 70.
- **Root question:** How does an open desktop stream end when its user loses access?
- **Options:**
  - **A.** Accept it, and state in the access protocol that an open desktop stream can play until the sandbox stops. Effort: Small.
  - **B.** Ask Boat to end the desktop session of the sandbox when a member loses access, if Boat has such a route. It adds a route to the fixed list, and nobody has checked that Boat offers it. Effort: Medium.
  - **C.** Send the desktop stream through the Worker, so that the shared access check ends it as it ends a terminal socket. Build a VNC gateway in the sandbox and use a noVNC browser viewer. Carry all desktop data over a Worker-managed WebSocket. This is the gateway approach of decision 146 B, and the way to apply decision 117 C. Effort: Large.
- **Left out:** A shorter desktop URL, because an open stream keeps playing after its URL expires.
- **Wider fix:** C.
- **Previous examples:** finding 1 of PR #6, and finding 4 of PR #9.
- **Related:** `plans/follow-ups/desktop-stream-on-own-domain.md`: the same replacement transport. Its option B serves the viewer and all desktop data through the Worker on the app's own domain. The gateway build can close both items. The user deferred that build on 8 November 2026.
- **Recommendation:** C when the user starts the work. A Worker-managed media path lets the shared access check end the stream.
- **Action:** ask the user later, because the user deferred it on 8 November 2026 (decision 146).

## Finding on 8 November 2026

The [provider's desktop guide](https://docs.boat.dev/desktop-streaming)
documents the desktop stream as Moonlight over WebRTC.
The current Worker cannot relay that media.
The [URL and security guide](https://docs.boat.dev/desktop-streaming/urls-and-security)
documents token checks for HTTP requests and the first WebSocket frame.
It does not give a media transport that the Worker can relay.
A proxy of the viewer page or its signaling connection cannot prove that
an established WebRTC stream ends after access loss.

A VNC gateway with a noVNC viewer is the way to apply the chosen
Worker-proxy approach. The [noVNC server requirements](https://github.com/novnc/noVNC#server-requirements)
describe its WebSocket transport. This build needs sandbox installation
and startup, private-port wiring, a browser viewer, lifecycle cleanup, and
tests of media shutdown under the shared access grants. It must show the
same desktop before acceptance.

On 8 November 2026, the user chose to keep the desktop tool as it is and
to ask about this build later. The access protocol keeps its documented
exception until the user approves and the app implements the replacement.
