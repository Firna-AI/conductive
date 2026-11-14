# Decide whether a refresh installs the newest release

- **Severity:** Medium. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Needs decision.
- **Added:** 2026-11-14, from branch `calummoore/porto-vtqz`, PR #342, review item 310.
- **Location:** `worker/lifecycle/image-build-steps.ts:101`, `worker/lifecycle/build-execution.ts:75`, `worker/lifecycle/build-admission-data.ts:65`, `docs/protocol/sandbox-software.md` ("Installs in a build"), `docs/protocol/version-pins.md`.
- **Reason:** No recorded decision covers refreshes, and the user did not answer before the merge.

- **Terms:**
  - **Refresh:** the update of an org image that fetches new repository commits. It does not run the org's install script.
  - **Release:** one version of the sandbox software, published at each deploy from `main`.
- **Background:** Before the change, a refresh skipped the software step, and the image kept the runner version of its last build. The change made each refresh install the newest release and record the new runner protocol version, through the same step as a build. The protocol doc names only builds and software image builds.
- **Problem:** The code and the protocol disagree about refreshes, and no decision chose either behaviour. A refresh can now also fail when no release is available.
- **Impact if no action:** The docs stay wrong about refreshes.
- **Root question:** Should a refresh of an org image install the newest sandbox software?
- **Options:**
  - **A.** Yes. Keep the code. Write the rule into `docs/protocol/sandbox-software.md`, "Installs in a build", and let `version-pins.md` link to it. Cost: a refresh can fail when no release is available. Effort: Small.
  - **B.** No. Restore the old refresh path: skip the software step and keep the version of the source image. A new workspace then runs older software until an update applies at a later start. Effort: Medium.
- **Left out:** None.
- **Wider fix:** None.
- **Previous examples:** None found.
- **Related:** None.
- **Recommendation:** A. Each refreshed image then has current software, and a new workspace needs no first update.
- **Action:** ask the user, because no recorded decision covers refreshes.
