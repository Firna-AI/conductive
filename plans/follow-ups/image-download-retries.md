# Image build downloads have no retries

- **Severity:** Low. **Likelihood:** Rare. **Effort:** Small. **Confidence:** Medium. **Harder later:** No.
- **Kind:** Outside the scope.
- **Added:** 2026-11-09, from branch `calummoore/build-image-install-order`, a new problem of the options check of the software image plan.
- **Location:** `image/install.sh:11`, `image/install-runtime.sh:18`, and `worker/terminal/service.ts:23`.
- **Reason:** the problem is outside the software image plan, and one fix in a separate branch reaches every build.

- **Terms:**
  - **Software step:** the step of an org image build that installs the app's own software: the private Node, the runner archive, and the terminal packages.
- **Background:**
  - The software step downloads the private Node from `nodejs.org` with `curl` in `image/install-runtime.sh`.
  - It downloads the runner archive, about 320 MiB, from `https://runner.conductive.build/` with `curl` in `image/install.sh`.
  - It installs the terminal packages with `apt-get update` and `apt-get install -y ttyd tmux` in `terminalInstallCommand` of `worker/terminal/service.ts`.
  - Each command runs once, under `set -eu`, and none of them asks for a retry.
  - The provider retry policy of builds covers errors of the provider's API. It does not cover a failed command inside the sandbox.
- **Problem:** One short network fault in any of these downloads fails the whole build.
- **Impact if no action:** A short network fault fails an org image build, and an admin must start the build again.
- **Root question:** How does a build survive a short network fault in its downloads?
- **Options:**
  - **A.** Retry inside each download command: `curl --retry 3 --retry-all-errors` for both archives, and `apt-get -o Acquire::Retries=3` for the packages. The digest checks stay as they are. Effort: Small.
  - **B.** Retry the whole software step once in the Worker after a failed command. A real failure then runs the step twice. Effort: Medium.
- **Left out:** Change nothing, because each short fault keeps failing a build. Only two places can handle the fault, the command and the step around it, so there is no third approach.
- **Wider fix:** None. Three commands download, and they are not a class.
- **Previous examples:** None found.
- **Recommendation:** A. It retries only the part that failed, and a real failure still fails at once after the retries.
- **Action:** fix after merge, apply A, because the problem is outside the software image plan.
