# Own computers on a Mac with Xcode

- **Severity:** Medium. **Effort:** Large. **Confidence:** Medium. **Harder later:** No.
- **Kind:** Outside the scope.
- **Added:** 2026-11-22, from branch `calummoore/external-mac-linux-server-cloud-j9ih`, own computer decision 5.
- **Location:** `crates/cnd-release/src/version.rs:11`
- **Reason:** On 22 November 2026, Cal chose Linux containers for own computers first, and a native Mac version as a later change.

- **Terms:**
  - **Own computer:** a server that an org admin adds to the app, where workspaces run in place of a cloud computer.
  - **Host program:** the program `conductive` in host mode. It opens one outbound connection from each computer to the Worker.
  - **Sandbox software:** the app's own software in each computer: `conductive`, the SDK helper, and the terminal bridge.
- **Background:**
  - Own computers run Linux on x86_64. Each workspace runs in its own Linux container, with the same sandbox software as a cloud computer.
  - The sandbox software builds only for `x86_64-unknown-linux-musl` (`crates/cnd-release/src/version.rs:11`).
  - It needs systemd units (`image/install-system.sh`), inotify (`crates/cnd-runner/src/watcher/linux.rs`), `/proc` for the port scan (`crates/cnd-runner/src/ports/proc.rs`), and apt for ttyd and tmux (`worker/terminal/service.ts`).
  - It assumes one workspace on each machine: fixed ports 7681 to 7683, one env file (`image/runner-start.sh`), and a runner start that deletes every agent credential file in the home folder (`crates/cnd-runner/src/helper/startup.rs`).
  - A Mac can run Linux containers in a virtual machine, but those containers get no Xcode and no iOS simulators.
  - `docs/protocol/desktop-app.md` says that agents never run on the Mac.
- **Problem:** An org cannot run agents with Xcode, the iOS simulators, or other macOS-only tools.
- **Impact if no action:** Teams that build Apple apps cannot use own computers for that work.
- **Root question:** How can a workspace run its agents with macOS-only tools on a Mac that the org provides?
- **Options:**
  - **A.** Native workspaces on a Mac. Build the sandbox software for macOS on Apple silicon and Intel. Use launchd in place of systemd, and FSEvents or kqueue in place of inotify. Scan ports without `/proc`. Give each workspace its own ports, folders, env file, and credential folders. A workspace has no org image. The workspaces of one Mac are less isolated from each other. Effort: Large.
  - **B.** One macOS virtual machine for each workspace on a Mac, with the native sandbox software inside. Apple allows two macOS virtual machines at a time on one Mac. Effort: Large.
- **Left out:** Linux containers on a Mac: they give no Xcode.
- **Wider fix:** None. The host connection is already the one path for every computer.
- **Previous examples:** None found.
- **Recommendation:** A. It serves more than two workspaces on one Mac, and the simulators need a signed-in session of the Mac. This external fact is not checked.
- **Action:** ask the user, because it is a new product scope.
