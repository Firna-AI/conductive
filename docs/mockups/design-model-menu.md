# The design of the model menu

This page belongs to [the design](design.md), which gives the style, the
layouts, the design tokens, and the shared parts. This page gives the model
picker of every composer, its menu with favourites, and the Favourites
section of Preferences. They come from the favourites that the user chose on
16 November 2026, from decisions 1 A, 2 A, and 3 A of the model favourites
of 20 November 2026, and from decisions 4 D, 5 B, and 6 of 22 November
2026.
[The catalogue](catalogue.md) lists their pages under
`app/model-favourites`.

A favourite is a full choice: a model, an effort, and fast mode. A member
keeps up to five. A favourite has no name of its own, so it shows what it
runs.

- `ModelPicker` in `src/components/chat/` sets the model, the effort, and
  the speed of the next message in every composer: a session, New
  workspace as a page or a dialog, the default of new workspaces in
  Preferences, and the prompt of an automation. Its trigger names the model,
  such as "Opus 5.5 High", with the effort and Fast in the muted colour. It
  names no agent brand.
- `FavouritesMenu` beside it draws the open menu, and `favouritesMenu` in
  `pickers.ts` gives its rows, in this order:
  - The favourites, with no heading. Each row shows the model, then its
    effort and Fast in the muted colour, such as "Opus 5.5 Max Fast". The
    menu marks a favourite only when it matches the current choice exactly,
    with its fast mode. A changed effort or Fast marks no favourite, as
    `app/model-favourites/changed` shows.
  - In a session with messages, each favourite and each model of the other
    agent ends with the external link icon, because it opens a new session
    with the draft, from decision 51. A screen reader says "New session"
    for the icon.
  - A line, then All models, which ends with an arrow. On a computer its
    submenu opens beside the menu, level with its row. It lists every model
    in two groups, the Claude models and the Codex models. A phone shows
    the list in place of the menu, with Back at its top, as
    `app/model-favourites/all-models` shows in a session and
    `app/new-workspace/all-models` shows in New workspace. A pick keeps the
    effort when the model offers it, and otherwise takes the nearest lower
    effort.
  - A line, then Effort, which shows the current effort in the muted
    colour, such as "Effort High", and ends with an arrow. Its submenu
    opens as the submenu of All models does, and lists the efforts of the
    current model, with the current effort marked, as the `effort` state
    of the model picker component shows. The Fast switch of a model that
    offers fast mode follows Effort. They change the current choice. A
    pick of an effort closes the menu. Fast keeps the menu open. The user
    asked for the Effort submenu on 23 November 2026.
- On a phone, every model picker opens its menu beside the picker, as on a
  computer, and not in a sheet: a session, New workspace, the default of
  new workspaces, an automation, and each Favourites row, from decision
  5 B. The other menus, such as Restart and Add a favourite, open in a
  sheet on a phone.
- The menu has no row that adds a favourite. The Favourites section of
  Preferences is the only place that adds, orders, and removes them, from
  decision 2 A.
- A picker leaves out each model that the model list of an own endpoint
  does not name, and each picker on the org login follows the list of the
  org endpoint. The menu then leaves out each favourite on such a model,
  and All models leaves out the model, as `app/model-favourites/endpoint`
  shows. The favourite stays saved.
- With no favourite to show, the menu starts with All models, then
  Effort and Fast, from decision 6. More models will come, and a flat
  list of every model does not scale. So the menu keeps the same short
  shape with and without favourites, as `app/model-favourites/no-favourites`
  shows. The submenu then starts level with the top of the menu. The
  picker of a Favourites row shows the same menu, because the row sets one
  favourite.
- An account that never changed its favourites gets the starting
  favourites of the deployment setting `CONDUCTIVE_STARTING_FAVOURITES`,
  from decisions 1 A and 3 A, as `app/model-favourites/new-account` shows.
- `FavouritesSection` in `src/components/settings/` draws the Favourites
  section, the first section of the Preferences tab, above New workspaces.
  - The rows follow the order of the menu. Each row has a drag handle, the
    picker of the favourite, and ×, which removes it.
  - With no favourite, the section shows no list. A muted line in its
    place says "Add a favourite to show it first in the model menu.", and
    Add a favourite is on, as `app/model-favourites/preferences/empty`
    shows.
  - Add a favourite opens the list of every model, in the two groups of
    All models, from decision 4 D. The list marks no model, and it has no
    efforts and no Fast row. A computer opens it below the button. A phone
    opens it in a sheet, because it is a menu of the section, not a model
    picker. `app/model-favourites/preferences/add` shows it.
  - A pick adds the model at the end of the list, at the effort of the
    default of new workspaces, or at the nearest lower effort of the model,
    or at its lowest effort, with Fast off. When the list already holds
    that choice, the pick takes the nearest effort of the model that no
    favourite holds, lower efforts first, as
    `app/model-favourites/preferences/add/added` shows. The list then saves
    at once, and the keyboard focus moves to the picker of the new row.
  - When no effort of the model is free, the pick adds nothing and saves
    nothing. A muted line under the list names the model, such as "Fable
    5.1 is already a favourite at every effort.", until the next pick or
    change, as `app/model-favourites/preferences/add/no-free-effort` shows.
    A screen reader reads the line out.
  - Add a favourite is off while the list holds five, and a muted line
    says that the menu shows five favourites at most.
  - A favourite that the menu leaves out because of an own endpoint keeps
    its row. Its picker shows at half strength, as a menu item that is off
    does, and a muted line under it says why. Its handle, its picker, and ×
    still work, so a pick of a listed model shows the favourite in the menu
    again, as `app/model-favourites/preferences/hidden` shows.
  - Each change saves at once. A failed save keeps the saved list, and the
    error shows under the list in the rose colour, with an alert icon, as
    `app/model-favourites/preferences/not-saved` shows.
