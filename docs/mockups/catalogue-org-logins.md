# Org logins

These pages are part of [the mockup catalogue](catalogue.md). They give the
pages of the org logins: an API key or an own endpoint that an admin
connects for each agent of an org. They come from decisions 1 B, 3 A, 4,
5 A, 6 A, and 7 B of the org logins plan, which the user chose and stated
on 16 November 2026. [Logins](orgs-and-logins.md#logins) gives the design.

## The Agents tab of the org settings

`app/org-settings/agents` shows the Agents tab of Acme, after Cloud
computer, as an admin sees it. Claude runs on the gateway of Acme, with its
host, Replace, Remove, and the switch "Use for every member", off. Codex
has no org login, so its row has Connect. Its states are child pages, so
the page shows only its canonical screen:

- `app/org-settings/agents/form` has the Connect form of Codex, which
  offers only API key and Own endpoint. Its `endpoint` variant has the own
  endpoint fields, its `refused` variant an address on `http://localhost`
  that the shared rule refused, and its `not-saved` variant a save that
  failed, with the key in its field. Its `replace` variant has the form
  that Replace opens under the Claude login, which keeps its row, its
  host, Remove, and its switch.
- `app/org-settings/agents/connected` has both agents connected, after
  Connect of Codex, each with its own switch off.
- `app/org-settings/agents/endpoint-models` has the model list of the
  gateway, which lacks Fable 5.1, with the model ID, the time of the last
  read, and Refresh.
- `app/org-settings/agents/every-member` has the switch on, with its hint.
  Its `not-saved` variant has a change that the app did not save, with its
  cause beside the switch.
- `app/org-settings/agents/member` has the tab of Priya, a member who is
  not an admin: the logins read-only, with the value of the switch as its
  hint, and no model list. Its `every-member` variant has the switch on.

`app/orgs/suspended/settings/agents` has the same tab in a suspended org,
read-only also for an admin, as
[the waitlist, suspensions, and the operator](catalogue-operator.md) says
for the other tabs. `app/command-palette/settings` lists the tab in the
group of the settings of Acme.

## The org login in the other screens

- `app/account/agents/org-login` has the Agents tab of the account while
  Cal has no Claude login of his own. A line under Claude says "Your new
  sessions in Acme use Acme's login." Its `every-member` variant has the
  same line under the own Claude login of Cal, while the switch of Acme is
  on.
- `app/sign-in/get-started/org-login` has Get started of Priya, who joined
  Acme with no login of her own. The agent step is done with "Ready", and
  the line under Claude names the login of Acme.
- `app/composer/org-login` has a session of Cal on the org login, whose bar
  says "Acme's login", also for Cal. Its `new-session` variant has a new
  session of Priya, who has no Claude login, with the same label and no
  Connect notice. Its `every-member` variant has a new session of Cal, who
  has his own login, while the switch is on. Its `removed` variant has a
  message of Priya after an admin removed the org login, which starts a new
  session.
- `app/new-workspace/dialog/org-login` has the dialog of Priya with the
  label "Acme's login" and no Connect notice. Its `every-member` variant
  has the dialog of Cal while the switch is on.
- `app/chat/endpoint-models/org` has the open picker of Priya in a session
  on the org login, without Fable 5.1.
- `app/routines/routine/new/org-login` has a new routine of Priya, whose
  runs use the org login: "Runs use Acme's Claude login and your GitHub
  access." Its `org-models` variant has the open model picker without
  Fable 5.1.
