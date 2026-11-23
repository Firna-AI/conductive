# Registered parts

Mokly's Changes view compares the catalogue of a branch with `origin/main`.
A shared part of the catalogue can be registered with Mokly's
`defineComponent`, so that Changes lists an edit to the part under the
part, not under each screen. Many shared parts are registered, and some
are not yet. The `components` folder of the catalogue lists each
registered part.

A registered part gets one Changes row for each of its own pages that
looks different: its own page and each variant. This is also true when
the edit is in a plain child part that it draws, such as `MarkGrid`
inside the workspace mark, so one edit can give rows to several parts.
The screens that use a changed part show under its Affected screens, and
they get no rows of their own for that edit. Without the registration,
the same edit gives one row for each screen and each variant that looks
different. A trial edit to one state of the workspace mark gave 405 rows
before its registration, and 1 row after it, for the one variant that
shows that state.

## Where a registration lives

- A registered part has an entry module under
  `docs/mockups/src/entries/components/<folder>/<File>.mockup.tsx`, from
  the repository root. Its source file is a shared part in
  [`src/ui/components/<folder>/`](../../src/ui/components/), a part that
  only the mockups use in `docs/mockups/src/components/<folder>/`, or a
  file of helper parts in `docs/mockups/src/screens/`. Each source file
  has one entry module, with the same folder and file name. The entry
  module exports one `defineComponent` for each registered part of the
  file.
- A part that moves to `src/ui/` keeps its entry module, so its catalogue
  path does not change.
- The path of a part is `components/<folder>/<part>`, in kebab-case, such
  as `components/workspaces/workspace-mark`. The `components` folder comes
  last in the catalogue.
- A part has a JSON prop schema, its own page, and saved variants. Each
  part has at most five entries: its own page and four variants.
- Screen components, such as `WorkspaceScreen`, are not registered,
  because their `defineScreen` entries already draw them. Link helpers and
  context providers that draw nothing of their own are not registered
  either.

## How a screen uses a part

- A mockup screen and a part that only the mockups use render the
  wrapper, `part.Component`, in place of the plain part.
- The app imports the shared parts from
  [`src/ui/`](../../src/ui/README.md) at the repository root. The wrapper
  works only inside a Mokly render, and it throws outside one. So each
  file that the app reaches lives outside the mockups, in `src/ui/` or in
  another folder of the app. Such a file never imports an entry module,
  and it renders only plain parts.
- Each use of a wrapper has a `moklyInstance` name in kebab-case. The name
  comes from a stable key of the fixture, such as the key of a workspace,
  with the list in front: `sidebar-apple-pay`. A name never comes from a
  position.
- Content that a screen supplies keeps the scope of its outermost slot,
  also inside the slots of other registered parts. Only the own render of
  a registered part starts a new scope. So a name is unique across a whole
  frame area: the main area, the sidebar, the overlay, the phone column,
  or one marketing picture. A repeat fails the build with
  `conflicting fragment input`, and the message names no entry.
- Props are JSON. An icon is a key from
  `src/entries/components/common/icons.ts`. Menu entries are the data of
  `src/entries/components/common/menuEntries.tsx`. React content goes in a
  declared slot. A callback is not a prop: a link takes a catalogue path.
- A wrapper fails on an undefined value. Pass optional props through
  `defined()`, and nested data from a builder through `plainData()`, from
  `src/defined.ts`. `instanceKey()` and `shortcutKey()` in
  `src/instanceKey.ts` make names from keys that are not in kebab-case.
- A part that draws another layout on a phone takes an optional
  `viewport`, with the render context as the fallback on its own pages.
  The Mac app views and some marketing pictures draw a screen of the other
  viewport.
- The own page of a part draws the part alone, never a whole screen, so
  that the part does not claim the CSS of the screen. A variant slot uses
  parts whose CSS the screens load already, or an empty placeholder.

## What Changes still shows per screen

- An edit to a part that has no registration yet.
- A change of a design token, a custom property, or a `@keyframes` rule.
  Mokly cannot trace those rules to elements.
- A CSS rule of a state that no own page of the part shows.
- An edit to a part whose use stays plain: the parts in chat text,
  message blocks, Markdown blocks, and code lines, which have no stable
  key, and every part in a file that the app reaches.
- The first registration of a part lists each screen that draws it once,
  with the reasons `structure` and `material`, also when the picture is
  the same.

## What Changes can miss

Mokly compares a registered part inside a screen by its name and its
props, not by what it draws. So a change that reaches a part only through
React context can give no row at all: no row for the part, no row for the
screen, and no entry under Affected screens. Examples are the Mac app
state, the touch sizes, and the workspaces of the chat. `ShortcutTip`
draws its key by the Mac app state, and `ActionButton` takes its touch
height from the touch sizes, and none of their own pages shows those
states. Check such a change on the screens that draw it.

## The build

The strict build with the Changes comparison needs more than 7 GB of
memory for the whole catalogue. On a smaller computer, check with
`npx mokly build --strict --no-changes --sidecars 2`. CI runs the full
`npm run mockups:check`.
