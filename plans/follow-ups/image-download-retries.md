# Image software downloads have no retries

- **Severity:** Low. **Likelihood:** Rare. **Effort:** Small. **Confidence:** Medium. **Harder later:** No.
- **Kind:** Outside the scope.
- **Added:** 2026-11-10, from branch `calummoore/global-snapshot-simplification`, a new problem of the options check of the plan for the software image of first builds. Branch `calummoore/build-image-install-order` holds an earlier copy of this item from 2026-11-09.
- **Location:** `image/install.sh:11`, `image/install.sh:21`, `image/install-runtime.sh:18`, and `worker/terminal/service.ts:22`.
- **Reason:** the problem is outside the software image change, and one fix in a separate branch reaches every build.

- **Terms:**
  - **Software step:** the step that installs the app's own software in a cloud computer image: the private Node, the runner archive, the GitHub CLI, and the terminal packages.
  - **Software image:** one saved image for each version of the app's own software. It holds the provider's base image and the software step. The deploy workflow asks the Worker to build it. Org builds use it when a matching image is ready.
- **Background:**
  - The software step downloads the private Node from `nodejs.org` with `curl` in `image/install-runtime.sh`.
  - It downloads the runner archive, about 320 MiB, from `https://runner.conductive.build/` with `curl` in `image/install.sh`.
  - It installs the GitHub CLI with `apt-get update` and `apt-get install -y gh` in `image/install.sh`, when `/usr/bin/gh` is missing.
  - It installs the terminal packages with `apt-get update` and `apt-get install -y ttyd tmux` in `terminalInstallCommand` of `worker/terminal/service.ts`.
  - Each command runs once, under `set -eu`, and none of them asks for a retry.
  - The provider retry policy of builds covers errors of the provider's API. It does not cover a failed command inside the sandbox.
  - Each software image build runs the software step. An org image build, first or later, runs it only when no ready software image of its app software version exists.
- **Problem:** One short network fault in any of these downloads fails the whole build.
- **Impact if no action:** A short network fault fails an org image build, and an admin must start the build again. It also fails a software image build, so first and later builds do the full install until the next deploy run builds the image.
- **Root question:** How does a build survive a short network fault in its downloads?
- **Options:**
  - **A.** Retry inside each download command: `curl --retry 3 --retry-all-errors` for both archives, and `apt-get -o Acquire::Retries=3` for the packages. The digest checks stay as they are. Effort: Small.
  - **B.** Retry the whole software step once in the Worker after a failed command. A real failure then runs the step twice. Effort: Medium.
- **Left out:** Change nothing, because each short fault keeps failing a build. Only two places can handle the fault, the command and the step around it, so there is no third approach.
- **Wider fix:** None. Four commands download, and they are not a class.
- **Previous examples:** None found.
- **Recommendation:** A. It retries only the part that failed, and a real failure still fails at once after the retries.
- **Action:** fix after merge, apply A, because the problem is outside the software image change.
