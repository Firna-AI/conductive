# Check that a private port refuses public requests

- **Severity:** High. **Effort:** Small. **Confidence:** Medium. **Harder later:** No.
- **Kind:** Post-merge task.
- **Added:** 2026-11-17, from `calummoore/delete-outstanding-plans-status-f01f`, an open check of the deleted Boat-native remote workspaces plan (deployment and live smoke test).
- **Location:** `docs/protocol/terminal-previews-and-desktop.md`, section "Proxies and ports".
- **Reason:** Only a real Boat sandbox shows how its public address treats a private port.

- **Terms:**
  - **Private port:** a port of a sandbox that Boat serves only with its port token or cookie. The terminal listens on a private port.
- **Background:** The protocol says: "A private port of a sandbox never answers on its public address without its token." The Worker reaches the terminal with Boat's port cookie and a password for each workspace. Sandbox code can make a port public, so the password still guards the terminal. Nobody checked the rule against a real sandbox.
- **Task:**
  1. In a test workspace, find the public address of the terminal port, or of another private port, from the Boat sandbox record.
  2. Send a request and a WebSocket upgrade to that address with no token and no cookie, for example with `curl`.
  3. Check that Boat refuses both and that no terminal or app content comes back.
- **Impact if no action:** When the rule does not hold, anyone who learns the address of a private port can reach the service behind it. The terminal password still guards the terminal, but other private services have no second guard.
- **Needs:** A real workspace, its Boat sandbox ID, and read access to the sandbox record.
- **Done when:** Requests without a token to each private port tested get a refusal. When a request gets through, a new item with the kind Fix after merge records it.
