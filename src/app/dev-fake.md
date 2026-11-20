# The development fake

This guide belongs to [Web app: data and composition](README.md).
[Run it](README.md#run-it) gives the commands that start the app, and the
limits of the chat over the fake. This guide gives the query options of
the dev wiring in `dev/`, and what its fake routes do.

Without `?conversation=`, a working workspace has a running recorded chat.
Other recorded workspaces have a finished chat. An explicit conversation
option overrides this default, including queued chats that show no spinner.
`dev/options.ts` lists the values. The `wake-` values give the wakes of a
watch, as the mockups draw them at `app/chat/wakes`.

`dev/workspace-routes.ts` gives the detail and seed of a workspace with
the cutoff of its own event log. Resume gives its event number. Each
socket takes the events of its workspace after its own cursor.

- The dev wiring in `dev/` keeps an in-memory state, so that an edit in the
  browser shows on the next read. Query options choose a preview state, for
  example `?role=member`, `?workspace=starting`, `?firstRun=org`,
  `?login=none`, `?login=endpoint`, `?deleted=1`, `?suspended=1`, `?operator=1`,
  `?waiting=1`, `?paused=1`, `?waitlist=off`, or
  `?paths=masked`. `dev/options.ts` lists them. With `?login=endpoint`,
  `?modelList=unlisted` gives the Claude own endpoint a last model list that
  does not name the last Claude model, and `?modelList=none` a list that
  names no Claude model. `?banner=<state>`, such as
  `?banner=checks-failed`, gives `checkout-autocomplete` that pull request
  bar, and its list mark shows the GitHub state of that bar. The other rows
  keep the GitHub states of the mockups. `dev/attachment-routes.ts`
  serves the start call, the parts, and the complete call of the uploads
  of both composers, with the checks of the Worker, through the store of
  `dev/attachment-parts.ts`. With `?upload=wait` no part gets an answer,
  so each upload keeps running. With `?upload=fail` the first part of the
  page fails at its first send and at each of its retries, so its chip
  fails once, and Try again sends that part again. The retries wait 1, 2,
  and 4 seconds, so the chip fails after about 7 seconds. `?sent=<percent>` makes
  the dev fixture `dev/progress-fixture.ts` report that share of each part
  as sent, so `?upload=wait&sent=64` shows the measured state of a file of
  one part. Create org of the dev fake
  requires at least one repository and starts a simulated build. Its
  repository catalogue keeps the saved choices in the repository order of
  the Worker. An add goes to the end of the order, and a move of a chosen
  repository starts no build. Each repository of its replies gives
  `imageReady` and `ready` from its current image build and the inputs of
  that build, as the Worker does. Its custom initials
  and its colour stay through rename, delete, and restore. Settings changes during the
  first good build start one added build. The fake compares settings
  revisions with builds as the Worker does.
- `dev/skills-routes.ts` keeps the skills repository of each org. Acme
  starts with acme/agent-skills. A save trims spaces and line breaks at
  both ends, then stores a valid GitHub link as owner/name and keeps other
  trimmed text. It uses the same rule as the Worker. The lookup of
  the Skills section knows only acme/agent-skills, whose 12 skills it
  lists, so it does not find any other repository. `?skills=<state>`
  gives Acme each state of the mockups: `none` saves no repository, and
  `not-found` saves acme/agent-skils. `private`, `without-skills`,
  `incomplete`, and `lookup-failed` give that answer for each saved
  repository, and `expired` refuses the lookup as an expired GitHub
  sign-in. Each repository starts untrusted. `?skillsTrust=trusted` makes
  Acme trust its saved repository, so a member and a suspended org see
  Trusted. `?skillsSave=fail` fails the first save of the page that names
  the skills repository or its trust, and that save changes nothing. The
  next save works, so Save repository can show a failed save and its
  retry.
- The branch list of New workspace gives the branches of the mockups for
  acme/storefront, newest commit first, and only the default branch for
  each other repository. `?branches=loading` never answers,
  `?branches=failed` fails as a read of GitHub does, and
  `?branches=no-access` says that the GitHub account cannot read the
  repository. With `?branchCheck=missing` or `?branchCheck=no-access`, a
  create that names a branch other than the default branch gets the
  refusal of a missing branch or of a GitHub account without access, as
  [Start from a branch](start-branch.md) says. The fake stores no branch of
  a create.
- Acme also holds Postcode lookup for the shipping and billing forms,
  `postcode-lookup`, which a member archived 3 weeks before the clock of
  the fake starts. Its 14 days ended, so the workspace list and the
  palette leave it out. The list route still sends it, as the Worker does,
  so its link and its chip still open its read-only chat, at
  `/orgs/acme/workspaces/postcode-lookup`, with the Removed bar.
- `?archivedComputer=may-exist|deleted|unknown` gives each archived
  workspace of Acme that state of its cloud computer, with the end of its
  14 days, as the Worker sends it. These are `checkout-autocomplete` with
  `?workspace=archived`, and the removed `postcode-lookup`. Neither names a
  kept cloud computer, so `may-exist` shows an unresolved create request,
  with no Restore. A value that is not one of the three counts as no
  option.
- Without the option, these records have no `archivedComputer`. That is
  the preview of the compatibility path for a record of an older Worker.
  The notice then reads only the legacy `restoreUntil`, as before the
  field. These records offer no Restore, so the notice says that the cloud
  computer is deleted. `unknown` shows the same words. The URLs of a check:
  - `http://127.0.0.1:5173/orgs/acme/workspaces/checkout-autocomplete?workspace=archived&archivedComputer=may-exist`
    promises only the chat history before the end of the 14 days.
  - `http://127.0.0.1:5173/orgs/acme/workspaces/postcode-lookup?archivedComputer=may-exist`
    says after that end that the cloud computer is being deleted.
  - `http://127.0.0.1:5173/orgs/acme/workspaces/checkout-autocomplete?workspace=archived&archivedComputer=deleted`
    and `http://127.0.0.1:5173/orgs/acme/workspaces/postcode-lookup?archivedComputer=deleted`
    say before and after that end that the cloud computer is deleted.
  - `http://127.0.0.1:5173/orgs/acme/workspaces/checkout-autocomplete?workspace=archived`
    and `http://127.0.0.1:5173/orgs/acme/workspaces/postcode-lookup` preview
    the older Worker. The URLs above with `archivedComputer=unknown` in
    place of the state show the same words.
- `?subWorkspaces=1` gives Acme the sub-workspaces of the mockup page
  `app/sub-workspaces`, from `fixtures/sub-workspaces.ts` of
  `src/test-support/`: two trees in Checkout, under Apple Pay button and
  under Checkout address autocomplete, down to depth 3, with the sibling
  Rate limits: Load test. They come first in Checkout, the newest first,
  as the Worker lists new workspaces, and each opens with the recorded
  chat, as the other rows do. Without the option, no workspace has a
  parent.
- `?mergeQueue=one` gives Acme the queue of acme/storefront that the
  mockup page `app/merge-queue` draws, with `checkout-autocomplete` at
  place 4, whose bar names its place. `?mergeQueue=two` also queues a
  member stack of acme/billing-service, so the blocks name their
  repositories. `?mergeQueue=open` queues nothing, so the bar of
  `checkout-autocomplete` offers Add to merge queue. With each value,
  each open pull request has write access and targets main, except
  Invoice PDF fonts, which targets a release branch, so its drag names
  the reason that it cannot join. `dev/queue-routes.ts` answers Add,
  Remove, and a move, and adds the queue state to the bar of a queued
  workspace. Without the option, no record has a field of the queue.
- The writes of the fake place the trees as the Worker does, with or
  without the option. A move of a top-level row, by a drag, by keys, or by
  Move to section, takes its whole tree, and writes the section of each
  workspace under it, live or archived. A move of a nested row changes
  nothing, and a rename of it changes only the name. An Archive gives each
  live workspace that showed under the archived row its section and its
  place, so the next read shows them where that row was.
  `dev/workspace-writes.ts` holds these writes.
- Own endpoint saves return `endpointV1Added` and `modelListReadFailed`, as
  the Worker does. Refresh returns HTTP 200 with `modelListReadFailed`.
  False means the read produced a list. These response flags never enter
  the saved account. Ordinary fake hosts list every model.
  `https://v1-only.example.test` lists only under `/v1`. A Codex save of
  that host without a final `/v1` returns `endpointV1Added: true`.
  `https://no-models.example.test` lists no models. Its saves and Refresh
  return `modelListReadFailed: true` for both agents. A failed Refresh
  keeps the previous list and time. The fake keeps no secret or full address.
  `?login=endpoint&modelList=v1-only` seeds both logins with the first host.
  Remove and Connect Codex with that host without `/v1` to get the save flag.
  `?login=endpoint&modelList=read-failed` seeds both with the second host.
  Refresh then returns the failed-read flag. The Claude login keeps a list
  from a day before that does not name the last Claude model, so its row
  shows Refresh, and a Refresh shows the warning above the line of that
  list. A reload alone returns neither flag.
- The upload routes also keep the exact bytes of each upload, in a private
  store of the page. They keep the bytes of each part until the complete
  call puts the file together, so a large file takes its size in the
  memory of the page. A send that names uploaded files gets a reply with its
  own message ID, text, model choice, and files. An archived workspace,
  and each message without uploaded files, keep the recorded reply. In a
  workspace that runs, such as `checkout-autocomplete` by default, the
  message is sent, and its files become readable at the paths of their
  uploads. Otherwise the message stays queued with no turn, and its files
  stay unreadable, because the fake never sends a queued message. A create
  of a workspace copies no file, and the new workspace has no recorded
  chat.
- The content route gives each copy as a `FileResponse` with its bytes in
  base64, and the download route gives its raw bytes. Both keep
  `FILE_READ_MAX_BYTES`, and refuse a larger copy with `file_too_large`.
  A path in `.context/attachments/` with no copy gets `file_not_found`,
  and the recorded file routes answer each other path. A copy belongs only
  to the workspace of its message. All files and Changes stay the
  recorded lists. A reload starts with no bytes and no copies.
- `dev/feedback-routes.ts` serves the two feedback routes. By default, and
  with `?feedback=ready` or an unknown value, the reply address is
  `<GitHub login>@example.com`, and each send answers 204.
  `?feedback=no-email` gives a reply without an address.
  `?feedback=fail` fails the first send of the page with
  `502 feedback_email_failed`, so a retry sends.
  `?feedback=limit` refuses the first send of the page with
  `429 feedback_send_limit`, as the send limit does. Its `retryAt` is
  23 minutes and 40 seconds after the clock of the fake. A retry sends.
  With `?waiting=1`, both
  routes refuse with `access_required`. The fake sends no email and keeps
  no copy.
- `?operator=1` makes the dev user an operator, so the rail and the org
  switcher show Operator. The [operator section](../shell/operator/README.md)
  then shows the sample orgs, users, people who wait, and codes of the
  mockups. Suspend, Lift, Approve, New code, Disable, and the pause of
  sign-ups change them. A suspension of Acme, Futex, or Firna also
  suspends that org in the state of the fake, so the fake refuses each
  write of that org with `org_suspended`. The open app does not read its orgs again, so its pages
  of that org show the suspension only after such a refusal. Without the
  option, each operator request gets `operator_required`, as the Worker
  does. The provider accounts are `boat` and `e2b`, with every new org on
  `boat`. `?providers=one`, `?providers=three`, or `?providers=fail` gives
  `boat` only, a third account, or a failed read, and `?providerSave=fail`
  fails each save of the weights. An org that Create org makes joins the
  operator section with its account: the choice of an operator, or a draw
  from the weights. Switch account and Stop switch change the switch of an
  org, as [the operator section](../shell/operator/README.md#development)
  says. `?switches=1` gives sample orgs each state of a switch, and
  `?switchSave=fail` fails each switch and stop.
- `?waiting=1` signs in Sam Okafor of the waitlist mockups, who waits for
  app access with a verified email, so the app shows only the
  [waitlist](screens.md#the-waitlist). `?waiting=no-email` gives the same
  account without a verified email. Sam starts as a new account, as
  `?firstRun=github-app` does. With `?operator=1` nobody waits, because
  an operator gets app access. With `?waiting`, `?invited=1` adds an
  invitation of Acme, whose Accept makes Sam a member with app access. A
  join link, such as `/join/V7MKC-2QDXH?waiting=1`, uses its code at once.
  `?paused=1` pauses
  sign-ups: each use of a code, and the Accept of a person who waits, get
  `signups_paused`. Account settings show the pause, and the operator
  section shows its notice.
  `?waitlist=off` starts with the waitlist off, by the operator of the
  samples. Unless sign-ups are paused, a person who waits gets app access
  at the next request, with a new referral code and no use of a code, so
  Get started opens. The fake does this before each request, as the gate
  of the Worker does. The operator section shows the switch off, and Zed
  K, who came back and got in by open sign-up. Account settings name
  open sign-up.
  `?inviteCode=used-up` or `?inviteCode=disabled` sets the state of the
  invite code of a user with app access, also on the page of that user in
  the operator section.
- The waitlist and the operator section share one pause, one waitlist
  switch, and one set of codes, as they share the database of the Worker.
  The codes are those of the operator mockups, with a referral code for
  each sample user with app access. For example, `V7MKC-2QDXH` works,
  `M4QTX-7HKWD` is the referral code of Mira Santos, `9PTXC-4WHMN` is used
  up, `HM3PE-7KWQT` is disabled, and a code that the mockups do not list is
  not found. A code that works counts its use, and gives app access and a
  new invite code, so Get started opens. With `?operator=1`, a pause, a
  turn-off of the waitlist, or a Disable in the operator section shows on
  Account settings of the operator.
- The fake keeps its state in the page. A reload starts again from the
  options, so Sam waits again, and the codes, the pause, and the switch
  are those of the options. An operator never waits, so a pause, a change
  of the switch, or a new code of the operator section cannot reach the
  waitlist screen.
- Acme has the
  automations of the mockups, each with the runs that its page in the mockups
  lists. `?runs=failed` or `?runs=skipped` gives Review pull requests the
  failed or the skipped runs of the mockups. A skipped run names the
  account outside Acme by its login. The fake has no workspaces for these
  runs, so the workspace list stays as the mockups draw it, and the link
  of such a run opens no workspace. `?run=pull-request` or `?run=schedule`
  makes `checkout-autocomplete` the workspace of one run, so its header
  shows the line of that run, with the pull request of a pull request run.
  The other orgs have no
  automations, so their Automations page shows its empty state. A save of an
  automation checks the prompt, each custom cron, and the time zone, as the
  Worker does. A removal of a repository on the Repositories tab turns off
  each automation in it, with the reason that the automation page shows, as the
  Worker does. Its author filter knows the members of the org and a few
  bots, such as `dependabot[bot]`. Any other login gets the refusal of a
  login that names no GitHub account, with its trigger and its list.
  Each reply of one automation names the login of its runs, as the
  Worker does: the default login of the person signed in for an own
  automation. The fake knows no logins of other people, so the runs of
  another owner use the org login while `?orgLogin=every-member` turns its
  switch on, and else the own login of that owner. Each reply of one
  automation also names its chosen secrets by ID and name, in the order of
  their names, as the Worker does. A secret that the org no longer has is
  not in the list, and no reply holds a value.
- Run now makes the workspace of the run as Create workspace does, in the
  section of the automation, and the run takes the state of that workspace.
  Without the agent login of the automation's model, as with `?login=none`,
  the run fails with no workspace. A prompt that contains `fail` stands for
  a cloud computer that did not start: the run fails and keeps its
  workspace, in the error state with Try again, as the Worker does. The
  workspace of a run starts with the chosen secrets of its automation
  pre-approved, and Mac access off. The
  recorded server has no chat for
  a workspace that the fake made, so its chat does not load, and the line
  of its automation does not show.
  The dev backend records each run's agent and owner when Run now starts it.

- `dev/secret-routes.ts` serves the secrets of each org, as the Worker
  does. Acme starts with the secrets of the mockups, with made-up values,
  and the other orgs with none (`dev/secret-store.ts`). The list holds no
  value. A member changes only the own secrets, and only an admin sets the
  mark for all agents or reveals a value, which the fake records. A Replace
  of the value ends the record of the last reveal, and a Delete ends each
  grant of the secret and leaves the chosen secrets of each automation. A suspended org refuses each write, also a reveal.
  `dev/capability-routes.ts` serves the Capabilities of each workspace:
  `checkout-autocomplete` pre-approves FIGMA_TOKEN and has two approvals of
  its sessions, and a create keeps the choices of its control. The fake
  keeps no value for a workspace, and a reload starts the secrets again.
- `dev/secret-request-routes.ts` serves the secret requests of each
  workspace: the list with the values of the workspace, the answer of a
  member, and the removal of a value. An Allow in time sends the run of
  its request, and a late Allow sends the line of the app with the notice
  of a new turn. A value for this workspace joins the list of the
  workspace, and Save adds a secret of the org. `?secrets=<state>` puts a
  state into the session of `checkout-autocomplete`, from
  `dev/secret-request-seed.ts`. `waiting`, `value`, `mixed`,
  `invalid-name`, and `mixed-invalid-name` wait for an answer above the
  composer, so use them with `conversation=running`. `invalid-name` asks
  for a value of Google Places key, a name that a new secret cannot take,
  so Save as secret is off. `mixed-invalid-name` adds that name to a mixed
  request.
  `late`, `late-value`, `results`, and `ended` sit in a short turn after
  the recorded one: a late request, a late request for a value, the runs
  with a denied request and a late Allow with its line, and a request that
  an Archive ended. The results also give MAPBOX_TOKEN a value for the
  workspace, which Capabilities lists. As the Worker does, a request that
  waits or is late gives the workspace the state `input`, so the header
  says Needs input. The last answer gives back the state from before
  (`followOpenRequests` of `dev/secret-store.ts`).
- `?capabilities=<state>` puts the notes of changes of the capabilities
  into the session of `checkout-autocomplete`, from
  `dev/capability-note-seed.ts`, as the pages of `app/capabilities/changed`
  of the mockups draw them. `changed` has the pre-approval of VERCEL_TOKEN
  by Priya, `removed` has two notes of two members, and `several` has one
  note with the changes of one edit. The notes follow
  the recorded chat: in its running turn with `conversation=running`, and
  after its end otherwise. With `role=member`, the reader is Priya, so her
  notes say "You". The notes change no capability of the workspace, so the
  Capabilities control keeps its seeded state.

The development fake keeps each org's workspace number counter.
A create gets the next number and a web link on the fake API origin.
Workspace readers keep the number and link that the Worker supplies.

The development fake keeps the org logins in its state, `orgLogins` of
`DevState`, and serves them through `dev/org-login-routes.ts`, as the
Worker does. Each member reads them, and
only an admin of an active org gets the model list of an own endpoint. Only
an admin saves, changes the switch "Use for every member", removes, or
refreshes. The saves and Refresh use the fake hosts of the account above,
so a save of `https://no-models.example.test` shows the warning, and a Codex
save of `https://v1-only.example.test` shows the `/v1` note.
`?orgLogin=endpoint` gives Acme an org login of Claude on its gateway, whose
last model list names every Claude model. `?orgLogin=unlisted` gives a list
without the last Claude model. `?orgLogin=every-member` gives the login of
`endpoint` with its switch on. With `?shareSave=fail`, each change of the
switch fails. A reload starts again from the options.

Each read of the account names the default login of each org and agent,
from the own logins and the org logins of the state, as the resolver of
the Worker does. `dev/default-logins.ts` works out the order, because the
fake stands in for the Worker. So `?login=none&orgLogin=endpoint` gives a
person whose new Claude sessions in Acme take the org login. Each read of
the org logins of an org names the default logins of that org in the same
way, as the Worker does.
`?sessionLogin=org` makes each session of `checkout-autocomplete` run on the
org login of Acme, as after a first message on it. `?sessionLogin=removed`
says in each record that an admin removed that login later.
`?sessionLogin=empty` adds an empty session of Cal after the recorded
sessions. Its record names the default login of Cal as `defaultLogin`,
which its first message takes, from the logins of Cal in the fixtures and
the org logins of the state, as the Worker does. So
`?role=member&orgLogin=every-member&sessionLogin=empty` gives Priya an
empty session of Cal whose composer names "Acme's login".
`dev/session-login-routes.ts` changes the recorded sessions in this way.

The development fake saves shortcut batches through `dev/shortcut-routes.ts`.
It checks the whole batch with the shared reader before it changes state.
It keeps each keyboard separate, preserves empty key lists, and removes
an override when the request sends null keys.
The next account read returns both keyboards.

The Stats tab of the account reads its counts from `dev/account-stats.ts`.
It counts the orgs of the fake that are not deleted, the workspaces and
the automations that the person owns in them, and the automation runs of the
person that were not skipped, by the rules of the Worker. Its reply keeps
the removed workspaces in `archived` and counts them again in `removed`,
as the Worker does. So Cal's tab shows Postcode lookup in its Removed row.

## Dev preview query options

The preview state of the dev fake, from the query string of the page,
such as `/?role=member&workspace=stopped`. An unknown value is ignored,
so its default applies.

- `role=admin|member`: the role of the user in the recorded orgs.
- `workspace=<state>`: the state of `checkout-autocomplete`.
- `archivedComputer=may-exist|deleted|unknown`: each archived workspace of
  Acme has that state of its cloud computer, with the end of its 14 days,
  as the Worker sends it. These are `checkout-autocomplete` with
  `workspace=archived`, and the removed `postcode-lookup`. Neither names a
  kept cloud computer, so `may-exist` shows an unresolved create request.
  Without the option, their records have none, as from an older Worker.
- `conversation=<scenario>`: its recorded chat, such as `running`.
- `banner=<state>`: its GitHub banner, such as `merged`. Its list mark
  shows the GitHub state of that bar.
- `paths=masked`: two files whose real paths hold a fake secret value,
  with their labels, in the file lists and at the end of each turn.
- `subWorkspaces=1`: Acme also has the sub-workspaces of the mockups,
  nested under Apple Pay button and Checkout address autocomplete, down
  to depth 3, so the list shows two trees in Checkout.
- `firstRun=github-app|org|agent-login`: Get started is not done from
  that step on. With `github-app` or `org`, the user has no org until
  Create org runs. In each first run, no agent login is connected.
- `login=none`: no agent login is connected.
- `login=endpoint`: both agents have a shared own endpoint login.
- `modelList=unlisted|none`: with `login=endpoint`, the last model list of
  the Claude login does not name the last Claude model of the app, or
  names no Claude model of the app. The list was read 4 minutes before
  the fake starts. Refresh and a save read a list that names every model.
- `modelList=v1-only|read-failed`: with `login=endpoint`, use the fake
  host that lists only under /v1, or the host that never lists models.
  With `read-failed`, the Claude login keeps a list from a day before
  that does not name the last Claude model of the app.
- `orgLogin=endpoint|unlisted|every-member`: Acme has an org login of
  Claude on its gateway, whose last model list names every Claude model
  of the app, or lacks the last one. With `every-member`, its switch
  "Use for every member" is on. The account names the default login of
  each org and agent, as the Worker does.
- `sessionLogin=org|removed`: each open session of
  `checkout-autocomplete` runs on the org login of Acme, as after a
  first message on it. With `removed`, an admin removed that login
  later, so the records say that it is not available.
- `sessionLogin=empty`: `checkout-autocomplete` also has an empty
  session that Cal started. Its record names the default login of Cal,
  which its first message takes, as the Worker resolves it, such as the
  org login with `orgLogin=every-member`.
- `deleted=1`: Acme is deleted, as its admins see it.
- `suspended=1`: the operator suspended Acme. Each write of Acme gets
  `org_suspended`, except a leave, as the Worker does.
- `operator=1`: the user is an operator. The rail and the org switcher
  show Operator, and the operator section shows the sample orgs and
  users of the mockups. Without it, each operator request gets
  `operator_required`, as the Worker does.
- `signedOut=1`: the Worker refuses the session, so the sign-in shows.
- `stop=<seconds>`: an open workspace stops that many seconds after it
  opens, as a sandbox does that stops while its workspace is open.
- `upload=wait|fail`: no part of an upload gets an answer, so each file
  keeps uploading, or the first part of the page fails at each of its
  sends, so its chip fails once, after the waits of its retries of about
  7 seconds, and Try again works.
- `shareSave=fail`: each change of the share setting of an agent login,
  and of the switch "Use for every member" of an org login, fails, so
  the page shows that the change was not saved.
- `runs=failed|skipped`: the Runs list of Review pull requests holds a
  failed run of each cause, or the skipped runs of accounts outside Acme.
- `run=pull-request|schedule`: `checkout-autocomplete` is the workspace
  of a run, of Review pull requests for #482 or of an hourly run of
  Triage new errors. So its header shows the line of the run.
- `waiting=1`: the user is Sam Okafor, who waits for app access, with a
  verified email, so the app shows the waitlist. `waiting=no-email`: the
  same account without a verified email. Sam starts as a new account, as
  `firstRun=github-app` does, unless `firstRun` says otherwise. With
  `operator=1`, nobody waits, as an operator gets app access.
- `invited=1`: with `waiting`, an invitation of Acme waits for Sam.
  Accept makes Sam a member of Acme, with app access.
- `paused=1`: sign-ups are paused. A use of a code and the Accept of a
  person who waits get `signups_paused`, and nothing is used up. The
  operator section shows the same pause, by the operator of the samples.
- `waitlist=off`: the operator of the samples turned the waitlist off.
  Unless sign-ups are paused, a person who waits gets app access at the
  next request, with no use of a code, so Get started opens. The operator
  section shows the switch off, and Zed K as a person who came back and
  got in by open sign-up. The Account page names open sign-up.
- `inviteCode=used-up|disabled`: every invite of the code of the user is
  used, or an operator turned the code off. The operator section shows
  the same code.
- `providers=one|three|fail`: the configured provider accounts of the
  Providers tab and of the account choice of Create org: `boat` only,
  `boat`, `e2b`, and `e2b-us`, or `boat` and `e2b` with a read that
  fails. Without it, the accounts are `boat` and `e2b`.
- `providerSave=fail`: each save of the weights of new orgs fails, so
  the Providers tab shows that the weights were not saved.
- `switches=1`: sample orgs of the operator section show each state of a
  switch of the provider account, as `switch-seed.ts` lists them.
- `switchSave=fail`: each Switch account and Stop switch fails, so the
  question shows its error.
