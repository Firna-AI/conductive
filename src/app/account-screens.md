# Account and agent screens

This page belongs to [Screens](screens.md). It describes the account,
agent login forms, and model lists in the web app.

- The account has five tabs, General, Agents, Preferences, Keyboard
  shortcuts, and Stats, as the org settings have. Each tab is a link with its own
  address. General holds the sign-in, GitHub, and the invite
  code. Agents, at `/account/agents`, holds the logins of Claude and
  Codex. The `?connect=` address of an agent opens its Connect form on
  Agents. An older `/account?connect=` link opens Agents too. Preferences holds the
  [Favourites section](../../docs/protocol/model-favourites.md#the-favourites-section),
  then the New workspaces section: Model and effort, and
  [the choice of how New workspace opens](../../docs/protocol/create-a-workspace.md#the-preference).
  On a phone, a tab that does not fit moves to a second line.
- `FavouritesSection` in `../shell/account/` lists the favourites of the
  account in the order of the model menu. Each row has a handle, the shell
  `ModelPicker`, and ×.
  The picker offers the models of the person and keeps the model of the
  favourite. It shows no favourites, so its menu starts with All models. A
  drag moves a row, as Alt with Up or Down does while the focus is
  in the row, through `useListOrder` of `../shell/ui/`, as the repository
  order does. A favourite that the model list no longer holds, or that the
  list of an own endpoint does not name, shows greyed with the line of
  `hiddenLine` in `../shell/account/favourite-rows.ts`. With no favourite,
  a muted line takes the place of the list.
- `AddFavourite.tsx` opens the list of each model that the pickers of the
  person offer, in the groups of All models: below the button on a
  computer, and in a sheet on a phone. A pick adds the favourite that
  `addedFavourite` in `favourite-rows.ts` gives, at the end of the list,
  and the picker of the new row then takes the focus. It takes the effort
  of the default of new workspaces, or the nearest lower one, and else the
  nearest free effort, lower efforts first, as
  [The Favourites section](../../docs/protocol/model-favourites.md#the-favourites-section)
  says. A pick with no free effort saves nothing, and a muted line under
  the list says so until the next change. Add a favourite is off at five.
- Each move, removal, pick, and add saves the whole list at once through
  `AccountModel.setFavourites`. The account state queues no save, so the
  section sends one save at a time. While a save runs, the section shows
  the list that it sent and takes no other change, and its controls stay
  on, so a row that moved by keys keeps the focus. After the reply, it
  shows the saved list. A failed save shows the saved list with its error
  under the list until the next change. Each row keeps its ID through a
  move, a pick, and the reply, as `keptRows` says, so its elements and the
  focus stay.
- Model and effort saves each change at once through
  `AccountModel.setDefaultChoice`. While it saves, the picker shows the new
  choice. A Fast change keeps the menu open, so the switch shows its new
  state in place. The trigger and the rows of the open menu take no other
  change until the save ends. A failed save shows a toast, and the picker
  shows the saved choice.
- Keyboard shortcuts lists the keys of each command, and saves each change
  at once through `AccountModel.saveShortcuts`, as
  [the Keyboard shortcuts tab](../shell/account/shortcuts/README.md) says.
  The keys and every hint of the app use the saved changes at once.
- Stats, at `/account/stats`, shows the counts of the person signed in.
  `StatsTab` reads them through `PageRead` each time that the tab opens, as
  [Account stats](../../docs/protocol/account-stats.md) says. A failed read
  shows a notice with Try again and no number.
- The account of the Mac app adds This Mac as its sixth tab, after Stats. A browser shows General at its address and asks no Mac.
- Each connected login of the account shows its share switch, "Let other
  members use this login", and Get started shows none. The switch saves
  at once through `AccountModel.setNoReuse`. While it saves, it shows the
  new value and takes no other change. A failed save shows its cause under
  the switch until the next change, and the switch shows the saved value.
  A save or a Remove of the same login that starts while the switch saves
  waits until the share change ends. Then its own answer shows last, so a
  removed login stays removed, as [Login data](login-data.md#rules) says.
- The Connect form of an agent offers each kind of its login: Claude a
  subscription token, an API key, or an own endpoint, and Codex an API key,
  a ChatGPT plan, or an own endpoint. On a phone the kinds wrap onto two lines. Get
  started shows the same form.
- The own endpoint form names the API that the endpoint must serve, with
  the models of the app for the agent from `GET /api/models`. The form
  checks the address with the rule of the save, as
  [Own endpoint logins](../../docs/protocol/own-endpoint-logins.md)
  says. The hint under the address names the address of the requests, and
  first the address that the rule makes of the typed one when the rule
  changes it. A Codex save can still add `/v1` after its model list reads,
  as [The address of a Codex save](../../docs/protocol/own-endpoint-logins.md#the-address-of-a-codex-save)
  says, so the hint cannot show that change. The note below shows it.
  Connect with an address that the rule refuses shows the refusal at the
  address and sends nothing. A refusal of the save shows there too. The
  key stays in its field.
- A connected own endpoint login shows "Own endpoint at" its host under
  its row. After a Codex save that added `/v1`, a note follows the host. It
  stays until the next save, a Remove, or a reload of the page. After a
  save or a Refresh that read no model list, a warning with Refresh
  follows the host and the note. It stays until the next save, a Refresh
  that reads a list, a Remove, or a reload. The protocol doc gives the
  words of both.
- Under those, the account names each app model that the last model list
  of the endpoint does not name, with its model ID, the time of that list,
  and Refresh. While the warning shows, its Refresh is the one Refresh of
  the row, and this line has none. A list that names every app model of
  the agent shows no line. A list that names none of them says that the
  pickers show all of them. The save of the login and Refresh read the
  account again, because only the account holds the list.
- The app keeps the flags of the save and of Refresh beside the account
  data, only in memory. So the note and the warning stay when the agent
  step of Get started draws the list again, and a reload removes them.
  The flags belong to the login of that save, by its save time. So a login
  that a later save replaced, also in another tab, shows neither. A
  Refresh answer that comes after a Remove or a new save changes nothing.
  `EndpointReads` in `endpoint-reads.ts` keeps them.
- When Refresh moves between the warning and the line of the models, after
  a read that failed or worked, it keeps the keyboard focus.
- The model pickers of the person follow these lists: the default model of
  Preferences, New workspace, the automation editor, and the composer of a
  message on the person's own login. New workspace and the automation
  editor follow, for each agent, the list of the login that a new session
  of the person takes in the org. That is the last list of the org
  endpoint while the server names the org login as the default login, as
  [Own endpoint logins](../../docs/protocol/own-endpoint-logins.md) says
  for org login decision 3 A. The composer follows the list of the login
  of each message, as [Sessions, logins, and drafts](../chat/sessions.md)
  says. Each picker keeps the model that it shows. `offeredModels` in
  `endpoint-models.ts` holds the rule, and `useOfferedModels` in
  `../shell/context.ts` gives it to the shell, with the lists of an org.
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
- The composers, New workspace, and the agent step of Get started show no
  Connect notice when the org login serves the person, as
  [The default login](../../docs/protocol/org-logins.md#the-default-login)
  says. New workspace then names the org login after the model picker,
  such as "Acme's login". The line under the prompt of an automation of
  the person names it too, such as "Runs use Acme's Claude login and your
  GitHub access." Each member who reads the automation of another member
  reads the login of its runs that the reply of the automation names, such
  as "Runs use Acme's Claude login and Cal's GitHub access.". When the
  reply names none, the line names the owner. `loginOwnerName` in
  `login-owner.ts` names the owner of the login, as it does for the label
  of the composer.
- Under each agent, the account and Get started name each org whose org
  login the new sessions of the person take, such as "Your new sessions in
  Acme use Acme's login.", also under an own login. The words come from
  the shared `OrgLoginLines.tsx`. With only an org login, the agent
  step of Get started says Ready, with the words of `getStartedCopy.ts`
  that name the org login.
- After each change of a login of an agent, an own login or an org login,
  the screens show the default logins that the server names after the
  change, because the account reads them again. An org that joins the
  orgs of the person, such as after an accepted invitation, reads the
  account once too. [Login data](login-data.md#rules) gives the rules.

## The Agents tab of the org settings

- The Agents tab of the org settings, at `/orgs/:orgId/settings/agents`,
  follows Cloud computer. It shows the org login of each agent, as
  [The Agents tab](../../docs/protocol/org-logins.md#the-agents-tab)
  says. It reads the logins while it shows, again at each return to the
  page, and once a minute while an org endpoint is connected. Its words
  come from the shared `orgAgentsCopy.ts`.
- An admin uses the parts of the account. `AgentConnectForm` with `org`
  offers only API key and Own endpoint, and its words ask for a key of
  the account of the org. Replace opens that form under the login, on the
  kind of the login, and its main button says Replace. Remove asks no
  question first.
- `EndpointDetails` with `org` shows the note and the warning of the
  saves and of Refresh of an org endpoint in this page, which
  `OrgAgentLogins` keeps as the account keeps its own. Its line of the
  models names the model pickers on the login. The answer of a save
  holds the model list, so only Refresh reads the logins again.
- The switch "Use for every member" saves at once. While it saves, it
  shows the new value and takes no other change. A failed save shows its
  cause under the hint until the next change, and the switch shows the
  saved value.
- A member who is not an admin, and each person in a suspended org, get
  the tab with no action, form, switch, note, warning, or model list. Each
  org login shows its kind, the host of an own endpoint, and the hint of
  the value of its switch. An agent without an org login says Not
  connected. Only a member gets the sentence that only an admin can change
  the logins, because the notice of a suspended org says why.
