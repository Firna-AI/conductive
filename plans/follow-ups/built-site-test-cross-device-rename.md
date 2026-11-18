# Site build test fails on cross-device rename

- **Severity:** Medium. **Effort:** Medium. **Confidence:** High. **Harder later:** No.
- **Kind:** Post-merge task.
- **Added:** 2026-11-10, from the CI of pull request #155 on branch `calummoore/codex-models-addition`.
- **Location:** `buildSiteAssets` in `worker/marketing/built-site.test-support.ts:31-42`, and `worker/marketing/built-site.test.ts`.
- **Reason:** The pull request that met the failure changes only the model list in `wrangler.jsonc`, so a separate task must find the cause.

- **Terms:**
  - **Built site test:** `worker/marketing/built-site.test.ts`. It builds the Astro marketing site once and serves the built files through the Worker.
  - **Prerender folder:** `.astro/.prerender/` in the repository. The static build of Astro writes assets there first, then moves them to the output folder.
- **Background:**
  - `buildSiteAssets` runs `node_modules/.bin/astro build --force --outDir <folder>`. The folder is a new folder in the system temporary folder, from `mkdtemp(join(tmpdir(), 'conductive-site-'))`.
  - The static build of Astro moves each built asset from the prerender folder to the output folder with `rename`. The move is in `ssrMoveAssets` of `node_modules/astro/dist/core/build/static-build.js`.
  - `rename` cannot move a file from one file system to another. It then fails with `EXDEV`.
  - On 2026-11-10, the complete gate in GitHub Actions ran twice on the same tree: the merge of commit `a2b8fd85` into `main` at `2f329f9d`. The first run passed this test. The second run failed the file before any of its tests ran:

    ```text
    FAIL  worker/marketing/built-site.test.ts [ worker/marketing/built-site.test.ts ]
    Error: Command failed: node_modules/.bin/astro build --outDir /tmp/conductive-site-X7uqG6
    EXDEV: cross-device link not permitted, rename '/home/runner/work/remote-code/remote-code/.astro/.prerender/_astro/agents-desktop-dark.JfzcjB9W.webp' -> '/tmp/conductive-site-X7uqG6/_astro/agents-desktop-dark.JfzcjB9W.webp'
      ❯ ssrMoveAssets node_modules/astro/dist/core/build/static-build.js:365:3
    ```

  - That commit got no rerun. Then `main` added `--force` to the build command, in "feat(marketing): add Markdown product documentation" (#133). After that change, the test passed in two CI runs and in two local runs of the full suite.
  - The local runs cannot show the failure, because the repository and `/tmp` were on one file system there.
  - Updated 2026-11-12, from branch `calummoore/porto-a8k1`: a Conductive workspace reproduced the failure with `--force` in the command. The repository was at `/home/user/code/remote-code`, on another file system than `/tmp`. The same tree passed the test from a copy under `/tmp`. So `--force` does not remove the case, and the two file systems are the cause:

    ```text
    Error: Command failed: node_modules/.bin/astro build --force --outDir /tmp/conductive-site-jGBQ6N
    EXDEV: cross-device link not permitted, rename '/home/user/code/remote-code/.astro/.prerender/_astro/agents-desktop-light.CIVfhA5L.webp' -> '/tmp/conductive-site-jGBQ6N/_astro/agents-desktop-light.CIVfhA5L.webp'
    ```

  - On 2026-11-13, `npm run check` reproduced the failure in `/home/user/code/remote-code`, with `--force` still present.
  - Astro could not rename `InterVariable.DiVDrmQJ.woff2` from the repository's `.astro/.prerender/_astro/` folder into `/tmp/conductive-site-*/_astro/`.
  - The 12 site tests then passed from checkouts under `/tmp` on main at `246e2d787025de390f0de633801a60172e00cfd2` and on the merged tree.
  - This confirms that `--force` does not remove the failure when the folders are on separate file systems.
  - On 16 November 2026, the main merge into `calummoore/lima-gc9c` reproduced `EXDEV` in the complete gate and in one selected rerun.
  - Astro could not rename a built asset from `.astro/.prerender/_astro/` into `/tmp/conductive-site-*/_astro/`.
  - All 12 site tests then passed unchanged with `TMPDIR` set to `/home/user/code/remote-code/.context/merge-347/tmp`.
  - This keeps the temporary output on the checkout's file system. No assertion, build command, or timeout changed.
  - On 18 November 2026, pull request #465 merged main `2a0818f3d0d945b61b21c677c6e2008764a1cc50` into its branch. The merge commit was `1e5070a3c3a1ed6c21cfabcb82285c1faafd9341`. The full gate and one focused rerun reproduced the error.
  - The full gate passed every static check and 4,218 tests. The 12 site tests could not run after setup failed with `EXDEV: cross-device link not permitted, rename` from `.astro/.prerender/` into `/tmp/conductive-site-*/`.
  - A focused run of `worker/marketing/built-site.test.ts` then passed all 12 tests with `TMPDIR=/home/user/code/remote-code/.context/merge-pr-465/tmp`. No source, assertion, or timeout changed. GitHub CI passed its complete gate on the same commit.
  - On 18 November 2026, the complete gate of branch `calummoore/lima-djh5` in `/home/user/code/remote-code`, on main `7eab46042`, reproduced `EXDEV` for `.astro/.prerender/_astro/agents-desktop-light.DaL090yX.webp`.
  - All 12 site tests then passed unchanged with `TMPDIR` set to a folder under `/home/user/code/remote-code/.context/`.
- **Task:**
  - Find out when the build moves an asset out of the prerender folder, and why the first run did not fail. A cold image cache and two builds that share the prerender folder are suspected sources. Neither is confirmed.
  - Find out whether `--force` removes the case.
  - When it does not, make the build write to a folder on the file system of the repository, such as a new folder in a git-ignored folder of the repository. Remove the folder on every exit, as the test does now.
  - Keep every existing assertion. Add no retry, sleep, skip, quarantine, or longer timeout.
- **Impact if no action:** The complete gate can fail now and then in GitHub Actions and need another run.
- **Needs:** The repository, Node 24, and a machine where the repository and the system temporary folder are on two file systems, such as a GitHub Actions runner.
- **Done when:** The cause is recorded. The test builds into a folder where the move stays on one file system, or the record shows that `--force` removes the case. The complete gate passes in GitHub Actions.
