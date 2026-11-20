# The design of the model menu

This page belongs to [the design](design.md), which gives the style, the
layouts, the design tokens, and the shared parts. This page gives the model
picker of every composer, its menu with favourites, and the Favourites
section of Preferences. They come from the favourites that the user chose on
16 November 2026, and from decisions 1 A, 2 A, and 3 A of the model
favourites of 20 November 2026. [The catalogue](catalogue.md) lists their
pages under `app/model-favourites`.

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
    the list in place of the menu, with Back at its top. A pick keeps the
    effort when the model offers it, and otherwise takes the nearest lower
    effort.
  - The efforts of the current model under the Effort label, then the Fast
    switch of a model that offers fast mode. They change the current
    choice, and the menu stays the same.
- The menu has no row that adds a favourite. The Favourites section of
  Preferences is the only place that adds, orders, and removes them, from
  decision 2 A.
- A picker leaves out each model that the model list of an own endpoint
  does not name, and each picker on the org login follows the list of the
  org endpoint. The menu then leaves out each favourite on such a model,
  and All models leaves out the model, as `app/model-favourites/endpoint`
  shows. The favourite stays saved.
- With no favourite to show, the menu lists every model at its top, then
  the efforts and Fast. It has no All models row, as
  `app/model-favourites/no-favourites` shows. The picker of a Favourites
  row shows the same menu, because the row sets one favourite.
- An account that never changed its favourites gets the starting
  favourites of the deployment setting `CONDUCTIVE_STARTING_FAVOURITES`,
  from decisions 1 A and 3 A, as `app/model-favourites/new-account` shows.
- `FavouritesSection` in `src/components/settings/` draws the Favourites
  section, the first section of the Preferences tab, above New workspaces.
  - The rows follow the order of the menu. Each row has a drag handle, the
    picker of the favourite, and ×, which removes it.
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
