# The doc says an install never restarts the relay

- **Severity:** Low. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Outside the scope.
- **Added:** 2026-11-24, from branch `calummoore/external-mac-linux-server-cloud-j9ih`, the review of Milestone 4 of the own computers plan.
- **Location:** `docs/protocol/sandbox-software.md:183` and `image/install-system.sh:18-22`
- **Reason:** The mismatch exists on `main` too, so it is not part of the own computers change.

- **Background:** The protocol doc says, about an install of a release while the workspace is idle: "The install restarts neither the preview relay nor the terminal service." The installer `image/install-system.sh` runs `systemctl --no-block try-restart conductive-preview-relay.service`, with the comment that Boat starts the relay at boot before the release applies, so a running relay restarts to run the active release. `image/install.md:197` also says that the installer restarts the relay when it runs.
- **Problem:** The protocol doc and the installer disagree.
- **Impact if no action:** A reader of the protocol doc expects open previews to keep their relay through an install, but each install restarts it.
- **Root question:** Does an install of a release restart a running preview relay?
- **Options:**
  - **A.** Keep the installer. Change the protocol doc to say that an install restarts a running relay, and that the socket holds the port meanwhile. Effort: Small.
  - **B.** Change the installer to leave the relay alone, and run the new release only from its next start. Cost: a relay that Boat started before the release applied runs an old release until the next boot. Effort: Small.
- **Left out:** None.
- **Wider fix:** None.
- **Previous examples:** None found.
- **Recommendation:** A. The installer's reason still holds, and the socket keeps the port.
- **Action:** ask the user, because A changes a protocol rule.
