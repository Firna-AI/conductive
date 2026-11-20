# Model favourites

This doc holds the requirements and the decisions in force for model
favourites: the full choices that the model menu lists first. It covers
the rows and the marks of the menu, All models, the hidden favourites, the
Favourites section of Preferences, the starting favourites, and the
account routes. [Fast mode](fast-mode.md) covers the Fast row of the menu.
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
  - A line, the label Effort, and the efforts of the current model.
  - The Fast row of a model with fast mode, as
    [The Fast switch](fast-mode.md#the-fast-switch) says.
- A pick of a favourite makes it the current choice, with its model, its
  effort, and its fast mode.
- After a pick, the efforts and the Fast row change only the current
  choice. The favourite stays as it was. The user asked on 16 November
  2026 that the effort and Fast stay open to change after a pick.
- The efforts stay rows of the menu, not a submenu, as the user chose on
  16 November 2026.
- The menu has no row that adds a favourite (model favourites decision
  2 A). [The Favourites section](#the-favourites-section) gives the reason.

### The marks

- The menu marks a favourite only when it matches the current choice
  exactly: the same agent, model, effort, and fast mode. So after a change
  of the effort or of fast mode, the menu can mark no favourite.
- Reason: the menu then never shows a changed choice as a favourite.
- The menu marks the current effort among the efforts. All models marks the
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
- A pick in All models changes the model, and with it the agent. It keeps
  the effort when the new model offers it. Otherwise it takes the nearest
  lower effort of the model, or its lowest effort when it has no lower one.
  [Changes of fast mode](fast-mode.md#changes-of-fast-mode) gives its fast
  mode.

### A menu with no favourites

- When the menu has no favourite to show, it lists every model that the
  picker offers at its top, in one group for each agent. The efforts and
  the Fast row follow. The menu has no All models row.
- Reason: no submenu then repeats the rows of the menu.
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
- Add a favourite is off while the list holds five. A line then says that
  the menu shows five favourites at most.
- A move, a removal, and a pick in the picker of a row each save the list
  at once.
- When a save fails, the section keeps the saved list. An error under the
  list says "The change wasn't saved. Try again." A later move, removal,
  or pick saves the list again.
- Reason: the section then never shows favourites that the account does
  not hold, as the New workspaces section does.

## The starting favourites

- An account that never saved favourites gets the starting favourites
  (model favourites decision 1 A). Reason: the menu is then useful before
  the member sets any favourite.
- No favourites until the member adds one, and the default of new
  workspaces as the only favourite, were rejected (model favourites
  decision 1).
- The deployment setting `CONDUCTIVE_STARTING_FAVOURITES` gives the
  starting favourites (model favourites decision 3 A). Every account that
  never saved favourites gets the same list.
  [Starting favourites](../deployment/models.md#starting-favourites) gives
  the setting.
- These ways were rejected (model favourites decision 3):
  - Choices that the Worker derives from the model list. The production
    list would give at most one Codex choice. A new model at its top would
    change the favourites of each such account.
  - A list in the code of the Worker. The Worker has no built-in model
    list, and each change would need a code change.
  - A field on each model of the model list. Each new version of a model
    would need the field moved by hand.
  - The saved default of the member first, then the setting. The user chose
    one list for each account that never saved favourites.
- The account stores no favourites until the member saves a change. Until
  then, each read gives the starting favourites of the current setting. So
  a change of the setting reaches each such account.
- A copy of the starting favourites at sign-up was rejected, because it
  keeps old models in old accounts.
- An account from before model favourites also gets the starting
  favourites, because model favourites decision 1 A rejected a start with
  no favourites. A start with no favourites only for such accounts was
  rejected, because it splits the members into two menus.
- After the member removes each favourite, the account keeps an empty
  list. The starting favourites then do not come back.
- When the setting gives no entry that the Worker can use, the starting
  favourites hold only the app default, as
  [Starting favourites](../deployment/models.md#starting-favourites) says.
  The setting never fails a request.

## The account routes

- `GET /api/account` gives `favourites`: the saved favourites of the person
  signed in, in the order of the menu, or else the starting favourites.
  Each has the fields of a choice: `agent`, `model`, `effort`, and `fast`.
  An older app ignores the field.
- `PUT /api/account/favourites` saves the whole list of the person signed
  in. Its JSON body holds the list in `favourites`, in the order of the
  menu. An empty list is valid.
- The route checks each entry as `PUT /api/account/default-model` checks a
  choice. An entry needs the agent `claude` or `codex`, a model ID, and an
  effort of [Models](../deployment/models.md#models). Fast mode is on only
  when `fast` is `true`.
- A body with another shape gets HTTP 400 with the error code
  `invalid_input`, and the route saves nothing.
- An entry with fast mode on needs the model list. Without a valid model
  list, the route answers HTTP 503 with the error code
  `models_unavailable`, as
  [Model inputs](../deployment/models.md#configuration-failures) says.
- The route turns fast mode off for a model without fast mode, as
  [The models with fast mode](fast-mode.md#the-models-with-fast-mode)
  says. It then keeps only the first of entries with the same agent, model,
  effort, and fast mode, and then the first five entries. So the route adds
  no rejection that the saved default does not have.
- The route does not check the model or the effort of an entry against
  the model list, as for the saved default. The menu hides a favourite
  whose model the model list does not hold.
- The reply gives the list that the route saved, in `favourites`.
- Each route reads or saves only the favourites of the person signed in.
