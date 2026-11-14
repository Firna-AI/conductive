# The development fake

This guide belongs to [Web app: data and composition](README.md).
[Run it](README.md#run-it) gives the commands that start the app, and the
limits of the chat over the fake. This guide gives the query options of
the dev wiring in `dev/`, and what its fake routes do.

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
  keeps the uploaded files of both composers. With `?upload=wait` each
  upload keeps running, and with `?upload=fail` the first upload of the
  page fails once, so Try again works. `?sent=<percent>` makes the dev
  fixture `dev/progress-fixture.ts` report that share of each file as
  sent, so `?upload=wait&sent=64` shows the measured state. Create org of the dev fake
  requires at least one repository and starts a simulated build. Its
  repository catalogue keeps the saved choices, and its custom initials
  stay through rename, delete, and restore. Settings changes during the
  first good build start one added build. The fake compares settings
  revisions with builds as the Worker does.
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
  store of the page. A send that names uploaded files gets a reply with its
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
  `502 feedback_email_failed`, so a retry sends. With `?waiting=1`, both
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
  does.
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
  `signups_paused`. The Account page shows the pause, and the operator
  section shows its notice.
  `?waitlist=off` starts with the waitlist off, by the operator of the
  samples. Unless sign-ups are paused, a person who waits gets app access
  at the next request, with a new referral code and no use of a code, so
  Get started opens. The fake does this before each request, as the gate
  of the Worker does. The operator section shows the switch off, and Zed
  K, who came back and got in by open sign-up. The Account page names
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
  the Account page of the operator.
- The fake keeps its state in the page. A reload starts again from the
  options, so Sam waits again, and the codes, the pause, and the switch
  are those of the options. An operator never waits, so a pause, a change
  of the switch, or a new code of the operator section cannot reach the
  waitlist screen.
- Acme has the
  routines of the mockups, each with the runs that its page in the mockups
  lists. `?runs=failed` or `?runs=skipped` gives Review pull requests the
  failed or the skipped runs of the mockups. A skipped run names the
  account outside Acme by its login. The fake has no workspaces for these
  runs, so the workspace list stays as the mockups draw it, and the link
  of such a run opens no workspace. `?run=pull-request` or `?run=schedule`
  makes `checkout-autocomplete` the workspace of one run, so its header
  shows the line of that run, with the pull request of a pull request run.
  The other orgs have no
  routines, so their Routines page shows its empty state. A save of a
  routine checks the prompt, each custom cron, and the time zone, as the
  Worker does. A removal of a repository on the Repositories tab turns off
  each routine in it, with the reason that the routine page shows, as the
  Worker does. Its author filter knows the members of the org and a few
  bots, such as `dependabot[bot]`. Any other login gets the refusal of a
  login that names no GitHub account, with its trigger and its list.
- Run now makes the workspace of the run as Create workspace does, in the
  section of the routine, and the run takes the state of that workspace.
  Without the agent login of the routine's model, as with `?login=none`,
  the run fails with no workspace. A prompt that contains `fail` stands for
  a cloud computer that did not start: the run fails and keeps its
  workspace, in the error state with Try again, as the Worker does. The
  recorded server has no chat for
  a workspace that the fake made, so its chat does not load, and the line
  of its routine does not show.
  The dev backend records each run's agent and owner when Run now starts it.

The development fake keeps each org's workspace number counter.
A create gets the next number and a web link on the fake API origin.
Workspace readers keep the number and link that the Worker supplies.

The development fake saves shortcut batches through `dev/shortcut-routes.ts`.
It checks the whole batch with the shared reader before it changes state.
It keeps each keyboard separate, preserves empty key lists, and removes
an override when the request sends null keys.
The next account read returns both keyboards.
