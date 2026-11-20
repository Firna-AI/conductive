# Login data

This guide belongs to [Web app: data and composition](README.md). It gives
the rules of the agent logins of the account in the web app: the ChatGPT
sign-in, the logins that can run turns, the default login of each org and
agent, and the reads of the logins.
[The default login](../../docs/protocol/org-logins.md#the-default-login)
states the requirements. [Account and agent screens](account-screens.md)
says what the screens show.

## Rules

- One ChatGPT sign-in of Codex owns its request for a code, its polls, and
  its timer. Cancel, the other kind in the switch, and the end of its form
  stop it. After that, an answer schedules nothing, and only a connected
  answer changes something. Each request of the sign-in waits for its turn
  among the login requests of Codex, as a rule below says. A connected
  answer applies the current login status that the Worker returns. Then
  the agent list closes the form of Codex, if that form is open, and
  leaves a form of Claude open. In Get started, each connected answer also
  reads the steps again.
- One rule, `loginUsable` in `api/read-core.ts`, says whether turns can
  run on a login. A connected login with an `unusableCause` cannot. The
  composers and Get started count such a login as missing.
- The account names the default login of the person for each org and
  agent in `defaultLogins`: the login that a new session takes, as the
  resolver of the Worker names it (org login decision 6 F).
  `default-logins.ts` is the one reader of it, and no screen works out the
  order. `newSessionLogin` gives the own login, the org login, or none.
  The org login serves while the server names it. Otherwise the own login
  serves while `loginUsable` says so, because the account shows each
  change of an own login before the next read. The composers, New
  workspace, the automation editor, the account, and Get started read it.
  An older reply of the account names no default login, so the own login
  then decides alone. `inOrgs` keeps the default logins of the orgs that
  the org list shows, so a leave or a delete shows at once.
- After the app opens, `AccountLoginReads` in `account-login-reads.ts` is
  the one owner of the reads of the logins and the default logins of the
  account. The start of the app reads the account in `openApp` of
  `app-model.ts`. Each later read goes through the owner: an open of the
  agent list, a return to the visible page, the timer, a change of a
  login, an org that joins the orgs of the person, a newer login state
  that a view reports, and a notice of a missing login that shows. The
  next rules give each of them. The Worker gives the own logins only in
  `GET /api/account`, so each read is a read of the whole account. A read
  takes only the logins and the default logins of that answer, in the
  order that `AgentLogins` keeps, as a rule below says. A failed read
  keeps what shows. A read across a new app start or a sign-out changes
  nothing. Such a start or a sign-out also forgets the login states and
  the notices that the views reported before it.
- Each open of the agent list, on the account and in Get started, reads
  the logins again through `AccountModel.refreshLogins`. So a login that
  the Worker stopped after the app opened shows Signed out. An open shares
  a read that waits or runs already.
- Only a reply of the account writes the logins and the default logins,
  because only it holds the own logins and the default logins of every
  org. The read of the org logins of an org also names the default logins
  of the person in that org, as the protocol says, but the account does
  not take them. So a reply that holds a part never hides a newer reply
  of the whole account, also when it comes first.
- `AccountLoginRequests` in `account-login-requests.ts` runs the login
  requests of each agent one at a time, in the order of the calls. These
  requests are a save, a share change, a Refresh of an own endpoint, and a
  remove. The request for a code and each poll of the ChatGPT sign-in are
  requests of Codex. The read of `AccountModel.orgLoginChanged` after a
  change of an org login is one too. Each request waits for its turn. Its
  turn starts when the request before it of the same agent ends. A request
  ends after the account applies its answer and the read after it ends, or
  when it fails. The requests of one agent do not wait for the requests of
  the other. Each read of the whole account by the owner waits for the
  requests of both agents before it. Each later request, and each new
  read, waits until that read ends. So a remove, a save, or a share change
  while a poll waits reaches the Worker after that poll. The screens then
  show the last change of the person.
- `AgentLogins` in `agent-logins.ts` counts each local change of a login:
  a save, a remove, a connected sign-in, a share change, a change of an
  org login, and an org that joins the orgs of the person, at its start
  and when its reply shows. A save, a remove, a share change, and a change
  of an org login count at once, also while they wait for their turn. So a
  read from before them shows nothing of their agent. A read shows the
  login and the default logins of an agent only while that agent had no
  change during the read. A read of the whole account takes its mark when
  it starts, before it waits for its turn. A read after a change uses the
  mark of its caller, in the turn of that change. So after each change the
  account reads the logins of its agent again, as the next rules say, and
  a read that ran meanwhile takes back nothing.
- After a save, a remove, a share change, or a connected sign-in of an own
  login, the account reads the logins of its agent again, so that the
  screens show the default logins that the server names after the change.
  An account that names no default login needs no such read, except the
  read of the model list after the save of an own endpoint. These reads,
  and the read after Refresh of an own endpoint, use the caller's mark to
  preserve later login changes.
- After each save, switch change, remove, and Refresh of an org login in
  this tab, `OrgModel` reports the change through
  `AccountModel.orgLoginChanged`. The account counts it as a change of its
  agent and reads the logins of that agent again. So the pickers follow
  the new default logins and the new list of an org endpoint. Refresh also
  reads the org logins again, for the list that an admin sees. An account
  that names no default login needs no such read.
- When an org joins the orgs of the person that are not deleted, the
  account reads once, as a change of each agent. An org joins after an
  accepted invitation, a restore, or a create. So a member whom only the
  org login of the new org serves can start a session at once, and Get
  started counts that login. The orgs of an app start read nothing,
  because the start read the account with them.
- The owner also reads at each return to the visible page. It also reads
  once a minute while the page shows and a picker of the person follows a
  model list that the Worker can read again in the background. Such a list
  belongs to an own endpoint login, to an org login that a new session
  takes, or to an org endpoint whose list the account keeps for older
  sessions. `orgLoginsInUse` in `default-logins.ts` gives the rule of the
  org logins. The account does not say whether an org login is an
  endpoint, so an org API key that serves also keeps the timer. A notice
  of a missing login keeps the timer too, as a rule below says.
  `modelListWait` in `endpoint-models.ts` gives the wait. Polling stops
  when no such list and no such notice remain, or while the app is not
  ready. A hidden page cancels its timer. When the page shows again, the
  owner reads once and resumes polling.
- A view reports through `AccountModel.observeLogin` each login state that
  it learns outside the account. Such a state can be newer than the
  account. The workspace chat reports, through `ChatSources`, whether the
  login of each session record can serve. When a state contradicts the
  account, the owner reads the whole account once. An example is a record
  that says that a login cannot serve, while the account still names that
  login as usable or as the default login of that org and agent. A read
  that started before that report does not count for it, and it shows no
  login and no default login of that agent. A report that a login of the
  person or of the org cannot serve makes an earlier read old too, also
  without a contradiction. No report makes a pending local write old, so
  that write still shows its reply. A repeat of the same state of the same
  record reads nothing more, also while the reply still contradicts it. No
  report writes the logins or the default logins. So when a record shows a
  refused renewal, each view of the tab stops counting the failed login as
  usable after one read. A member whom the org login serves then gets no
  Connect notice.
- While the composer shows the notice of a missing login, which offers
  Connect, it holds a watch from `AccountModel.watchMissingLogin` through
  the chat. The composer shows that notice before the send, as
  [Messages](../../docs/protocol/messages-and-attachments.md#messages)
  says. The owner reads the whole account when a watch starts. While a
  watch holds on a visible page, the owner keeps its timer. The watch ends
  when the notice goes or when its chat stops. So when an admin connects
  an org login while the notice shows, the notice goes after the next read
  of the timer. This holds also in the own empty session of the person.
  Its older record still says that no login serves, but a reply of the
  whole account that names the default logins and shows after that record
  decides its login. A notice from an older account can show for the time
  of one read. The New workspace form and the automation form hold no such
  watch yet.
- The Agents tab of the org settings reads the org logins at its open, at
  each return to the page, and once a minute while an org endpoint is
  connected, as `orgLoginsWait` in `org-waits.ts` says. So the model list
  that an admin sees follows the reads of the Worker in the background
  too. The pickers follow the timer of the account.

## Key code

- `api/read-core.ts`: `readLogin` reads own endpoint metadata for both agents.
  It keeps the host, kind, share choice, update time, and optional `modelList`.
  The list has missing app model IDs and the last successful read time.
  `dev/agent-login-routes.ts` returns the endpoint save and Refresh flags from the shared account types.
  [The development fake](dev-fake.md) gives its successful and failed list hosts and seeds.
  `dev/agent-login-routes.ts` uses the shared address rule and keeps no secret
  or full endpoint in development state. Its save uses the same public HTTPS
  address builder and agent-specific normalization as the Worker.
  The builder requires a public host name and refuses every IPv4 and IPv6 address.
  The builder reads the product domain from the shared brand source.
  The fake needs no preview domain configuration.
  `?login=endpoint` seeds shared
  own endpoint logins for both agents. `dev/endpoint-logins.ts` seeds them,
  with the model lists of `?modelList`.
- `endpoint-models.ts`: the one rule of the model lists of own endpoints.
  `unlistedModels` gives the app models that the last list of a login does
  not name, for the Agents tab of Account settings. `offeredModels` gives the models that a
  picker offers, with the list of each agent. Every picker calls it, as
  [Screens](screens.md) says. `loginModels` and `newSessionModels` of
  `default-logins.ts` give it the list of the login that a message runs
  on: the own endpoint, or the org endpoint of org login decision 3 A.
- `api/read-core.ts`: `readDefaultLogins` reads the default logins of a
  reply, with the owner of each login, a member or the org. `readAccount`
  uses it for the account, and `readOrgLogins` in
  `api/read-org-logins.ts` for the org logins of an org, whose default
  logins the account does not take. The readers of
  the ChatGPT sign-in are in `api/read-codex-device.ts`, and the readers
  of the GitHub installations and repositories in `api/read-github.ts`.
- `dev/org-login-routes.ts`: the read of the org logins of the dev fake
  names the default logins of the person in that org, from
  `dev/default-logins.ts`, as the Worker does.
