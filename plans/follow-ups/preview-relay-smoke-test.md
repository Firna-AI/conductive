# Smoke-test the preview relay in a real sandbox

- **Severity:** Medium. **Effort:** Small. **Confidence:** Medium. **Harder later:** No.
- **Kind:** Post-merge task.
- **Added:** 2026-11-10, from branch `calummoore/port-preview-error-v2`, the post-merge tasks of the plan for the preview relay.
- **Location:** `runner/src/relay/headers.ts`, `worker/previews/relay.ts`, and `image/conductive-preview-relay.service`.
- **Reason:** the check needs the deployed Worker, a runner archive with the relay, and a new org image build.

- **Terms:**
  - **Preview relay:** the service `conductive-preview-relay.service` of the app's own software in a sandbox. It listens on `127.0.0.1:7682`, and it gives each previewed server `Host: localhost:<port>`.
  - **Org image:** the saved snapshot that each new sandbox of an org starts from. Each build and each refresh gives it the relay. A workspace start also gives the relay to an existing workspace, as [Old workspaces](../../docs/protocol/workspace-life.md#old-workspaces) says.
- **Background:**
  - A dev server with a Host check refuses a `Host` that is not local. Before the relay, `mokly serve` answered every preview request with 403 `{"code":"forbidden","message":"Use the local catalogue address."}`. Vite blocks such requests with "Blocked request. This host is not allowed."
  - The user chose the relay on 10 November 2026. The user also chose that a sandbox without a running relay refuses previews with 409 `preview_relay_unavailable`. Its message is now "Previews need an update to the agent and terminal software. The next workspace start will update it."
  - The relay answers only a request whose `Host` matches `<label>-7682.on.boat.dev`. Boat's hosting docs tell Vite users to allow `.on.boat.dev`, so that hostname should reach the sandbox. No test runs against the real Boat edge, so this is still an assumption.
  - The relay adds `X-Conductive-Relay: 1` to each of its answers. The Worker replaces each answer without the mark with its own unavailable error.
- **Task:**
  1. After a deploy that publishes the new runner archive, run Build computer for a test org.
  2. Start a new workspace. Run `mokly serve` on `127.0.0.1:4173`, and a Vite dev server with its default settings.
  3. Open a preview of each port. Check that the page loads, that live reload works, and that a form POST or a render request of the Mokly controls works.
  4. Run `systemctl is-active conductive-preview-relay.service` in the terminal. It answers `active`.
  5. In a workspace that started from an image without the relay, open a preview. Check that it shows the refusal message above.
- **Impact if no action:** If Boat sends another `Host` value to the sandbox, the relay refuses every preview with 403, and nobody notices until a user opens a preview.
- **Needs:** the deployed change, a test org with Build computer, and a workspace from an older image.
- **Done when:** both previews work in the new workspace, and the older workspace shows the refusal. Then delete this item. If the relay refuses the real `Host`, record its value and fix the pattern in `runner/src/relay/headers.ts`.
