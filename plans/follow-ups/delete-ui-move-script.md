# Delete the shared UI move script

- **Severity:** Low. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Post-merge task.
- **Added:** 2026-11-23, from branch `calummoore/components-location-misunderstood-d7lu`, the plan of the shared UI move.
- **Location:** `tools/ui-move/`, its entry in `knip.jsonc` and `tsconfig.node.json`, and the link to it in `src/ui/README.md`.
- **Reason:** Branches that started before the move still need the script after the merge.

- **Terms:**
  - **Shared UI:** the parts, styles, tokens, fonts, and words that the app and the mockups both use. Since the user's decision of 2026-11-23 they live in `src/ui/`, not in `docs/mockups/src/`.
  - **Move script:** `node tools/ui-move/main.ts apply`. It moves each file of `tools/ui-move/map.json` that a branch still has at its old path, rewrites each path that names an old place, and moves new shared imports of the branch. `tools/ui-move/README.md` gives the steps for an open branch.
- **Background:** The change that moved the shared UI into `src/ui/` added the script, so that each open branch can fix its imports after it merges `main`. The user chose this on 2026-11-23: one scripted move, with a path map for the open branches.
- **Task:** When no open branch needs the script, delete `tools/ui-move/`. Remove `tools/ui-move/main.ts` from the `entry` list of `knip.jsonc` and `tools/ui-move` from the `include` list of `tsconfig.node.json`. Remove the link to `tools/ui-move/README.md` from the "Related docs" list of `src/ui/README.md`. Search `docs/`, `plans/`, and every `README.md` for `tools/ui-move` and remove each live mention.
- **Impact if no action:** The repository keeps a one-time script and its map, which Knip, the typecheck, and agents keep reading.
- **Needs:** No open pull request that started before the move. `gh pr list --state open` and the base commit of each branch show it.
- **Done when:** `tools/ui-move/` is gone, `npm run typecheck`, `npm run lint`, and `npm run exports:check` pass, and no live doc names the script.
