# Account and agent screens

This page belongs to [Screens](screens.md). It describes the account,
agent login forms, and model lists in the web app.

- The account has two tabs, General and Preferences, as the org settings
  have. Each tab is a link with its own address. General holds the
  sign-in, This Mac, GitHub, and the agents. The `?connect=` address of an
  agent opens its Connect form on General. Preferences holds the New
  workspaces section: Model and effort, and
  [the choice of how New workspace opens](../../docs/protocol/create-a-workspace.md#the-preference).
- The account of the Mac app shows This Mac after the sign-in section. A
  browser shows none and asks no Mac.
- Each connected login of the account shows its share switch, "Let other
  members use this login", and Get started shows none. The switch saves
  at once through `AccountModel.setNoReuse`. While it saves, it shows the
  new value and takes no other change. A failed save shows its cause under
  the switch until the next change, and the switch shows the saved value.
  A share reply that a later save or remove of the same login overtook does
  not show, so a removed login stays removed.
- The Connect form of an agent offers each kind of its login: Claude a
  subscription token, an API key, or an own endpoint, and Codex an API key,
  a ChatGPT plan, or an own endpoint. On a phone the kinds wrap onto two lines. Get
  started shows the same form.
- The own endpoint form names the API that the endpoint must serve, with
  the models of the app for the agent from `GET /api/models`. The form
  checks the address with the rule of the save, as
  [Own endpoint logins](../../docs/protocol/tokens-and-secrets.md#own-endpoint-logins)
  says. The hint under the address names the address of the requests, and
  first the address that the form saves when the rule changes the typed
  one. Connect with an address that the rule refuses shows the refusal at
  the address and sends nothing. A refusal of the save shows there too.
  The key stays in its field.
- A connected own endpoint login shows "Own endpoint at" its host under
  its row. Under that, the account names each app model that the last model
  list of the endpoint does not name, with its model ID, the time of the
  last read, and Refresh. A list that names every app model of the agent
  shows no line. A list that names none of them says that the pickers show
  all of them. The save of the login and Refresh read the account again,
  because only the account holds the list.
- The model pickers of the person follow these lists: the default model of
  Preferences, New workspace, the routine editor, and the composer of a
  message on the person's own login. Each picker keeps the model that it
  shows. `offeredModels` in `endpoint-models.ts` holds the rule, and
  `useOfferedModels` in `../shell/context.ts` gives it to the shell.
- The Codex form offers API key, selected first, then ChatGPT plan and Own endpoint.
  ChatGPT plan asks the Worker for a code. The form shows the code with
  the link to the page of OpenAI. It asks the Worker for the state of the
  sign-in after each wait that the Worker gives. The sign-in ends when it
  connects, when the code expires, or when the Worker refuses it. An
  expired code and a refused sign-in offer a new code.
- Cancel, the other kind in the switch, and leaving the page stop the
  sign-in. A poll that gets no answer, or a failure of the server, waits
  and asks again while the code works.
- A login that the app can no longer use, such as a ChatGPT sign-in that
  OpenAI did not renew, shows Signed out, its cause, and Sign in again.
  Sign in again and the `?connect=` address open its form with its kind.
  The composers and Get started count such a login as missing, so their
  Connect notice leads to that form.
