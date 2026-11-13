# Image builds carry their files inside one command

- **Severity:** Medium. **Effort:** Medium. **Confidence:** High. **Harder later:** No.
- **Kind:** Fix after merge.
- **Added:** 2026-11-13, from finding 6 of review round 1 of the branch `calummoore/porto-6ebg` (the terminal control-mode bridge).
- **Location:** `worker/lifecycle/image-software.ts` (`installImageSoftware`), `worker/terminal/service.ts` (`bridgeInstallCommand`), `worker/lifecycle/commands.ts` (`writeFileCommand`), `worker/lifecycle/image-software-size.test.ts`.
- **Reason:** the command is 84,223 bytes, below the 95,464 bytes that already ran on the provider, so the merge does not need the fix, and a size test guards it now.

- **Terms:**
  - **Software command:** the one shell command that each image build starts on the sandbox provider to install Conductive's own programs. Its files ride in it as base64.
  - **Argument limit:** Linux refuses one process argument of 131,072 bytes or more (`MAX_ARG_STRLEN`). The provider starts each command as one argument.
- **Background:**
  - The software command writes each staged file with `writeFileCommand`, which puts the file as base64 into the command text.
  - The terminal bridge added about 58 KB of base64. The command that the provider starts grew from 21,315 to 84,223 bytes.
  - In November 2026, a 134,958-byte tools command stopped every deploy for about 12 hours, until #305 split it. A 95,464-byte command then ran.
  - `worker/lifecycle/image-software-size.test.ts` keeps the command at 96 KiB or less.
- **Problem:** Any growth of the staged files, such as more bridge code, brings the command nearer the argument limit. A command over it fails with no output, and the deploy stops.
- **Impact if no action:** The size test fails when the files grow, and the change that grows them must find room first.
- **Root question:** How does each image build put its files into the image, so that no growth of those files can stop the build?
- **Options:**
  - **A.** Split the software command into ordered commands under 64 KiB, as `workspaceToolsCommands` does, and run them as waiting commands before the detached step. One large file still needs its own split. Effort: Medium.
  - **B.** Upload the staged files to `/opt/conductive/staged/` with the provider's file write route, which is already on the fixed list and has no size limit there. The install command copies them into place. `softwareVersion` hashes the file contents. Effort: Medium.
- **Left out:** Cheaper quoting, because the files are base64 with no quotes, so the wrappers add only about 5 KB. A higher limit, because the kernel fixes it.
- **Wider fix:** B. No file content rides in a command, so no growth of any shape can reach the limit.
- **Previous examples:** `0ab26e0d` (#305) and `379f6062` split the tools install for the same limit.
- **Recommendation:** B. It removes the class of problem for every staged file.
- **Action:** fix after merge, apply B, because the size test guards the current command and B changes two resumable build flows.
