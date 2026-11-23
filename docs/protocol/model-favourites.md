# Model favourites

This doc holds the requirements and the decisions in force for model
favourites: the full choices that the model menu lists first. It covers
the rows and the marks of the menu, All models, the hidden favourites, the
Favourites section of Preferences.
[Model favourites: the account](model-favourites-account.md) gives the
starting favourites and the account routes. [Fast mode](fast-mode.md)
covers the Fast row of the menu.
The terms are those of the [architecture doc](../architecture.md#terms),
those of [Fast mode](fast-mode.md#terms), and those below.

A decision number names a dated record, as
[Decision numbers](../architecture.md#decision-numbers) says. A model
favourites decision number, such as model favourites decision 1, names the
dated record of one decision of the change that adds model favourites. Its
plan keeps these records while the change is open. Its pull request keeps
them after the merge. An org login decision number names a decision of the
change that adds the org logins, as
[Tokens and secrets](tokens-and-secrets.md) says. The
[mockup catalogue](../mockups/catalogue.md) draws the favourites at
`app/model-favourites` and its child pages.

## Terms

- **Favourite:** a choice that a member keeps for the model menu: a model
  with its agent, an effort, and fast mode.
- **Model menu:** the menu that a model picker opens.
- **Saved default:** the choice of Model and effort on the Preferences tab.
  New workspace and "+" start from it.
- **App default:** the default choice of the deployment, in
  `CONDUCTIVE_DEFAULT_CHOICE`, for a member without a saved default.
- **Starting favourites:** the favourites of an account that never saved
  favourites.

## Favourites

- A member keeps up to five favourites. The user chose favourites on
  16 November 2026.
- A favourite has no name of its own. It shows what it runs: the label of
  its model, its effort, and Fast while its fast mode is on, such as
  "Opus 5.5 Max Fast".
- Reason: a member uses a few choices most of the time. One press then
  picks a full choice, and the member still sees the real model names.
- The favourites belong to the account. So they apply in each org, in each
  browser, and in the Mac app.
- The favourites do not change the saved default. New workspace and "+"
  still start from it, or else from the app default. When the favourites
  do not hold that choice, the menu of a new workspace marks no favourite.
- The user chose favourites in place of these ideas on 16 November 2026:
  - Modes, such as Quick, Balanced, Deep, and Ultra, in place of the model
    and the effort.
  - A depth ladder: one slider of steps, each a model at an effort.
  - Commands in the message, such as `/max`, for one message.
  - Auto: the app picks the effort, and Redo asks for more.
  - A compare panel with a card for each model.
  - Layered defaults for each repository, the member, and the org.
- No key picks a favourite. An org has no favourites of its own.
- The agent tools do not use the favourites. They keep their model list and
  the saved default, as [Models](create-call-lists.md#models) says.

## The model menu

- Each model picker of the app opens the model menu with favourites: the
  composer of a session, New workspace as a page and as a dialog, Model and
  effort on the Preferences tab, and the prompt of an automation. The
  pickers of the [Favourites section](#the-favourites-section) are the one
  exception.
- The menu shows these rows, in this order:
  - Each favourite that the menu shows, in the order of the favourites,
    with no heading.
  - A line, then All models.
  - A line, then Effort, which shows the current effort in the muted
    colour, such as "Effort High". Its submenu holds the efforts of the
    current model.
  - The Fast row of a model with fast mode, as
    [The Fast switch](fast-mode.md#the-fast-switch) says.
- A pick of a favourite makes it the current choice, with its model, its
  effort, and its fast mode.
- After a pick, Effort and the Fast row change only the current
  choice. The favourite stays as it was. The user asked on 16 November
  2026 that the effort and Fast stay open to change after a pick.
- The efforts are in a submenu of Effort, as the user chose on
  23 November 2026. This replaces the choice of 16 November 2026, which
  kept the efforts as rows of the menu. Reason: the menu stays short, and
  the Effort row still shows the current effort.
- The submenu of Effort opens as the submenu of All models does, as
  [All models](#all-models) says: beside the menu on a computer, and in
  place of the menu, with Back at its top, in the phone layout.
- The menu has no row that adds a favourite (model favourites decision
  2 A). [The Favourites section](#the-favourites-section) gives the reason.

### The marks

- The menu marks a favourite only when it matches the current choice
  exactly: the same agent, model, effort, and fast mode. So after a change
  of the effort or of fast mode, the menu can mark no favourite.
- Reason: the menu then never shows a changed choice as a favourite.
- The submenu of Effort marks the current effort. All models marks the
  current model.

### A favourite of the other agent

- A favourite of the other agent follows the rule of a model of that agent
  in [Messages](messages-and-attachments.md#messages), because a session
  keeps its agent. In a session with messages, it opens a new session with
  the draft, at the effort and the fast mode of the favourite.
- Its row then ends with the same icon as a model of the other agent. A
  screen reader says "New session" for the icon.

### All models

- All models opens a submenu with every model that the picker offers, in
  one group for each agent. Each model of the other agent keeps its rule
  and its icon there.
- On a computer, the submenu opens beside the menu. In the phone layout,
  its list takes the place of the menu, with Back at its top. Back shows
  the menu again.
- Reason: the phone layout has no room for a submenu beside the menu.
- In the phone layout, each model picker opens its menu beside the picker,
  also the pickers of New workspace, of the default of new workspaces, of
  an automation, and of the Favourites rows (model favourites decision
  5 B). Each other shell menu, such as Restart, opens as a sheet. Reason:
  each model picker then opens in one way. A sheet for these pickers was
  rejected, because the session picker would still open its menu beside
  it.
- A pick in All models changes the model, and with it the agent. It keeps
  the effort when the new model offers it. Otherwise it takes the nearest
  lower effort of the model, or its lowest effort when it has no lower one.
  [Changes of fast mode](fast-mode.md#changes-of-fast-mode) gives its fast
  mode.

### A menu with no favourites

- When the menu has no favourite to show, it starts with the All models
  row. Effort and the Fast row follow, as in each other menu.
- Reason: the user chose this on 22 November 2026 (model favourites
  decision 6), because more models will come, and a flat list of every
  model does not scale. A list of every model at the top of the menu was
  rejected for that reason.
- This menu shows after the member removes each favourite. It also shows
  when the menu hides each favourite.

## Hidden favourites

- A favourite stays saved when the model list of the app no longer holds
  its model. The menu leaves it out.
- A favourite also stays saved when a picker hides its model, as
  [Own endpoint logins](own-endpoint-logins.md#the-model-list) says. The
  menu of that picker leaves it out, and All models leaves out the model.
- So each picker on the org login leaves out each favourite whose model
  the list of the org endpoint does not name (org login decision 3 A).
- Reason: a pick then never chooses a model that the picker hides. The
  favourite shows again when the list names its model again.
- Preferences shows a favourite greyed in two cases, with a line under its
  row that says why:
  - The model list of the app no longer holds its model. The line says
    "Hidden from the model menu, because `<model ID>` is no longer
    available." The line names the model ID, because the model list gives
    no label for a model that it does not hold.
  - The personal login of the member for its agent is an own endpoint, and
    the pickers of the member hide its model. The line says "Hidden from
    the model menu, because your endpoint does not list `<model>`." Here
    `<model>` is the label of the model.
- Preferences does not grey a favourite that only the list of an org
  endpoint hides. Reason: that list applies only to the sessions on the
  org login, and only an admin sees it.
- A greyed row keeps its handle, its picker, and ×. Its picker shows
  greyed, and it still works. So a pick of a model that the menu shows
  makes the favourite show in the menu again.
- A picker that is off was rejected, because the member would then have to
  remove the favourite and add another to change it.

## The Favourites section

- The Favourites section is the first section of the Preferences tab,
  above New workspaces.
- It is the only place that adds, orders, and removes favourites (model
  favourites decision 2 A).
- Reason: the user asked for favourites that the member sets up in
  advance. An "Add to favourites" row in the menu was rejected for that
  reason, and because the row adds a line to each menu.
- The section lists the favourites in the order of the menu. Each row has
  a handle, the picker of the favourite, and ×.
- A drag on the handle moves a row. × removes the favourite.
- The picker of a row opens the
  [menu with no favourites](#a-menu-with-no-favourites), because the row
  sets one favourite.
- Add a favourite opens the list of every model that the picker offers,
  in one group for each agent (model favourites decision 4 D). A pick adds
  that model at the end of the list, with fast mode off. Its effort is the
  effort of the default of new workspaces, or else the nearest lower
  effort of the model, or its lowest one.
- When that choice is already a favourite, the pick takes the nearest
  effort of the model that no favourite holds, lower efforts first. When
  none is free, the pick adds nothing, and a line under the list says that
  each effort of the model is already a favourite.
- Reason: one pick always adds a favourite, and the row picker then
  changes its effort and fast mode. A row with the default choice, and a
  panel with its own Add, were rejected (model favourites decision 4).
- Add a favourite is off while the list holds five. A line then says that
  the menu shows five favourites at most.
- With no favourite, the section shows the line "Add a favourite to show it
  first in the model menu." in place of the list.
- A move, a removal, and a pick in the picker of a row each save the list
  at once.
- When a save fails, the section keeps the saved list. An error under the
  list says "The change wasn't saved. Try again." A later move, removal,
  or pick saves the list again.
- Reason: the section then never shows favourites that the account does
  not hold, as the New workspaces section does.
