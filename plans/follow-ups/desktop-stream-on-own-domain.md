# The frame policy trusts every Boat sandbox host

- **Severity:** Medium. **Effort:** Large. **Confidence:** High. **Harder later:** No.
- **Kind:** Fix after merge.
- **Added:** 2026-11-08, item 1 of the Desktop tab fix on branch `calummoore/desktop-view-crash`.
- **Location:** `docs/deployment.md` (section "Frame sources"), `worker/configuration.ts:19` (`appFrameSources`), `desktop/scripts/build.ts:9`, `worker/sandbox/boat.ts:84` (`desktop`), and `src/desktop/DesktopFrame.tsx`.
- **Reason:** the user chose the Boat wildcard now and a stream on the app's own domain later, on 8 November 2026, and the move is a large build.

- **Terms:**
  - **Frame policy:** the `frame-src` part of the content security policy of each page of the app. It lists the hosts that a page can show in a frame.
  - **`CONDUCTIVE_FRAME_SOURCES`:** the deployment setting that adds hosts to the frame policy. It is set on the Worker in Cloudflare and in the Mac build.
  - **Stream host:** the host of the desktop stream URL that Boat returns for a sandbox. Boat generates it for each running sandbox.
- **Background:**
  - The Desktop tab shows the desktop stream of the sandbox in a frame. The Worker asks Boat for a new stream URL each time the tab opens.
  - On 8 November 2026 the deployed app showed a broken frame. Its frame policy was `frame-src 'self' https://*.conductive.page`, so the browser blocked the stream host.
  - Boat's desktop guide shows the stream host only as `<sandbox-desktop-host>`. Boat's dashboard refuses sandbox names that end in `-desktop`, as it refuses names that end in `-<number>` for its port hosts `<sandbox>-<port>.on.boat.dev`. So each sandbox has its own stream host, and a list of exact hosts fails for each new workspace.
  - The user chose to set `CONDUCTIVE_FRAME_SOURCES` to `https://*.conductive.page https://*.on.boat.dev` on 8 November 2026. `docs/deployment.md` states that value.
- **Problem:** The frame policy trusts every host under `on.boat.dev`. A page of the app can then frame any page that a Boat sandbox serves, also a page of another Boat customer or of untrusted code in a sandbox.
- **Impact if no action:** An attacker who finds a way to put HTML into a page of the app can show their own Boat page inside the app, for example a false sign-in form.
- **Root question:** How does the desktop stream load from a domain of the app, so that the frame policy lists only the app's own domains?
- **Options:**
  - **A.** Ask Boat to serve the desktop stream on a custom domain of the app, such as a subdomain of `conductive.page`. Then list only that domain. Nobody has asked Boat whether it offers this. Effort: Small, plus the wait for Boat.
  - **B.** Send the stream through the Worker, on a host of the app's own domain, and remove `https://*.on.boat.dev` from the frame policy. The proxy carries the stream page, its scripts, and its WebSocket. The viewer sends its token in request headers and in the first WebSocket frame, never in a URL. Option C of `plans/follow-ups/desktop-stream-after-access-loss.md` builds the same proxy. Effort: Large.
- **Left out:** Keeping the wildcard, because the user chose to move the stream to the app's own domain. A wrapper page on the app's domain with a policy for one exact stream host, because the stream itself still loads from Boat's host.
- **Wider fix:** B. The same proxy also lets the Worker end a stream when its user loses access.
- **Previous examples:** None found.
- **Related:** `plans/follow-ups/desktop-stream-after-access-loss.md`: the same build. Its option C, which the user chose on 7 November 2026, sends the stream through the Worker. One proxy closes both items.
- **Recommendation:** B. It shares the build that the user already chose for the access rule, and it needs nothing from Boat. A costs less only if Boat offers custom domains, and it does not help the access rule.
- **Action:** fix after merge, apply B, because the user chose the Boat wildcard now and the app's own domain later, on 8 November 2026.
