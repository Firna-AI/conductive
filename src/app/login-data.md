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
  stop it. After that, an answer changes nothing and schedules nothing.
  A connected answer applies the current login status that the Worker returns.
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
- Each open of the agent list, on the account and in Get started, reads
  the logins again through `AccountModel.refreshLogins`. So a login that
  the Worker stopped after the app opened shows Signed out. The Worker
  gives the logins only in `GET /api/account`, and the read takes only
  the logins and the default logins of that answer.
  `AgentLogins` in `agent-logins.ts` counts each local change of a login:
  a save, a remove, a connected sign-in, a share change, and a change of
  an org login, at its start and when its reply shows. A read shows the
  login and the default logins of an agent only while that agent had no
  change during the read. An open shares a read that runs already, and a
  failed read keeps what shows.
- After a save, a remove, or a connected sign-in of an own login, the
  account reads the logins of its agent again, so that the screens show
  the default logins that the server names after the change. The same
  holds after each save, switch change, and remove of an org login in this
  tab, which `OrgModel` reports through `AccountModel.orgLoginChanged`. An
  account that names no default login needs no such read, except the read
  of the model list after the save of an own endpoint.
- `AccountLoginReads` in `account-login-reads.ts` shares those reads with
  each return to the visible page. While the account has an own endpoint
  login, it also reads once a minute while the page shows. Each read merges
  only the logins and the default logins, with the same guards against
  local changes. A read across
  a new app start or a sign-out changes nothing. Polling stops without an
  own endpoint login or while the app is not ready. A hidden page cancels
  its timer. When the page shows again, the reader reads once and resumes
  polling.
  The same reader owns the reads after an endpoint save or Refresh.
  Those reads use the caller's mark to preserve later login changes.

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
  not name, for the account page. `offeredModels` gives the models that a
  picker offers, with the list of each agent. Every picker calls it, as
  [Screens](screens.md) says. `loginModels` and `newSessionModels` of
  `default-logins.ts` give it the list of the login that a message runs
  on: the own endpoint, or the org endpoint of org login decision 3 A.
- `api/read-core.ts`: `readAccount` also reads the default logins of the
  account, with the owner of each login, a member or the org. The readers
  of the ChatGPT sign-in are in `api/read-codex-device.ts`, and the readers
  of the GitHub installations and repositories in `api/read-github.ts`.
