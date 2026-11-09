# The first release defaults to 1.0.0

- **Severity:** Medium. **Effort:** Small. **Confidence:** High. **Harder later:** Yes.
- **Kind:** Fix after merge.
- **Added:** 2026-11-09, confirmed finding 13 of the final Mac update review on branch `calummoore/desktop-app-auto-update`.
- **Category:** Process.
- **Location:** `release-please-config.json`, `.release-please-manifest.json`, the first-version paragraph of `desktop/RELEASES.md`, and `plans/follow-ups/first-mac-release-check.md`.
- **Reason:** The original two review fix rounds are used. Apply this fix before the first release pull request merges.

- **Terms:**
  - **release-please:** The pinned GitHub Action that prepares the product version and draft release.
  - **Release pull request:** The pull request that sets the next version before its merge starts a release.
  - **Release-As:** A Conventional Commit footer that requests one explicit release version.
- **Background:**
  - The Mac app protocol requires versions in the `0.x.y` series and sets the first release to `0.1.0`.
  - The root package uses the Node strategy. Its checked-in manifest holds `".": "0.0.0"`, and its config sets no `initial-version`.
  - The pinned action is `googleapis/release-please-action` at `45996ed1f6d02564a971a2fa1b5860e934307cf7`, which bundles release-please 17.6.0.
  - Its manifest fallback excludes `0.0.0` as a previous release. Its base strategy then supplies the default first version `1.0.0`. The Node strategy does not override that default.
  - A read-only probe of the pinned `Manifest.fromManifest` and `buildPullRequests` methods used the real history after the bootstrap commit and a simulated squash of the update change. It proposed `chore(main): release 1.0.0`.
  - With `"initial-version": "0.1.0"` in the root package config, the probe proposed `0.1.0` for both feature and fix-only histories.
  - With the same setting after a published `0.1.0`, a feature proposed `0.2.0` and a fix proposed `0.1.1`. The setting does not pin later versions.
  - The bundled schema permits `initial-version` as a string. The pinned bundle's manifest fallback is near line 48704, config parser near line 49228, and default initial-version method near line 51931.
  - The protocol forbids changing a published release. Installed apps accept only newer versions, so a published `1.0.0` cannot later update to `0.1.0`.
- **Problem:** The first release pull request proposes `1.0.0`, contrary to the required first version.
- **Impact if no action:** Its merge publishes `v1.0.0`. Later versions must stay above it, and the first-release instructions no longer match the result.
- **Root question:** How does the first published version stay at `0.1.0`?
- **Options:**
  - **A.** Set `"initial-version": "0.1.0"` inside the root package config. Correct the first-version explanation in `desktop/RELEASES.md` and the first-release follow-up. Repeat the one-time pinned-tool probe. Effort: Small.
  - **B.** Add a commit with `Release-As: 0.1.0` before the first release. Ensure the final merged commit retains that footer. An earlier footer in a multi-commit squash can be missed. The default remains `1.0.0`. Effort: Small.
  - **C.** Put a `BEGIN_COMMIT_OVERRIDE` block with `Release-As: 0.1.0` in the update pull request description. It works with squash and merge commits, but not a rebase of several commits. An edit can remove it, and it lives outside the repository. Effort: Small.
  - **D.** A, plus a new gate that rejects a root package version outside `0.x.y`. This needs user approval and a later change when the protocol allows `1.0.0`. Effort: Small.
- **Left out:** A false manifest version or bootstrap tag depends on the commit kinds and names a release that never existed. A permanent `release-as` forces later releases to reuse the first version. Hand edits can be overwritten by the tool. A is better on each point.
- **Wider fix:** A. The configuration owns the first-version rule across commit kinds and merge methods.
- **Previous examples:** None found. The earlier strategy-only probe missed the manifest's no-previous-release path.
- **Related:** `plans/follow-ups/first-mac-release-check.md` must wait for this fix. `plans/follow-ups/release-as-footer-lost-in-squash.md` records the separate footer documentation issue.
- **Recommendation:** A. It states the required initial version and preserves automatic later bumps.
- **Action:** fix after merge, apply A, before anyone merges the first release pull request.

Use a one-time probe of the pinned tool to verify `0.1.0`, then `0.2.0` and `0.1.1`. Do not add a permanent test of third-party internals. Check the changed Markdown links and run the repository checks.

Primary source: [the pinned action bundle](https://github.com/googleapis/release-please-action/blob/45996ed1f6d02564a971a2fa1b5860e934307cf7/dist/index.js#L48704).
