# Files preview header names have two definitions

- **Severity:** Medium. **Effort:** Medium. **Confidence:** High. **Harder later:** No.
- **Kind:** Fix after merge.
- **Added:** 2026-11-23, from `calummoore/fonts-loading-issue-kjto`, review finding 12.
- **Location:** `crates/cnd-runner-interface/src/file_server.rs:7`, `src/shared/previews.ts:11`.
- **Reason:** The shared definition changes Rust and TypeScript product code outside the diff of the change that found it, and a direct test already catches a rename of the origin header.

- **Terms:**
  - **Files preview:** the private web address that shows an HTML file of a workspace and the files that it loads, served by the file server of the runner.
  - **Files mark:** the header `X-Conductive-Files: 1` that the Worker adds to each files preview request, and that the file server requires.
  - **Origin header:** the header `X-Conductive-Files-Origin` with the origin of the files preview, which the file server uses to write full addresses.
- **Background:** The Worker adds the files mark and the origin header to each request of a files preview. The file server reads both. The Worker takes the names from `src/shared/previews.ts`. The file server takes them from `crates/cnd-runner-interface/src/file_server.rs`. The repository already keeps other shared names in one JSON file that both languages read: `crates/cnd-relay/src/ingress_config.rs` embeds `src/shared/preview-ingress-config.json`.
- **Problem:** A rename in one language passes the tests of both. A rename of the files mark makes the file server answer 403 to each files preview request. A rename of the origin header makes the file server change no `file:` address. A runner test now sends the literal origin header name, but no test covers the files mark name.
- **Impact if no action:** A later rename breaks the HTML tab or its local files for every workspace, and no check catches it before the deploy.
- **Root question:** How do the Worker and the file server keep one name for each header of the files preview?
- **Options:**
  - **D.** Add both names to the parity test `crates/cnd-runner-interface/tests/constants.rs`, which already reads TypeScript constants from `src/shared/`. Effort: Small.
  - **E.** Keep the names in one JSON file under `src/shared/`. `src/shared/previews.ts` imports it, and `cnd-runner-interface` embeds it with `include_str!`. A bad file fails the build or the tests. Effort: Medium.
- **Left out:** A generator of Rust and TypeScript constants: `ts-rs` exports only types, and `src/shared/README.md` keeps runtime constants in TypeScript. A test that reads the protocol docs: the `testing` skill gives docs no test.
- **Wider fix:** E, because one definition prevents the drift.
- **Previous examples:** `src/shared/preview-ingress-config.json` with `crates/cnd-relay/src/ingress_config.rs`.
- **Related:** None.
- **Recommendation:** E. It removes the second definition with a pattern that the repository already uses.
- **Action:** fix after merge, apply E, because it changes product code in both languages outside the diff.
