# A local address loses its path in the preview

- **Severity:** Low. **Likelihood:** Common. **Effort:** Large. **Confidence:** High. **Harder later:** No.
- **Kind:** Outside the scope.
- **Added:** 2026-11-10, from the options check of the plan `plans/pressable-chat-links.md` on branch `calummoore/chat-link-handling`, option E of its decision on local addresses.
- **Location:** `worker/previews/launch.ts`, the authorizer that sends the browser to the preview host, and `src/previews/PreviewTool.tsx`.
- **Reason:** The user chose on 10 November 2026 that a press on a local address opens the preview of its port, and a start path needs a change of the grant flow in the Worker.

- **Terms:**
  - **Local address:** in chat text, an address whose host is `localhost`, `127.0.0.1`, `[::1]`, or `0.0.0.0`, such as `http://localhost:3000/admin`.
  - **Port preview:** the Preview tool of a workspace. It shows a web server of the cloud computer by its port, in a frame and in a new tab.
  - **Launch address:** the address on the app's hostname that loads one preview. Each load gets a new grant, and the authorizer then sends the browser to the preview host.
- **Background:**
  - On 10 November 2026 the user chose that a press on a local address in chat text opens the port preview of its port, in the workspace of the chat.
  - The preview then opens at the first page of the server, because the authorizer always sends the browser to the root of the preview host.
  - `docs/protocol/terminal-previews-and-desktop.md` and `docs/protocol/port-previews.md` state the grant flow and the preview rules.
- **Problem:** A press on `http://localhost:3000/admin` shows the first page of the server, not `/admin`.
- **Impact if no action:** The member moves to the page inside the preview by hand.
- **Root question:** How does a preview that a local address opens show the page that the address names?
- **Options:**
  - **A.** Keep the first page of the server. Effort: Small.
  - **B.** Let the launch address take a start path, the query, and the hash. The authorizer sends the browser to that path on the preview host, after a check against open redirects. Add the rules to the two protocol docs. Effort: Large.
  - **C.** Load the path inside the frame after the preview opens, with no change of the grant flow. Cost: the app cannot set the address of a frame on another origin after its first load without a new load of the launch address. Effort: Medium.
- **Left out:** None.
- **Wider fix:** None, because this is one missing feature, not a class of defect.
- **Previous examples:** None found.
- **Related:** `plans/follow-ups/preview-bare-addresses-stay-text.md`: a bare local address in a file follows the same preview rule.
- **Recommendation:** A, until members ask for the path. B changes the grant flow, which carries the security rules of previews.
- **Action:** ask the user, because B changes the rules of the grant flow in `docs/protocol/terminal-previews-and-desktop.md`.
