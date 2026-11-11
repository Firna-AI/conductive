# Run the web app

This page is part of the [web app README](README.md#run-it). It gives how
the web app runs in development, with the fake API, and in the production
build.

- `npm run dev` serves the app at `http://127.0.0.1:5173` with the fake API
  of `src/test-support/`. Development only: `main.tsx` loads it behind
  `import.meta.env.DEV`, so the production build never bundles it.
- The local Worker serves the page. The
  [Get started steps](../../README.md#get-started) give its local setup.
- The dev wiring in `dev/` keeps an in-memory state, so that an edit in the
  browser shows on the next read. Query options choose a preview state, for
  example `?role=member`, `?workspace=starting`, `?firstRun=org`,
  `?login=none`, `?deleted=1`, `?suspended=1`, `?operator=1`,
  `?waiting=1`, `?paused=1`, `?waitlist=off`, or
  `?paths=masked`. `dev/options.ts` lists them. `dev/attachment-routes.ts`
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
- The workspace screen shows the real chat over the dev fake. The fake
  answers each chat write with a recorded reply, changes no state, and
  sends no event. So a sent message stays pending, and a new session adds
  no tab.
- One counter numbers the events of all workspaces of the dev fake, and its
  event source ignores the workspace. So an event of another workspace
  leaves a gap in the event numbers of the chat. At the next event of the
  open workspace, the chat opens its stream again, and the history fills
  the gap. Each such event costs one more connection, and the chat still
  applies the later events. Use `npm run dev` for the chat load and the
  kept chat. The
  [chat development page](../chat/dev/README.md) has a fake with state for
  live events and writes.
- The production build uses `live-services.ts`: the Worker on the origin of
  the page, its event socket, and an `XMLHttpRequest` for each raw file
  upload, which measures the bytes that the browser sent.

The development fake keeps each org's workspace number counter.
A create gets the next number and a web link on the fake API origin.
Workspace readers keep the number and link that the Worker supplies.
