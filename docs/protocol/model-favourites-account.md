# Model favourites: the account

This doc holds the requirements and the decisions in force for the
favourites of an account: the starting favourites, and the account routes
that read and save the favourites. It belongs to
[Model favourites](model-favourites.md), which gives the terms, the menu,
and the Favourites section, and which names the model favourites decision
numbers.

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
  `invalid_input`, and the route saves nothing. A body that is not a JSON
  object gets HTTP 400 with `invalid_json`, as on each route of the app.
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
