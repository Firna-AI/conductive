# Waitlist switch

Status: Active. On branch `calummoore/waitlist-global-toggle-brainstorm`, no pull request yet. The pull request that completes the work deletes this plan, as the `plans` skill says.

The user approved all milestones on 9 November 2026 with "impl all plan
milestones and tasks".

Since pull request #116, a waitlist stands in front of the app (decision
160). A new GitHub sign-in creates an account without app access. An
approval, an invite code, a referral code, or an org invitation lets the
person in. The operator section can pause sign-ups, but no control lets
everyone in. This change adds a waitlist switch to the operator section,
beside Pause sign-ups (decision 230). While an operator has turned the
waitlist off, each sign-in gets app access at once, and a person who waits
gets it at their next request. The pause still stops all sign-ups. When
an operator turns the waitlist on again, new people wait again, and
nobody loses app access.

The change does not cover a cap or an end time for open sign-up, an email
to the people who wait, a bulk approval, or a deploy setting for the
switch. It also does not cover a fresh sign-in for operator writes, which
[a follow-up item](follow-ups/fresh-sign-in-for-operator-writes.md) keeps
open. The brainstorm notes are in `.context/waitlist-switch/brainstorm.md`.
The options check of the decision is in
`.context/waitlist-switch/options-check.md`.

On 9 November 2026, other branches use the decision numbers 213 to 217
and 220 to 228. This plan uses 230.

Contract owners:

- `docs/protocol/sign-ups.md`, a new page "Sign-ups". Milestone 2 writes
  it, with the pause of the waitlist doc and of the operator section doc.
- [Waitlist](../docs/protocol/waitlist.md) and
  [Invite and referral codes](../docs/protocol/waitlist-codes.md).
- [Operator section](../docs/protocol/operator-section.md).
- [Access and security](../docs/protocol/access-and-security.md#sign-in)
  and [Orgs and members](../docs/protocol/orgs-and-members.md), one
  sentence each.
- The [architecture doc](../docs/architecture.md).
- The Privacy page in `src/marketing/privacy.ts`.
- The [waitlist backend README](../worker/waitlist/README.md), the
  [operator area README](../worker/operator/README.md), the
  [security README](../worker/security/README.md), the
  [migrations README](../migrations/README.md), the
  [marketing site README](../src/marketing/README.md), the
  [operator section README](../src/shell/operator/README.md), and the
  [web app README](../src/app/README.md).
- The [mockup catalogue](../docs/mockups/catalogue.md).

## Decisions

### 230. No global switch turns the waitlist off

Added on 9 November 2026 from the user's message of 9 November 2026: "can
we have a global on/off button for the waitlist? brainstorm".

- **Severity:** Medium. **Effort:** Large.
- **Source:** Design.
- **Category:** Docs or spec.
- **Location:** `requireAppAccess` in `worker/security/app-access.ts`,
  `signInAppAccess` in `worker/security/sign-in-access.ts`, the
  `signup_settings` table, and
  [The pause](../docs/protocol/waitlist.md#the-pause).
- **Terms:**
  - **App access:** the right to use the app. A user without it sees only
    the waitlist screen.
  - **The pause:** Pause sign-ups on the Invite codes tab of the operator
    section. It stops codes and org invitations. Approvals still work.
  - **Open sign-up:** the state while the waitlist is off and sign-ups are
    not paused. Each sign-in then gets app access.
  - **Record of app access:** the row that says when and how each user got
    app access. It allows six fixed sources.
- **Background:**
  - The pause is one row in the `signup_settings` table. The row also
    keeps the operator and the time of the last change.
  - The gate refuses each request of a user without app access, except a
    short allow list.
  - The record of app access has a fixed list of sources. A new source
    needs a migration that rebuilds that table.
  - The operator section changes only the codes and the pause (decisions
    143 and 160). A new switch changes this rule.
  - The app's own Boat account pays for each cloud computer. During open
    sign-up, anyone with a GitHub account can start them.
- **Problem:** No control lets every new person in. The operator must
  approve each person or share an invite code.
- **Impact if no action:** To open the app, the operator must share a large
  invite code. People who sign in without its link still wait, and the
  site still says "Join the waitlist".
- **Root question:** How does the operator let every new person in, and
  later make new people wait again, without a deploy?
- **Options:**
  - **A.** Add a "Waitlist on/off" switch to the Sign-ups box, beside Pause
    sign-ups. While it is off, each sign-in gets app access with the new
    source "open sign-up". A person who already waits gets app access at
    their next request. The pause still stops all sign-ups, and Resume
    returns to the state of the switch. Cost: two switches, so the box
    must say that the pause wins. Effort: Large.
  - **B.** Replace Pause sign-ups with one Sign-ups control with three
    states: Open, Waitlist, and Paused. The rules on the server are the
    same as in A. Cost: it reworks the pause that just shipped, with its
    notice and its routes. Resume must remember the earlier state. Effort:
    Large.
  - **C.** Added by the options check: open sign-up through one open invite
    code. Turn off the waitlist makes an invite code with the label "Open
    sign-up". Each sign-in uses this code before a join code. Each request
    of a person who waits also uses it. Turn on the waitlist disables the
    code. The pause stops it as it stops every code, and the record table
    needs no rebuild. Cost: open sign-up takes the rules of codes, so each
    open period needs a new code and a use limit. The record also names a
    code that the person never typed. Effort: Large.
  - **D.** Added by the options check: A, plus an optional end. The
    question before Turn off the waitlist can set an end time or a number
    of open sign-ups. After the end, the grant, the notices, and the site
    treat the waitlist as on. Cost: one more field in the question and one
    more fact in the notice. It limits what the app's Boat account pays if
    an operator forgets to turn the waitlist on again. Effort: Large.
  - **E.** Added by the options check: A, but each change into open
    sign-up gives app access at once to every person who waits, in the
    same D1 batch as the change. Turn off the waitlist while sign-ups are
    not paused is such a change, and so is Resume sign-ups while the
    waitlist is off. The gate then stays a read. Cost: each grant happens
    while the person is away, so the approval email of decision 162 would
    become the burst of email that the waitlist doc rejects. A turn-off by
    mistake also lets every person who waits in at once, for good. Effort:
    Large.
- **Left out:**
  - A deploy setting, such as a Worker variable, because it is not a
    button. Each change needs a deploy.
  - Approve all, because new sign-ins still wait.
  - One public invite code with no limit behind the main action of the
    site, because people who sign in without the link still wait, and the
    site needs a setting for the code anyway.
  - Open access without a record, because turning the waitlist on again
    then locks those users out. That breaks the rule that app access is
    final.
  - An automatic approval by a rule, such as the age of the GitHub
    account, because it is not on/off, and decision 48 dropped that kind of
    check.
  - Change nothing and share a large invite code, because each person must
    get the link, and the site still says "Join the waitlist".
  - An email to each person who waits when the waitlist turns off, because
    decision 162 chose an email only at approval, and the waitlist doc
    rejects a burst of email at the end of a pause.
  - A lesser app access for open sign-ups, such as a limit on cloud
    computers, because the product is free with no limits (decisions 45
    and 81).
- **Wider fix:** None. This is a new feature, not a class of defect.
- **Previous examples:** Decision 22, on 5 November 2026: the user chose
  open sign-up over invite-only and a waitlist. Decision 81, on 6 November
  2026: the user chose free with no limits. Decision 143, on 8 November
  2026: the user declined a "Pause sign-up" switch for then. Decision 160,
  on 8 November 2026: the user chose the waitlist and the pause.
- **Related:** The open follow-up item
  [fresh-sign-in-for-operator-writes.md](follow-ups/fresh-sign-in-for-operator-writes.md)
  asks whether operator writes need a fresh GitHub sign-in. This switch is
  the strongest operator write, so that answer covers it too.
- **Recommendation:** A. It keeps the pause as it shipped, and the pause
  stays an emergency stop in both states. B gives one control, but it
  reworks the pause for little gain. Each grant of A happens while the
  person is at the app, so no email is owed, and its record names open
  sign-up plainly. D best protects the app's Boat account, and it can
  follow A later with no rework.
- **Options check:** ran after the answer, on 9 November 2026. It added C,
  D, and E, kept the root question, and kept A. The report is in
  `.context/waitlist-switch/options-check.md`.
- **Action:** asked the user, because the switch changes who may sign up,
  and it adds a third setting to the operator section, which decisions 143
  and 160 limit to two.
- **Chosen:** A, by the user on 9 November 2026: "1 = A".

## Design

### What the switch does

Milestone 2 writes these requirements into `docs/protocol/sign-ups.md`.

- An operator can turn the waitlist off and on again (decision 230). The
  waitlist is on until an operator turns it off.
- Open sign-up is on while the waitlist is off and sign-ups are not
  paused.
- During open sign-up, each sign-in of a user without app access gives
  app access, with the source "open sign-up".
- During open sign-up, a user who waits gets app access at their next
  request. So the waitlist screen opens the app when the person comes back
  to the tab or the window.
- While the pause is on, the switch lets nobody in.
- When the waitlist turns on again, nobody loses app access, and the next
  new sign-in waits.
- The app keeps the time and the operator of the last change of the
  switch.
- The record of an open sign-up names the operator who last turned the
  waitlist off.
- During open sign-up, a join link signs the person in with no use of its
  code.
- No email goes out when the waitlist turns off, or when a person gets in
  by open sign-up.
- The operator section shows the switch, its question, and its notice, as
  the design calls below say.
- The main action of the marketing site follows the switch, as the design
  calls below say.

### Design calls

Each call is my call of 9 November 2026. The brainstorm message of that
day listed most of them as design calls.

- **The pause wins.** While the pause is on, nobody gets in by a sign-in,
  also with the waitlist off. Reason: the pause exists to stop all
  sign-ups for a time.
- **People who wait get in at their next request.** During open sign-up,
  the gate gives app access to a user who waits. Reason: a waitlist that is
  off holds nobody. A grant to everyone at once would also count people
  who never come back.
- **No email.** Reason: the person is at the app when the grant happens.
  The waitlist doc already rejected a burst of email at the end of a pause.
- **The record names the operator of the switch.** Reason: each grant then
  traces back to a person, as an approval does.
- **Turn off asks first. Turn on acts at once.** The question says that
  each new sign-in gets app access at once. It also gives the number of
  people who wait, and says that each of them gets in at their next visit.
  Reason: the pause works the same way, and the waitlist on is the usual
  state. The options check asked for the next visit.
- **The words of the pause change.** The question and the notice of the
  pause also say that the pause stops open sign-up. The Sign-ups box must
  not read as if "Open" means open sign-up. Reason: the pause wins over
  the switch, and the operator must see that. The options check found
  this gap.
- **A notice on each page of the operator section while the waitlist is
  off.** It names the operator and the time, and it holds Turn on the
  waitlist. While both notices show, the notice of the pause comes first.
  Reason: the pause has the same notice, and the pause decides who gets
  in.
- **The Account page during open sign-up.** The invite code section says
  that anyone can sign up now, and that the invites stay for later.
  Reason: the pause has the same kind of notice there.
- **The code of a join link stays unused during open sign-up.** The
  sign-in gives app access before it reads the code. Reason:
  [The join link](../docs/protocol/waitlist-codes.md#the-join-link)
  already keeps a code for someone who needs it.
- **The main action of the site.** It reads "Start free with GitHub"
  during open sign-up, and "Join the waitlist" at all other times. When
  the Worker cannot read the switch, the site shows "Join the waitlist"
  and the Worker writes a warning. Reason: "Start free with GitHub" was
  the text before the waitlist, and the safe default promises less.
- **The site keeps the switch for up to 60 seconds.** Only the label of
  the site uses this copy. The sign-in and the gate always read D1.
  Reason: a D1 read before each page delays the page. After a change, the
  label can be up to a minute late, but the sign-in still decides who gets
  in. The options check found the delay.
- **The waitlist starts on**, on a new database and on the deployed app.
  Reason: the waitlist is the rule in force.
- **No cap and no end time.** Reason: the user asked for a plain on/off
  switch. The options check kept A over D, an optional end, because D can
  follow A later with no rework.
- **Words.** The operator section says "Turn off the waitlist" and "Turn on
  the waitlist". The screens of people who wait and of users never name
  the switch. Reason: the people see only its result.
- **A route and a model of its own.** The switch gets its own operator
  route and app model, which mirror those of the pause. The pause route
  and its reply stay as they are. Reason: option A keeps the pause as it
  shipped, and a parallel route is the smallest change.
- **A new protocol page, "Sign-ups".** It holds the pause and the switch.
  Reason: the waitlist doc has 232 lines and the operator section doc has
  254, so the switch would push both past the length target of 250 lines.
  The two controls also belong together.
- **No split of two long docs.** `docs/protocol/access-and-security.md`
  (500 lines) and `docs/architecture.md` (281 lines) change by a few
  sentences. Their split stays with
  [protocol-docs-split.md](follow-ups/protocol-docs-split.md). Reason: open
  branches change those pages, as that item says.

The mockups of Milestone 1 showed the problems below. Each call is my call
of 9 November 2026.

- **The Sign-ups box names the state of sign-ups.** While the waitlist is
  on, the box says "Waitlist on", with Turn off the waitlist beside Pause
  sign-ups. While the waitlist is off, the box says "Open" with Pause
  sign-ups, and the notice of the switch holds Turn on the waitlist.
  Reason: "Open" then shows only during open sign-up, as the call "The
  words of the pause change" asks.
- **The pause hides the switch.** While sign-ups are paused, the notice of
  the pause takes the place of the whole Sign-ups box, as it does today.
  So Turn off the waitlist shows only while sign-ups are not paused.
  Reason: the pause is an emergency stop, and a turn-off during it would
  need a second form of the question.
- **The notice of the switch follows the pause.** While both notices show,
  the notice of the switch says that each new sign-in gets app access when
  sign-ups resume. Resume sign-ups returns to open sign-up. Reason: the
  notice must not promise app access while the pause stops it.
- **The question says what stays.** It also says that no email goes out,
  and that nobody loses app access when the waitlist turns on again.
  Reason: each grant is final, so the operator decides with these facts.
- **The button of the question says "Turn off".** The title keeps the full
  words. Reason: "Turn off the waitlist" does not fit beside Cancel in the
  sheet of a phone.
- **The Account page shows open sign-up only for a code with invites
  left.** The pause wins, so its notice shows while both are on. A code
  that is used up or turned off keeps its own state. Reason: the invites
  stay for later only while some are left.
- **Two mockup pages have child pages.** The state of open sign-up of the
  home page is the child page `marketing/open-sign-up`, not a variant. The
  four variants of `app/operator/user/access` moved into child pages with
  the same paths, beside `open-sign-up`. Reason: a page with child pages
  shows only its canonical screen.

The web app work adds these calls on 9 November 2026. Each is an agent
call within the approved design.

- **Keep Pause sign-ups available while the switch loads or fails.** The
  switch has its own placeholder, failure, and Try again in the box.
  Reason: the pause stays an emergency stop.
- **Wait for the pause read before the switch notice.** Reason: the
  notice must not promise app access while the pause state is unknown.
- **Use the pause's failure-word pattern and operator fallback.** A failed
  change names the action. A record with no operator says "by an operator".
  Reason: the two controls and access sources use consistent words.
- **Seed one existing sample user with open sign-up in the dev option.**
  Reason: the user page then shows the new source without changing the
  default user counts.

### Mechanics

- **Data.** A migration adds `waitlist_on` (default on),
  `waitlist_updated_at`, and `waitlist_updated_by_user_id` to the one row of
  `signup_settings`. It rebuilds `user_app_access` with the source
  `open_signup` in its check list, and keeps every row.
  `202611082300_new_workspace_view.sql` rebuilds `user_preferences` in the
  same way. No table refers to `user_app_access`.
- **The grant.** `worker/waitlist/grant.ts` gets the source `open_signup`.
  Its record takes the operator from `signup_settings`. The insert runs
  only while the waitlist is off and the pause is off, through the
  `condition` of `appAccessGrantStatements`. So a pause that starts at the
  same moment wins.
- **Where it runs.** The sign-in runs the grant after the operator grant
  and before the join code. The gate runs it for a user without app
  access, before the allow list. The gate tries it only during open
  sign-up, so a person who waits adds no write while the waitlist is on.
  The session read, the waitlist state read, and the device connection of
  the Mac app all pass the gate, so each one sees the new app access.
- **Replies.** The waitlist state reply gets `waitlistOn`. The operator
  user page gets the source `open_signup` with its operator.
- **Operator routes.** A new path, `/api/operator/waitlist-switch`, takes
  GET to read, POST to turn the waitlist on, and DELETE to turn it off, as
  the pause path does. Only operators reach it. A repeat changes nothing
  and keeps the time and the operator of the last change. The reply gives
  the state, the time and the operator of the last change, and the number
  of people who wait, as the Waitlist tab counts them.
- **The site.** A new site marker holds the label of the main action. The
  Worker fills it in each page of the marketing site, from a copy of the
  switch that it keeps for up to 60 seconds. The Astro development server
  shows "Join the waitlist".
- **The web app.** A model beside `src/app/operator-pause.ts` and a context
  beside `src/shell/operator/pause-context.ts` read and change the switch.
  The dev fake gets `waitlist=off`, as it has `paused=1`.

## Milestone 1: Mockups

Tags: mockup

Depends on: none

The operator section gets the switch, its question, and its notice. The
page of a user gets the source "open sign-up". The Account page gets its
state during open sign-up. The marketing site gets its main action during
open sign-up, and a user flow shows the open sign-up.

- [x] Add the state of the waitlist with Turn off the waitlist to the
      Sign-ups box of `app/operator/codes`, beside Pause sign-ups. Put
      the words beside `pauseWords` in
      `docs/mockups/src/components/operator/codeCopy.ts`.
- [x] Change the words of the pause in `codeCopy.ts`, as the design call
      "The words of the pause change" says. Update the screens of
      `app/operator/codes/pause` that show them.
- [x] Add the page `app/operator/codes/waitlist-off` with at most five
      screens:
  - [x] the question before Turn off the waitlist, with the number of
        people who wait
  - [x] the notice while the waitlist is off, on the Invite codes tab,
        with Turn on the waitlist
  - [x] the same notice on the Waitlist tab and on the Overview
  - [x] the waitlist off while sign-ups are paused, with both notices
- [x] Add the source "open sign-up" with its operator to the page of a
      user, in a new sub-page of `app/operator/user/access`, because
      Ways in already shows five screens. Put the words in
      `docs/mockups/src/components/operator/accessCopy.ts`.
- [x] Add the state of open sign-up to `app/account/invites`. Put the
      words in `docs/mockups/src/components/settings/inviteCodeCopy.ts`.
- [x] Add a variant of `marketing` whose main action and footer read
      "Start free with GitHub". Put the label in
      `docs/mockups/src/components/marketing/SiteActions.tsx`, beside
      `startLabel`.
- [x] Add the user flow `user-flows/open-sign-up`: the site with Start
      free with GitHub, Continue with GitHub, and Get started. Reuse the
      screens of the sign-up flow.
- [x] Update `docs/mockups/catalogue.md` and `docs/mockups/design.md`.
- [x] Run `npm run mockups:check`. Smoke-test the changed pages with
      `npm run mockups:serve`, on desktop and on a phone.
- [x] Update the design and the TODOs of this plan for each problem that
      the mockups show.

Evidence: `.context/waitlist-switch/reports/m1-mockups.md`.

## Milestone 2: Documentation and protocol

Depends on: 1

The new page "Sign-ups" states the pause and the switch. The other docs
link to it, and the Privacy page follows the changed facts.

- [x] Create `docs/protocol/sign-ups.md`. Move "The pause" of
      `docs/protocol/waitlist.md` and "The pause" of
      `docs/protocol/operator-section.md` into it. Add the requirements of
      "What the switch does" and the design calls that the operator
      section and the site show. Leave a short "The pause" section with a
      link in each old page, so that its anchor still works.
- [x] Update `docs/protocol/waitlist.md`: who waits while the waitlist is
      on, open sign-up as a fifth way in, the source "open sign-up" in the
      record of app access, and the words of the switch.
- [x] Update `docs/protocol/waitlist-codes.md`: the Account page during
      open sign-up, and the link to the pause.
- [x] Update `docs/protocol/operator-section.md`: three settings of the app
      (decision 230), and the notice of the switch on each tab.
- [x] Change the one sentence about a new sign-in in
      `docs/protocol/access-and-security.md` and in
      `docs/protocol/orgs-and-members.md`.
- [x] Update `docs/architecture.md`: the term Waitlist, the main action of
      the site, the operator section, the storage table, and the list of
      protocol docs.
- [x] Read the Terms page in `src/marketing/terms.ts` and the Privacy page
      in `src/marketing/privacy.ts` in full. Update each sentence that
      restates a changed fact. The Privacy page must say that a new account
      waits only while the waitlist is on, and that the record can name an
      open sign-up with its operator.
- [x] Point each link to `waitlist.md#the-pause` and
      `operator-section.md#the-pause` in docs, READMEs, mockups, and code
      comments at the new page.
- [x] Check each relative link of each changed Markdown file.
- [x] Align the mockup catalogue, waitlist summary, and sign-in entry
      descriptions with open sign-up.

Evidence: `.context/waitlist-switch/reports/m2-docs.md` and
`.context/waitlist-switch/reports/m2-legal.md`.

## Milestone 3: Worker: the switch and open sign-up

Depends on: 2

The Worker keeps the switch, gives app access during open sign-up, and
records its source.

- [x] Add the migration `202611092050_waitlist_switch.sql`, as
      "Mechanics" says.
- [x] Describe the migration in `migrations/README.md`.
- [x] Add the grant of open sign-up to `worker/waitlist/grant.ts`, with the
      condition on the switch and the pause.
- [x] Run the grant in the sign-in, before the join code, and in the gate,
      before the allow list, during open sign-up only.
- [x] Add `waitlistOn` to the waitlist state reply.
- [x] Add the operator routes of the switch: read, turn on, and turn off.
- [x] Add the source `open_signup` with its operator to the reply of the
      operator user page.
- [x] Add each test case to the existing test of its requirement, such as
      `worker/security/waitlist-gate.test.ts`,
      `worker/security/waitlist-auth.test.ts`,
      `worker/security/waitlist-join.test.ts`, and
      `worker/operator/waitlist-access.test.ts`. The break that each case
      catches is in parentheses:
  - [x] A sign-in during open sign-up gets app access with the source and
        the operator. (The sign-in skips the grant.)
  - [x] A person who waits gets app access at the next request during open
        sign-up. (The gate skips the grant.)
  - [x] With the waitlist off and the pause on, a sign-in and a request
        give no app access. (The condition leaves out the pause.)
  - [x] A join code stays unused during open sign-up. (The sign-in uses
        the code first.)
  - [x] After the waitlist turns on again, the user keeps app access, and
        a new sign-in waits. (The grant ignores the switch.)
  - [x] The switch routes refuse a user who is not an operator with HTTP
        403 `operator_required`. A repeat keeps the time and the operator
        of the last change. (The route skips the operator check, or a
        repeat writes.)
- [x] Update `worker/waitlist/README.md`, `worker/operator/README.md`, and
      `worker/security/README.md`.
- [x] Align the Worker overview, shared contracts, and Worker test-support
      READMEs with the new switch and marker.
- [x] Run `npm run test -- worker/waitlist worker/security worker/operator`.

Evidence: `.context/waitlist-switch/reports/m3-m4-worker.md`.
README evidence: `.context/waitlist-switch/reports/m3-m4-readmes.md`.

## Milestone 4: Worker: the main action of the site

Depends on: 3

The Worker fills the label of the main action of the marketing site from
the switch.

- [x] Add a site marker for the label of the main action to
      `src/shared/site-build.ts`, with "Join the waitlist" for the Astro
      development server.
- [x] Fill the marker in each page of the marketing site, as the design
      call says. Keep the copy of the switch for up to 60 seconds. When
      the read fails, fill "Join the waitlist" and write a warning.
- [x] Test both labels, the failed read, and a change after the copy ends,
      on a page that holds the marker. Control the time through the
      clock of the Worker dependencies.
- [x] Update `src/marketing/README.md`.

Evidence: `.context/waitlist-switch/reports/m3-m4-worker.md` and
`.context/waitlist-switch/reports/m3-m4-readmes.md`.

Evidence: `.context/waitlist-switch/reports/m3-m4-worker.md`.

## Milestone 5: Web app: the switch in the operator section

Tags: ui

Depends on: 1, 3

- [x] Add the model and the context of the switch, beside those of the
      pause.
- [x] Add the switch to the Sign-ups box, with the question before Turn
      off the waitlist. Turn on the waitlist acts at once.
- [x] Add the notice of the switch to each page of the section, after the
      notice of the pause.
- [x] Show the source "open sign-up" with its operator on the page of a
      user.
- [x] Add `waitlist=off` to the dev fake, for the operator section and for
      a person who waits.
- [x] Test the question and the turn-off, the notice and Turn on the
      waitlist, the order of the two notices, and the source line. Name the
      break that each test catches.
- [x] Update `src/shell/operator/README.md` and `src/app/README.md`.

Evidence: `.context/waitlist-switch/reports/m5-m6-ui.md`.

## Milestone 6: Web app and site: the Account page and the main action

Tags: ui

Depends on: 1, 3, 4

- [x] Add the state of open sign-up to the invite code section of the
      Account page.
- [x] Put the marker of the label in
      `src/marketing/components/StartButton.astro` and
      `src/marketing/components/SiteFooter.astro`.
- [x] Test the Account page state, and check the built site with
      `npm run site:build`.
- [x] Update `src/marketing/README.md` and `src/app/README.md`.
- [x] Move the picture capture guide into its own README to keep the
      marketing README under 300 lines. Keep the old Pictures anchor.

Evidence: `.context/waitlist-switch/reports/m5-m6-ui.md`.

## Milestone 7: Verification, commit, review, and pull request

Depends on: every other milestone

- [x] Run `npm --prefix desktop ci` and `npm ci --prefix runner`, then the
      targeted tests and `npm run check`.
- [x] Smoke-test the operator section and the Account page in
      `npm run dev` with `?waitlist=off`, on desktop and on a phone. Save
      the screenshots under `.context/waitlist-switch/`.
- [ ] Commit with Conventional Commits and push the branch.
- [ ] Review the complete local diff against `origin/main` with the
      `implementation-review` skill after the push. Report the findings,
      then apply the fix rule: fix the `fix now` findings, record
      follow-up items under `plans/follow-ups/` for the rest, re-review
      once, and report.
- [ ] Delete this plan when the `plans` skill says, under "Deleting the
      plan".
- [ ] Open the pull request. Its description gives decision 230 and the
      design calls of this plan with their dates, a permalink to this plan,
      and the follow-up items that the change adds.

Evidence: `.context/waitlist-switch/full-gate.log` and
`.context/waitlist-switch/root-visual-check.md`.

## Post-merge follow-up (non-blocking)

- [ ] On the deployed app, turn the waitlist off as an operator. Sign in
      with a new GitHub account, and check that the app opens with no
      waitlist screen. Check its source on the operator page of the user.
      Turn the waitlist on, and check that the next new account waits.
      When the plan is deleted, add these steps to
      [waitlist-deployed-smoke-test.md](follow-ups/waitlist-deployed-smoke-test.md).
