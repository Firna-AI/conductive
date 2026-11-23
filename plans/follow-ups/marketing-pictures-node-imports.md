# Nothing checks the capture command's Node imports

- **Severity:** Medium. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Needs decision.
- **Added:** 2026-11-18, from branch `calummoore/fix-marketing-picture-command-import-hfoi`, which fixed the import that broke the command.
- **Location:** `docs/mockups/src/paths.ts:266`, the import that broke. `src/ui/screens/marketingPictureCaptures.ts:9`, the only statement of the rule. `tools/marketing-pictures/tsconfig.json`, a `NodeNext` config that no script runs. The `typecheck` script of `package.json`. `tools/marketing-pictures/run.ts`, the command.
- **Reason:** The recommended check adds a step to the gate, which only the user can approve. The user chose to record this class for a later task.

- **Source:** Implementation. **Category:** Test.
- **Terms:**
  - **Capture command:** `npm run marketing:pictures` and `npm run marketing:preview`. Both run `node tools/marketing-pictures/run.ts`, which builds the mockups and captures the marketing pictures in Chrome.
  - **Native Node:** Node 24 when it runs a `.ts` file directly, with no bundler. It loads a relative import only when the import names the file, as in `'./bannerPaths.ts'`.
  - **Extensionless import:** a relative import with no file extension, as in `'./bannerPaths'`. Vite resolves it. Native Node refuses it.
  - **Shared module:** a module that the capture command and the Vite builds both import, such as `docs/mockups/src/paths.ts`.
  - **Gate:** `npm run check`, and the CI jobs `Static checks`, `Tests`, and `Complete gate` that run it.
- **Background:**
  - `run.ts` imports seven tool modules. Through `capture-pictures.ts` and `capture-preview.ts`, the command loads these shared modules:
    - `docs/mockups/src/paths.ts`, which re-exports `docs/mockups/src/bannerPaths.ts`
    - `src/ui/screens/marketingPictureCaptures.ts` and `marketingPictureList.ts` beside it
    - `src/shared/brand.ts` and `src/marketing/features.ts`
  - The rule lives only in a comment at `marketingPictureCaptures.ts:9`: "The import names the `.ts` file, because Node needs it." No README states it. The other shared modules have no such comment.
  - `docs/mockups/README.md` requires a new capture after each change to a screen that a marketing picture shows.
  - On 18 November 2026, commit `424bf736d` (#423) moved two path groups from `paths.ts` into the new `bannerPaths.ts`. Before it, `paths.ts` had 299 lines. The lint rejects a file over 300 lines.
  - That commit added `export { barPaths, checksPaths } from './bannerPaths'` at `paths.ts:266`. The path of the break was `run.ts`, then `capture-preview.ts`, then `paths.ts`, then `bannerPaths.ts`.
  - On `main` at `be4add08c`, with Node v24.22.1, `npm run marketing:pictures` then failed before the mockup build:

    ```text
    Error [ERR_MODULE_NOT_FOUND]: Cannot find module '<checkout>/docs/mockups/src/bannerPaths' imported from <checkout>/docs/mockups/src/paths.ts
    ```

  - The branch that added this item changed the import to `'./bannerPaths.ts'`. The full command then passed and wrote the 28 pictures and the share card.
  - No step of the gate saw the break:
    - CI runs `npm run check:static` and the Vitest shards. Neither runs the capture command.
    - `npm run typecheck` and `npm run mockups:typecheck` use `bundler` resolution, which accepts an extensionless import.
    - `npm run mockups:check` builds the mockups with Vite, which resolves it.
    - `src/marketing/picture-capture.test.ts` and `src/marketing/share-preview-capture.test.ts` import the capture modules. Vitest resolves their imports with Vite.
    - ESLint has no rule for import extensions.
  - `tools/marketing-pictures/tsconfig.json` sets `module` and `moduleResolution` to `NodeNext`. The root `tsconfig.json` does not reference it. No npm script or CI step runs it, so `npm run check:static` does not run it. The commit that added it, `30eccdefa` on 6 November 2026, names it among its manual checks.
  - On 18 November 2026, after the fix, `node_modules/.bin/tsc -p tools/marketing-pictures/tsconfig.json` passed with exit 0.
  - Under `NodeNext`, TypeScript requires the extension on each relative import. This holds here because the root `package.json` sets `"type": "module"`.
  - Two other programs that native Node runs already have a check in the gate:
    - `npm run desktop:typecheck` checks the desktop scripts with `NodeNext` resolution, from `desktop/tsconfig.json`.
    - `worker/terminal/bridge-release.test.ts` runs the bridge's `main.ts` in native Node without arguments, so that it loads every module.
  - From 11 to 18 November 2026, 21 commits on `main` changed `paths.ts`. `capture-preview.ts` imports it only to read one path, `paths.app`.
- **Problem:** No step of the gate loads the capture command in native Node, or checks its imports with Node resolution. So a shared module can break the command while the gate passes.
- **Impact if no action:** The next extensionless import in a shared module breaks the command again. The break shows only when someone must capture pictures, and that work then waits for a fix.
- **Root question:** How do changes to the shared modules keep the capture command runnable?
- **Options:**
  - **A.** Keep the manual check. The next person who runs the command finds the break and fixes it. It costs nothing now. It did not stop this break. Effort: Small.
  - **B.** Write the rule in `docs/mockups/README.md`, beside the `src/paths.ts` row, and in `tools/marketing-pictures/README.md`. List the shared modules there. It adds no check. Commit `424bf736d` edited that README row while the rule was only in a comment of another file. Effort: Small.
  - **C.** Add `tsc -p tools/marketing-pictures/tsconfig.json` to the `typecheck` script of `package.json`. `npm run check:static` and the `Static checks` job then run it. `NodeNext` rejects an extensionless relative import anywhere in the import graph of the command. `desktop/tsconfig.json` already guards the desktop scripts in this way. It checks types and imports, not a run. The config already passes on the fixed code. The task still shows that the step fails on the old line. It adds a check to the gate. Effort: Small.
  - **D.** Add a native Node load test to the gate. `run.ts` builds and captures as soon as it loads, so a test cannot simply import it. Give `run.ts` a mode that loads every module and does no work, as the bridge's `main.ts` does without arguments. A Vitest test runs that mode with `process.execPath` and expects a clean exit. It catches each failure that stops Node from loading the command, also one that types do not show. It needs the new mode and a test. It adds a check to the gate. Effort: Small.
  - **E.** Start the command with a Node resolve hook, loaded with `node --import`, that adds `.ts` to an extensionless relative import. It adds no check and no package. It covers only the missing extension. It makes the command load imports that C rejects. It changes how the command loads every module, so it is a wider change than the one-line fix of the import. Effort: Small.
  - **F.** Run the command through a bundler, such as Vite's module runner or an esbuild bundle. The command then resolves imports as the mockups do, so the class cannot recur. The `.ts` rule then goes away for the command. It needs a direct dependency, and a launcher or a build step. An esbuild bundle in another folder also breaks the asset paths that `capture-preview.ts` builds from `import.meta.url`. Effort: Medium.
- **Left out:**
  - A Vitest test that imports the capture modules: it fails the goal, because Vitest resolves imports with Vite. The two capture tests above already import them.
  - Adding the tool files to `tsconfig.node.json`: it fails the goal, because that config uses `bundler` resolution.
  - The `.ts` suffix on every relative import under `docs/mockups/src/`: C is better on every point. C asks for the suffix only in the modules that Node loads, and it stops the next break.
  - An ESLint rule for import extensions: C is better on every point. The rule needs a new plugin and a hand-kept list of the files that Node loads.
  - A Git pre-commit hook: it fails the goal, because it runs only on machines that install it. The gate must still run the same check.
  - Taking `paths.ts` out of the graph of the command: it fails the goal, because the other shared modules stay in the graph. The share card then also needs a second copy of its page path.
  - A full capture run in CI: C is better on every point for this question. It finds the same break in seconds, with no Chrome, fonts, or picture writes in CI.
- **Wider fix:** F removes the class for the command. C and D detect it in the gate. E removes only the case of the missing extension.
- **Previous examples:** Commit `424bf736d` (#423), above. `plans/follow-ups/` records no other case.
- **Related:**
  - `plans/follow-ups/marketing-pictures-go-stale.md`: the same command, with a different problem, stale pictures. Its option C, captures in CI, would also load this graph in native Node.
  - `plans/follow-ups/terminal-bridge-node-typecheck.md`: a similar choice for the terminal bridge. Its option C also runs a Node-only tsconfig in the typecheck script.
- **Recommendation:** C. It wires a config that already exists into the gate with one script line, as the desktop typecheck does for the desktop scripts. F best protects the command, because it removes the class, but it adds a runner to a plain Node tool.
- **Action:** ask the user, because the recommended option adds a check to the gate, and only the user can approve a new check.
- **Answer:** On 18 November 2026, the user chose to fix this regression in the branch that added this item. The user also chose to record this class here for a later task. That choice approves no check or gate. The fix does not wait for this decision. No option is chosen yet, so the item still needs a decision.
