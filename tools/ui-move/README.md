# The shared UI move

This script moved the shared UI of the app from `docs/mockups/src/` into
`src/ui/`. The shared UI is the parts, the CSS Modules, the design tokens,
the theme, the global stylesheet, the fonts, and the text modules that the
app, the Worker, and the Mac app use. `brand.ts` moved to
`src/shared/brand.ts`. [map.json](map.json) lists each old path with its
new path. The [UI README](../../src/ui/README.md) says what lives in
`src/ui/` now.

## Fix an open branch

A branch that started before the move still names the old paths. Fix it
after you merge `main`:

1. Run `git merge origin/main`. Git follows the renames, so most edits of
   a moved file land in its new place.
2. Resolve each merge conflict, and commit the merge.
3. Run `node tools/ui-move/main.ts apply`. It moves each file that the
   branch still has at an old path, and it rewrites each path that names
   an old place. Then it plans again. A branch can add an import of a
   mockup module that the map does not name. `apply` then moves that
   module too, adds it to `map.json`, and rewrites its paths.
4. Run `npm run typecheck`, `npm run mockups:check`, and `npm run lint`.
5. Check the paths that the script lists at the end by hand. They name no
   file or folder.

A second run of `apply` changes nothing. When the new plan reaches a
fixture or another mockup-only module, `apply` names the chain and adds
nothing to the map. Change that import by hand, then run `apply` again.

## What the script does

- `plan` adds new paths to `map.json`. The map keeps each earlier path,
  because it is the record of every move. The plan starts from each
  relative import in `src/`, `worker/`, and `desktop/` that names a file
  in `docs/mockups/src/`. Development code and tests do not count. Then it
  adds each file that a moved file imports, also by a type import or a
  CSS `url()`. A licence file moves with the files beside it. The plan
  stops when a moved file reaches a fixture, an entry, a catalogue path
  module, `ScreenLink`, the renderer, or a module that imports Mokly.
- `apply` moves each file of the map with `git mv`. Then it rewrites the
  paths in each text file of the repository:
  - each quoted relative path in code and CSS, and each CSS `url()`;
  - each relative Markdown link;
  - each path from the repository root, such as a mention of
    `docs/mockups/src/brand.ts` in a comment.
- A relative path changes when it names a moved file, or when the file
  that holds it moved. The new path keeps the ending of the old one, such
  as no extension, `.js`, or `.ts`.
- `apply` leaves the plans under `plans/` as they are, because a plan is a
  record. It changes the follow-up items under `plans/follow-ups/`.
