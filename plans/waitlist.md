# Waitlist and invite codes

Status: Active. On branch `calummoore/waitlist-and-invite-system`, no pull request yet. The pull request that completes the work deletes this plan, as the `plans` skill says.

Today anyone with a GitHub account can sign up, and the app's own Boat
account pays for each cloud computer that they start (decisions 22, 80,
and 81). This change puts a waitlist in front of the app. A new GitHub
sign-in creates an account without app access. Until the person gets app
access, the app shows only a waitlist screen. The approval of an
operator, an invite code, a referral code, or an org invitation gives app
access. Each user with app access has a referral code with 5 uses. The
operator sees the waitlist, approves people, makes and disables invite
codes, and pauses every way in, from the
[operator section](../docs/protocol/operator-section.md).

The change builds on the operator section, as the user asked. This branch
started from the branch of the operator section. That section merged into
`main` in pull request #89 on 9 November 2026. This branch then merged the
last commit of that branch and the latest `main`, and the milestones after
Milestone 1 start from there. The change does not cover limits for each user,
billing, a place in line, bulk approval, codes with an end date, a
self-service Delete account, or a change of who is an operator. The
brainstorm notes are in `.context/waitlist/brainstorm.md`. The options check of the
decisions is in `.context/waitlist/options-check.md`.

The decision numbers start at 160. Open branches already use the numbers
142 to 151, some of them twice. Other open workspaces may take the next
numbers.

Contract owners:

- [Waitlist](../docs/protocol/waitlist.md) and
  [Invite and referral codes](../docs/protocol/waitlist-codes.md).
  Milestone 2 writes them.
- [Access and security](../docs/protocol/access-and-security.md#sign-in).
  Milestone 2 changes its sign-up rule.
- [Orgs and members](../docs/protocol/orgs-and-members.md). Milestone 2
  changes its rules for sign-up and Get started.
- [Operator section](../docs/protocol/operator-section.md). Milestone 2
  adds the Waitlist and Invite codes tabs.
- The [security README](../worker/security/README.md), the
  [operator area README](../worker/operator/README.md), the
  [members README](../worker/members/README.md), and the
  [web app README](../src/app/README.md).
- The [mockup catalogue](../docs/mockups/catalogue.md).

## Decisions

### 160. Put a waitlist in front of the app

Added on 9 November 2026 from the user's message of 8 November 2026.

- **Chosen by the user on 8 November 2026:** "I want to add a waitlist, I
  will control the waitlist from the operator screens [...] Operator will
  be able to - 1. approve specific users 2. generate invite codes (with
  their own limits) - and disable existing ones 3. see users in the
  waitlist 4. block all invite codes (in case we need to stop all user
  signups for a period) users with access can invite users to their own
  org - they also have their own referral code with 5 count".
- **Effects:**
  - A new person waits for app access. The ways in are the approval of an
    operator, an invite code, a referral code, and an org invitation.
  - The waitlist replaces the open sign-up of decision 22. It ends the
    rule of `docs/protocol/orgs-and-members.md` that rejected an
    invite-only sign-up for now (decision 81).
  - The operator controls the waitlist from the section of decision 142.
  - The section changes two app settings: the invite codes and the pause.
    This changes the rule of decision 143 that the section changes no
    setting of the app, for these two settings only. The section still
    cannot change who is an operator.
  - Each user with app access has a referral code with 5 uses.
  - Decisions 161, 162, and 163 choose how people wait, how they learn of
    an approval, and how many people org invitations let in.
- **Options check:** skipped, because this records a direct request of the
  user, with no options to check.

### 161. Choose how people wait and get in

- **Severity:** High. **Effort:** Large.
- **Source:** Design.
- **Category:** Security.
- **Location:** `finishSignIn` in `worker/security/auth.ts`, which creates
  each account, and `gate` in `worker/security/gate.ts`.
- **Terms:**
  - **App access:** the right to use the app: create or join an org, and
    start cloud computers. The protocol already uses "access" for orgs and
    sandboxes, so the docs and the code say "app access".
  - **Invite code:** a code that an operator makes, with a use limit. Each
    use lets one new person in.
  - **Referral code:** the personal code of each user with app access. It
    lets up to 5 new people in.
  - **Gate:** the check of the Worker before each request and each socket
    of the app: the sign-in, the `Origin` header, and the JSON body.
- **Background:**
  - Today each GitHub sign-in that accepts the Terms creates an account
    and a sign-in session. Get started then opens.
  - Decision 160 replaces this open sign-up with a waitlist.
  - The ways in are the approval of an operator, an invite code, a
    referral code, and an org invitation.
  - All options keep the GitHub sign-in of the app, as
    [Sign-in](../docs/protocol/access-and-security.md#sign-in) requires.
    Option D drops it only to join the waitlist.
  - All options keep the waitlist and the codes in the app's own database,
    because the operator controls them from the operator section.
  - All options give app access to one person, not to an org, because
    decision 160 names users.
- **Problem:** No requirement says where a person without app access
  waits, or what that person can reach.
- **Impact if no action:** Anyone with a GitHub account can still start
  cloud computers that the app pays for.
- **Root question:** How does a person without app access join the
  waitlist, what can they reach, and what does the app keep about them
  until they get in? The options check wrote this question, because the
  options differ in the data that the app keeps too.
- **Options:**
  - **A.** A waitlist entry with no account. A sign-in without app access
    saves only a waitlist entry and starts no session. A simple Worker
    page shows the waitlist and a code field. After approval, the next
    sign-in creates the account. Cost: the person must sign in again, and
    they learn of the approval only by email. The Mac app shows no
    waitlist screen. Effort: Large.
  - **B.** A waitlisted account with its own screen. The sign-in creates
    the account and the session as now, but without app access. The app
    shows only a waitlist screen with a code field, the person's org
    invitations, and Sign out. The gate refuses every other request from
    such a session. App access works at once, with no new sign-in. Cost:
    the gate must fence a new kind of session, and the app keeps the
    GitHub token of each person who waits. Effort: Large.
  - **C.** A full account, where app access controls only the cloud
    computers. The person can finish Get started, create an org, and save
    agent logins at once. Only the start of a cloud computer or a build
    waits for app access. Cost: people without app access can reach many
    more requests, and they see an app that cannot run yet. Effort: Large.
  - **D.** An email form on the marketing site. A person joins with an
    email address and no GitHub sign-in. An approval sends a code by
    email. Cost: the operator cannot judge a person from their GitHub
    account, and the form needs bot protection and an email check. The
    operator section must also show email addresses, which its protocol
    forbids. Effort: Large.
  - **E.** Added by the options check: a waitlisted account, fenced at the
    org. The gate does not change. Create org refuses a person without app
    access, and an org invitation gives app access in the same step as the
    membership. Each org, workspace, and cloud computer route already
    needs a membership. Cost: a person who waits can still reach the
    account routes, such as Save agent login. A later route outside an org
    is open to them unless it adds its own check. Effort: Large.
  - **F.** Added by the options check: B, but the sign-in saves no GitHub
    token for an account without app access. A join-link code that gives
    app access in the sign-in saves the token as now. After a code on the
    waitlist screen, or after an approval, the first GitHub read asks the
    person to sign in again. Cost: the web app has no flow for that second
    sign-in today, and in the Mac app it goes through the browser. The
    gain is small, because a token reaches only repositories where the
    GitHub App is installed. Effort: Large.
  - **G.** Added by the options check: B, plus each operator has app
    access. The sign-in gives app access, with the source "operator", to
    each user whose GitHub ID is in `OPERATOR_GITHUB_IDS`, also at a later
    sign-in of an account that waits. Cost: a wrong ID in that setting
    lets one person in. Only the deployer sets that value, and it already
    gives more power than app access. Effort: Large, as for B. The rule
    itself is Small.
- **Left out:** Open sign-up as now, because it fails the goal. An allow
  list of GitHub logins or GitHub orgs, options A and E of decision 22,
  because it has no codes, referrals, or waitlist. A hosted waitlist
  service, because a third party then gets user data and the operator
  controls it outside the operator section. Decision 142 rejected a hosted
  tool for operator pages for the same reason. Cloudflare Access, because
  it cannot sign in inside a frame, as
  [Sign-in](../docs/protocol/access-and-security.md#sign-in) says, and it
  has no codes.
- **Wider fix:** G, after the options check. An allow list that refuses by
  default also refuses each route that a later change adds. C and E must
  name each route that a person without app access must not reach.
- **Previous examples:** Decision 22, on 5 November 2026, offered
  invite-only and a waitlist with an approval page. The user chose open
  sign-up. Decision 81, on 6 November 2026, recommended invite-only for
  the first deployment. The user chose free with no limits. Decision 143,
  on 8 November 2026, offered a "Pause sign-up" switch. The user chose no
  settings for now.
- **Related:** Decision 162 depends on this answer. Under option A, an
  email is the only way to tell a person that they got in.
- **Recommendation:** G, after the options check. The first
  recommendation was B. G is B with one rule, so an operator can always
  reach the waitlist, also on a fresh local database. A protects the
  codebase best, because a person without app access then gets no session,
  and the app keeps no token for them.
- **Action:** asked the user, because the options trade a smooth first
  visit against what people on the waitlist can reach and what the app
  keeps about them.
- **Chosen:** B, by the user on 9 November 2026: "1 = B". The options check
  ran after the answer. Its rule of G follows from decision 160, because
  operators control the waitlist. So the agent applies that rule as a
  design call inside B.

### 162. Tell a person when they get access

- **Severity:** Medium. **Effort:** Medium.
- **Source:** Design.
- **Category:** Docs or spec.
- **Location:** `worker/invitation-mailer.ts`, which sends the org
  invitation emails today.
- **Background:** A code or an org invitation lets a person in during
  their own visit. The approval of an operator happens while the person is
  away. The app already sends email through Resend. The GitHub sign-in
  already reads the verified email addresses of each person.
- **Problem:** No requirement says how an approved person learns that they
  can come in.
- **Impact if no action:** An approved person who does not come back by
  chance never uses the app.
- **Root question:** How does a person who waits learn that they can get
  in now, after an approval or after the pause ends? The options check
  wrote this question, because the end of a pause also happens while the
  person is away.
- **Options:**
  - **A.** No message. The app shows the app access at the next visit of
    the person. Effort: Small.
  - **B.** One email at approval, to the primary verified email on GitHub,
    through Resend. The Privacy page says so. Effort: Medium.
  - **C.** B, plus one email when the person joins the waitlist. It
    confirms the entry, but it sends an email for each sign-up. Effort:
    Medium.
  - **D.** Added by the options check: B, with a retry. The approval saves
    its email as pending, in the same D1 batch as the grant, and sends it
    at once. The 15-minute Cron Trigger sends each pending email again,
    with the same idempotency key, until Resend accepts it. The page of
    the user shows whether the email went. Cost: a migration and a retry
    step. After Resend forgets the key, a retry can send a second copy, so
    the retries stop after a set time. Effort: Medium.
  - **E.** Added by the options check: B, plus one email when the operator
    turns the pause off. It goes to each person who still waits and who
    tried a code, or had an org invitation, during the pause. Cost: a
    second kind of email, and a burst of email at the end of each pause.
    A code can be used up by then. Effort: Medium.
- **Left out:** A message through GitHub, because GitHub gives an app no
  way to send a message to a user. A notification of the Mac app, because
  a person who waits may not have the Mac app. A browser push
  notification, because it needs a new secret and reaches only a browser
  that opted in. A Send again button, because D sends again without the
  operator.
- **Wider fix:** D, after the options check. The stored pending email
  covers each way that a send can fail.
- **Previous examples:** The org invitation email of decision 78, in
  `worker/invitation-mailer.ts`.
- **Related:** Decision 161. Under its option A, option A here fails,
  because the person has no other way to learn of the approval.
- **Recommendation:** D, after the options check. The first
  recommendation was B. D keeps the one email and the channel of B, and it
  adds the retry. E adds a second kind of email, so only the user can
  choose it.
- **Action:** asked the user, because an email to a person who waits is
  new behaviour that no requirement covers.
- **Chosen:** B, by the user on 9 November 2026: "2 = B". The options check
  ran after the answer. The retry of D sends the same one email, so the
  agent applies it as a design call inside B.

### 163. Choose how many people org invitations let in

Added on 9 November 2026. The options check moved it from a design call.

- **Severity:** Medium. **Effort:** Small.
- **Source:** Design.
- **Category:** Security.
- **Location:** `acceptOrgInvite` in `worker/members/invites.ts`, where a
  person accepts an org invitation.
- **Background:**
  - Decision 160 says that users with app access can invite users to
    their own org. Each user also has a referral code with 5 uses.
  - Only org admins send org invitations, by email (decision 78). Each
    user with app access can create an org, and so become its admin.
  - An accepted invitation gives app access to a person who waits.
  - The operator can suspend a user and an org. The page of each user
    shows how and when they got in.
- **Problem:** No rule limits how many people who wait one user can let in
  by org invitation. So the 5-use limit of the referral code binds nobody
  who creates an org.
- **Impact if no action:** One user can let in any number of people, and
  the app pays for their cloud computers.
- **Root question:** How many people who wait can one user let in through
  org invitations?
- **Options:**
  - **A.** No count. Each accepted invitation lets the person in, so a
    team joins at once. Cost: one user can let in any number of people
    until an operator acts. Effort: Small.
  - **B.** Each invitation that lets a person in uses one use of the
    referral code of the admin who sent it. One budget of 5 covers both
    ways in. Cost: a team of more than 6 people needs an invite code from
    an operator. Effort: Small.
  - **C.** A separate allowance for invitations, such as 20 people for
    each admin, apart from the referral code. The operator can change it
    on the page of a user. Cost: a second counter, its number, and a
    control in the section. Effort: Medium.
- **Left out:** A limit for each org, because each user with app access
  can create any number of orgs. An invitation that only puts the person
  at the top of the waitlist, because decision 160 says that users can
  invite users to their org.
- **Wider fix:** None, because this is a new feature, not a class of
  defect.
- **Previous examples:** None found.
- **Related:** Decision 160 asked for org invitations and the referral
  code. Milestone 3 builds the app access of an accepted invitation.
- **Recommendation:** A. Teams join at once, and the page of each user
  traces each invited person to one admin and one org, which the operator
  can suspend together. B protects the cost best.
- **Action:** asked the user, because the options trade quick team sign-up
  against a firm limit on new people, and no option is clearly best.
- **Chosen:** A, by the user on 9 November 2026: "163 = A".

## Design

The agent's calls from the brainstorm, on 9 November 2026:

- The waitlist has its own plan, because one plan holds one change. Its
  branch starts from the operator section branch, because the user asked
  to build on the operator screens.
- Each account that exists when the waitlist ships keeps its app access,
  with the source "existing account". The project is not in production,
  and these accounts belong to the team and the testers.
- Only org admins send org invitations, as today. Reason: the user's
  message names the org invitations of today. They let in any number of
  people, as decision 163 chose.
- The pause blocks every way in except the approval of an operator: invite
  codes, referral codes, and the org invitations of people who wait.
  Reason: the user wants to stop all sign-ups, and an approval is one
  deliberate act.
- During the pause, people can still join the waitlist. A code that the
  pause stopped stays unused, and the person can use it again after the
  pause. Reason: nobody gets app access, and nobody loses a code.
- Each user with app access gets one referral code with 5 uses, also a
  user who came in by a referral. Used uses do not come back. The operator
  can disable a referral code. Reason: the user's message.
- A user sees how many uses of their referral code are left, but not who
  used them. The operator sees both. Reason: the least personal data for
  users, and a trace for the operator.
- The app makes each code at random, from 10 characters without look-alike
  characters. The operator gives an invite code a label and a use limit.
  A code has no end date. Reason: nobody can guess a random code, so a
  code check needs no limit on attempts.
- Disable is final. The operator makes a new code instead. Reason: a wrong
  click cannot bring back a leaked code.
- A code works in a join link and in a field on the waitlist screen. The
  join link carries the code through the Terms page and the GitHub
  sign-in, in the signed sign-in state. Reason: a shared link needs no
  typing.
- Approve works only for people who wait, one person at a time. For anyone
  else, the operator makes an invite code with one use. Reason: the user's
  message says "approve specific users".
- The operator section gets two tabs: Waitlist and Invite codes. The pause
  is on Invite codes, with a confirm step. A notice shows on each tab
  while the pause is on. Reason: the section already has one tab for each
  list.
- The Waitlist tab lists the oldest first. Each row gives the GitHub
  login, the name, the age of the GitHub account, and the join day, with
  an initials disc and a link to the GitHub profile. It shows no picture
  and no email address. Reason:
  [Operator section](../docs/protocol/operator-section.md) shows only
  counts, names, IDs, dates, roles, and states. The options check changed
  this call.
- The page of each user gives how and when they got app access: approval,
  invite code, referral code, org invitation, operator, or existing
  account. After an approval, it also shows whether the email went.
  Reason: the operator can trace misuse back to a code or a person.
- The Overview keeps its count of users: every account, by join day. It
  adds a count of the people who wait. Reason: decision 144 chose the
  counts, and the two numbers still show who can use the app. The options
  check changed this call.
- The Privacy page says what the waitlist, the codes, and each app access
  record keep. It names the GitHub token of a person who waits, the
  verified emails that the sign-in stores, and Resend, which sends the
  emails. Reason: the app keeps new personal data, and the draft does not
  name the emails yet.
- The words "Start free with GitHub" of the marketing site change. The
  mockups show the new words. Reason: the old words promise use at once.

The agent's calls from the plan, on 9 November 2026:

- The rules live in a new protocol doc, `docs/protocol/waitlist.md`.
  [Access and security](../docs/protocol/access-and-security.md) and
  `docs/architecture.md` pass the length target, so they change only a
  line, a term, or a list. Their split stays with
  [the split follow-up item](follow-ups/protocol-docs-split.md), as the
  operator section plan decided.
- A session without app access reaches only these requests: the session,
  Sign out, the waitlist state, the use of a code, and the org invitations
  of the person. Every other request and WebSocket upgrade gets HTTP 403
  with the code `access_required`. The check reads the method and the
  path that the browser sent, also when the members gate passes a changed
  request to the shared gate. Reason: one allow list fences the new kind
  of session in one place. The options check changed this call.
- The session reply says whether the user has app access. Reason: the app
  then picks the waitlist screen before it reads anything else.
- Get started opens only after app access. Reason: its steps need app
  access.
- The waitlist screen has no Delete account. Deletion stays a request, as
  the Privacy draft says. Reason: the Worker has no route that deletes an
  account. The options check changed this call.
- A person who waits sees no place in line. Reason: operators approve
  people in any order.
- A code that does not work names the reason: unknown, disabled, used up,
  or the pause. Reason: the person then knows whether to ask for another
  code or to wait.
- The join link of a person with app access uses no code, and the app
  opens as usual, with no notice. Reason: that person needs no code, so
  the code stays for someone else.
- The join page names no owner of the code. Reason: a shared code can
  travel far, and the login of its owner would travel with it.
- Approve asks first. The question names the person and says whether an
  email goes out. Reason: an approval cannot be undone, and the email goes
  at once. The options check changed this call.
- The approval saves its email as pending, in the same D1 batch as the
  grant, and sends it at once. The 15-minute Cron Trigger sends each
  pending email again, with the same idempotency key, until Resend accepts
  it or 24 hours pass. Reason: the operator section shows no email
  address, so the operator cannot tell the person in another way. This is
  option D of decision 162, inside the user's choice of B.
- The org invitation of a person who waits gives app access in the same
  step as the membership. Reason: a person never joins an org that they
  cannot use.
- The search of the Invite codes tab finds any code by its text, also a
  referral code, and opens the page of its owner. Reason: a report of
  misuse often names only a code.
- The invite link that the web app shows uses the origin of the page,
  which is `https://app.conductive.build` in production. Reason: a test
  deployment then shares links to itself. This call is from Milestone 5.
- A join link first changes the address to `/` and shows the loading
  state while its code runs, so a reload uses no code twice. Reason: a
  reload must not repeat a use. This call is from Milestone 5.
- The waitlist screen reads the org invitations again at each return to
  the page, as it reads the app access. Reason: an invitation can arrive
  while the person is away. This call is from Milestone 5.
- The sign-in frame scrolls when its card is taller than the window, also
  on the sign-in page. Reason: the foot of a tall card was cut off. This
  call is from Milestone 5.
- The words of the waitlist dialogs and notices of the operator section
  live in copy modules beside `operatorCopy.ts`, which import no fixture,
  so the app and the mockups read the same words. Reason: the operator
  section already shares its words this way. This call is from
  Milestone 6.
- The app access row of a user page says "Email not sent" when the
  retries ended, and "No email sent" for a person with no verified email.
  The age on GitHub reads "Under a day", then days, weeks, months, and
  years. Reason: the mockups drew only two email states and one age. This
  call is from Milestone 6.
- The operator section reads the pause when each page opens. On a tab
  other than Invite codes, a failed read of the pause shows no notice.
  Reason: the notice is a help, and the Invite codes tab owns the pause.
  This call is from Milestone 6.
- On the page of the operator's own account, the Suspend question
  disables the referral code before the suspension. Reason: the
  suspension ends the session of the operator. This call is from
  Milestone 6.
- The list of the people who used a referral code shows the name, the
  login, and the initials of each person, as the mockup draws them. The
  Worker reply adds the name. Reason: the mockup is the visual spec, and
  the operator section may show names. This call is from the check of
  Milestone 6, which offered to drop the names from the mockup instead.
- The dev fake of `npm run dev` keeps one pause and one set of codes for
  the operator section and the waitlist screen, as the Worker does. Each
  page load still starts again from its query options, and `?paused=1`
  sets the pause for both sides. Reason: an operator never waits, so the
  two screens are always different loads, and stored state in a dev tool
  costs more than it gives. This call is from the integration of
  Milestones 5 and 6, which offered a `?keep=1` option instead.
- The Mac app learns of app access from its existing read of the
  session, which it repeats with its existing backoff, from 1 second up to
  30 seconds, while the user waits. The device socket opens only with app
  access. Reason: it needs no new contract, no cookie change, and no
  bridge into the page. This call is from Milestone 7.
- The Mac app keeps the code of a join link only in its own sign-in state,
  and loads the join address after the handoff, so that the web app uses
  the code or shows its reason. Reason: the handoff carries only its own
  code. This call is from Milestone 7.
- The test harness gives app access to the users that its helpers make,
  and a test of a person who waits opts out. Reason: the tests of other
  areas then keep their meaning after the gate. This call is from
  Milestone 7.
- The scheduled handler retries the approval emails after its other
  repairs, and a failed retry only warns. Reason: a slow or failed email
  must not hold back the cleanup of deleted orgs or the alarm repairs.
  This call is from the check of Milestone 4.
- The gate turns on in the last backend milestone, after the ways in and
  the screens exist. Until then, a new account gets app access at once, as
  now. Reason: each milestone then leaves an app that works.

The agent's calls after the options check, on 9 November 2026:

- Each operator has app access. Each sign-in gives app access, with the
  source "operator", to a user whose GitHub ID is in
  `OPERATOR_GITHUB_IDS`. Reason: an operator must reach the waitlist, also
  on a fresh local database. This is the rule of option G of decision 161.
- One D1 batch uses a code. It takes a use only while the code is enabled,
  has uses left, and the pause is off, and while the user has no app
  access. The same batch runs the grant. A unique key on the user in the
  table of uses backs the rule. Reason: a double submit, or a code use at
  the moment of an org invitation, must not take two uses.
- When app access arrives, the Mac app connects its device socket again,
  with no new launch. Reason: after a refusal, the Mac app connects again
  only after a cookie change, a wake, or a new launch.
- The Suspend dialog of a user also offers to disable the referral code
  of that user. Reason: the code of an abuser must not keep letting people
  in. An automatic disable would be a new rejection, which needs the user.
- A waiting account stays until a deletion on request, as other accounts
  do. Reason: this adds no new behaviour. A time limit or option F of
  decision 161 can come later.

The agent's calls from the mockups of Milestone 1, on 9 November 2026:

- The waitlist screen names the email address that gets the approval
  email. An account with no verified email gets no promise of an email.
  Its screen says that the app opens there once the account is approved.
  Reason: the approval email goes only to a verified email.
- The approval email has no mockup. Its words: the subject "Your
  Conductive account is ready", and the body "You can now use Conductive.
  Sign in with GitHub to get started:", then the address of the app. The
  product name comes from the brand module. Reason: an email is not a
  screen, and the invitation email also lives only in the code.
- The approval email comes from the same sender as the org invitations,
  on the domain `mail.conductive.build`. Reason: Resend already verifies
  that domain, so the deployment needs no new setup. This call is from
  the merge of `main` on 9 November 2026, which moved the invitation
  sender to that domain.
- The waitlist screen reads the app access again when the person comes
  back to the tab or the window, and after Use code. It sets no timer.
  Reason: a person usually comes back from the approval email.
- The Sign up flow ends at the waitlist. A new flow, "Join with an invite
  link", goes from the join link through Get started. Reason: the Get
  started mockups draw Cal, who is an operator and never waits.
- The waitlist in the Mac app is the same screen, in the Mac window with
  the window buttons in its top bar. Reason: the Mac app shows the screens
  of the web app.
- The sign-in line "If you are new, this also creates your account" stays.
  Reason: a new sign-in still creates the account, which then waits.
- The invite code section sits at the end of the General tab of the
  Account page. Reason: on a phone, the forms that connect Claude and
  Codex then stay near the top, and the code is not a preference. The
  merge of `main` on 9 November 2026 split the Account page into General
  and Preferences.
- The retries of an approval email stop after 24 hours. The page of the
  user then shows that the email was not sent, with the reason. A person
  with no verified email gets no email, and the page says so. Reason:
  Resend keeps an idempotency key for 24 hours, so a later retry could
  send a second copy. The person still has app access, and sees it at
  the next visit.
- A disabled referral code stays disabled, and the user gets no new code.
  Reason: an operator can give a good user an invite code instead.
- Resume sign-ups acts at once, with no question. Reason: it brings back
  the usual state.
- A person who waits can be suspended, as any user. The Waitlist tab
  leaves out suspended people, and the page of a suspended person shows
  Lift, not Approve. Reason: Suspend already covers every account.
- The search of the Invite codes tab also finds the label of an invite
  code and the login of the owner of a referral code. Reason: an operator
  remembers a code by its label more often than by its text.
- Each code on the Invite codes tab and on the page of a user can copy
  its join link, beside its code. Reason: a link is what people share.
- The page of a user also gives the age of the GitHub account. Reason:
  Approve on that page then has the same facts as the Waitlist tab.
- An account from before the waitlist shows "Joined before the waitlist",
  with its join day as the start of its app access. Reason: its access
  started when it joined.
- After an approval, the row stays in the Waitlist tab until the list
  reloads, with the state of its email. Reason: the operator sees the
  result in place.
- Pause sign-ups is a button in a Sign-ups box at the top of the Invite
  codes tab. While the pause is on, the notice on each tab holds Resume
  sign-ups. The count of the people who wait is a link under the Users
  tile of the Overview. Reason: these follow the parts that the section
  already has.

The agent's calls from the protocol docs of Milestone 2, on 9 November
2026:

- The Approve question says that an email goes out only when the person
  has a verified email. Otherwise it says that the person sees the app
  access at the next visit. Reason: a person with no verified email gets
  no email.
- Approve of a suspended person gets HTTP 409 with the code
  `user_suspended`, and changes nothing. The operator lifts first. Reason:
  the person cannot sign in, so an email that says the account is ready
  would mislead.
- The count of the people who wait leaves out suspended people, as the
  Waitlist tab does. Reason: the two numbers then agree.
- A code that does not work gets these replies: an unknown code HTTP 404
  `invite_code_not_found`, a disabled code 409 `invite_code_disabled`,
  and a used-up code 409 `invite_code_used_up`. During the pause, a code
  use and the Accept of an org invitation by a person who waits get 403
  `signups_paused`, and nothing is used up. A person with app access who
  uses a code gets 200 with no change. Reason: each reply names its
  reason, as the waitlist screen does, and the pause is a block of the
  operator, as `org_suspended` is.
- The record of app access from an org invitation holds the org and the
  admin who sent the invitation. Reason: an accepted invitation is
  deleted, and decision 163 traces each invited person to one admin and
  one org.
- The waitlist state of a user also gives the address of the approval
  email, or none. Reason: the waitlist screen names that address.
- A typed code works with or without its hyphen, in any case. A code in
  the address of the sign-in callback counts for nothing. Reason: people
  copy codes by hand, and only the signed sign-in state carries a code.
- An org invitation that the pause stopped stays pending. A user with app
  access still accepts invitations during the pause. Reason: the pause
  stops new people only.
- A suspension alone does not stop a referral code. The Suspend dialog
  offers to disable it. Reason: an automatic disable would be a new
  rejection.
- At `/operator`, a person who waits sees the waitlist screen, as at every
  other address. Reason: the waitlist screen replaces the whole app.
- The waitlist rules live in two linked pages, because one page passed
  the length target.
- A repeat approval, or the approval of a user who already has app
  access, gets HTTP 200, changes nothing, and sends no email. Reason: a
  repeat of a lift does the same.
- When a code fails for more than one reason, the reply gives the first
  of: unknown, disabled, used up, the pause. Reason: a mistyped code
  during the pause then says that the code is wrong, not that the person
  must wait.

The agent's calls from the review, on 9 November 2026:

- One operator list model owns confirmed row changes and the waiting
  count policy. Reason: an appended page must neither undo a confirmed
  approval or disable nor subtract an approval twice. The other list
  tabs retain their newest server totals.
- Show more also keeps the earlier total while an approval still runs.
  Reason: the page can answer with a total that already excludes the
  approved person before the approval reply arrives. The displayed count
  remains derived from the total and the approved rows still shown.

## Milestone 1: Mockups

Tags: mockup

Depends on: none

The waitlist screen, the join link, the referral code, the new words of
the marketing site, and the operator tabs, on desktop and on a phone.

- [x] Add `app/sign-in/waitlist`: the screen of a person who waits. It
      shows the GitHub account, a code field, the org invitations of the
      person, and Sign out.
  - [x] Add its states: a code that did not work, the pause, and an org
        invitation that lets the person in.
  - [x] Name the address of the approval email, and add the state of an
        account with no verified email.
- [x] Add `app/sign-in/join`: the sign-in page that a join link opens, and
      the waitlist screen when the code of the link did not work.
- [x] Add `mac-app/waitlist`: the waitlist screen in the Mac window, also
      in full screen.
- [x] Change the words "Start free with GitHub" on `marketing` to words
      that do not promise use at once, with its closing line.
- [x] Add the referral code to `app/account`: the code, the join link with
      Copy, and the uses left. Add its states: the pause, a code that is
      used up, and a disabled code.
- [x] Add `app/operator/waitlist`: the Waitlist tab, oldest first, with a
      search, Approve with its question, a failed approval email, and an
      empty waitlist.
- [x] Add `app/operator/codes`: the Invite codes tab with each code and
      its uses, New code with its dialog, Disable with its confirm, and a
      search that finds a referral code.
- [x] Add the pause to `app/operator/codes`: the switch with its confirm,
      and the notice on each tab while the pause is on.
- [x] Update `app/operator/users` and `app/operator/user`: the waiting
      state, Approve, how and when the user got app access, whether the
      approval email went, the referral code with Disable, and the offer
      to disable it in the Suspend dialog.
- [x] Update `app/operator`: the count of the people who wait.
- [x] Update the Sign up flow of `user-flows` for the waitlist, and add
      the flow "Join with an invite link".
- [x] Split each page that passes five screens, as the `mockups` skill
      says.
- [x] Update `docs/mockups/catalogue.md` and `docs/mockups/design.md`.
- [x] Run `npm run mockups:check`, `npm run lint`, `npm run format:check`,
      and `npm run file-length:check`. Smoke-test the changed pages in
      both schemes and both viewports.
- [x] Update the design and the TODOs of this plan for each problem that
      the mockups show.

Evidence: the logs `combined-mockups-check.log` and
`combined-source-checks.log`, and the screenshots in `shots-combined/`,
`shots-user/`, and `shots-operator/`, all in `.context/waitlist/m1/`.

## Milestone 1a: Mockup gaps from the protocol docs

Tags: mockup

Depends on: 1

Three gaps that the protocol docs of Milestone 2 found.

- [x] Add the Approve question for a person with no verified email, which
      promises no email.
- [x] Add the waitlist screen when the pause refuses Accept on an org
      invitation. Restructure `app/sign-in/waitlist` into child folders
      that keep their paths, because it already shows five screens.
- [x] Name the org and the admin who sent the invitation in the app access
      row of an org invitation, on the page of a user.
- [x] Update `docs/mockups/catalogue.md` and
      `docs/mockups/orgs-and-logins.md`.
- [x] Run the mockup checks, the export check, and the type check, and
      smoke-test the changed pages in both schemes and both viewports.

Evidence: the logs and the screenshots in `.context/waitlist/m1a/`.

## Milestone 2: Documentation and protocol

Depends on: 1

- [x] Add `docs/protocol/waitlist.md`. It states who waits and what a
      person who waits can reach. It states the ways in, the operators,
      the invite codes, the referral codes, the join link, the pause, the
      approval email with its retry, the record of app access, and the
      accounts that already exist. Each rule names its decision: 160, 161,
      162, or 163.
- [x] Change the sign-up rule of
      [Sign-in](../docs/protocol/access-and-security.md#sign-in) to a link
      to the waitlist doc.
- [x] In `docs/protocol/orgs-and-members.md`, replace the rule that
      rejected an invite-only sign-up. Say that Get started opens after
      app access, and that an accepted org invitation gives app access,
      with a link to the waitlist doc.
- [x] Add to `docs/protocol/operator-section.md`: the Waitlist and Invite
      codes tabs, the pause, the app access and the referral code on the
      page of a user, the state of the approval email, the offer in the
      Suspend dialog, and the count of the people who wait. Change its
      rule that the section changes no setting of the app.
- [x] Add to `docs/architecture.md`: the terms App access, Waitlist,
      Invite code, and Referral code, the new records of D1, and the
      waitlist doc in its list of protocol docs.
- [x] Add the waitlist to the features and the docs list of `README.md`.
      Add the approval email to the `RESEND_API_KEY` row of
      `docs/deployment.md`.
- [x] Change the words of the marketing button in the marketing site part
      of `docs/architecture.md`.
- [x] Fix the lines that the waitlist makes stale: the palette in
      `docs/protocol/command-palette.md`, the refusal code in "The
      operator" of `docs/protocol/operator-actions.md`, the device in
      `docs/protocol/desktop-app.md`, and the gate and the operator reads
      in `docs/protocol/access-and-security.md`.

Evidence: the link checks and the check logs in `.context/waitlist/m2/`.

## Milestone 3: App access and codes in the Worker

Depends on: 2

The record of app access, the codes, and every way in except the
approval. A new account still gets app access at once, until Milestone 7.

- [x] Add a migration:
  - [x] the app access record of each user: the time, the source, and the
        operator, the code, or the org invitation of the source
  - [x] the invite codes and the referral codes: the code, the kind, the
        label, the use limit, the owner, the maker, and the time of a
        disable
  - [x] each use of a code: the code, the user, and the time, with a
        unique key on the user
  - [x] the pause: on or off, with the time and the operator of the last
        change
  - [x] the primary verified email and the creation date of the GitHub
        account of each user
  - [x] app access with the source "existing account", and a referral
        code, for each user who exists
- [x] Save the primary verified email and the creation date of the GitHub
      account at each sign-in.
- [x] Add one grant step. It gives app access, records the source, and
      makes the referral code, in one D1 batch. A repeat changes nothing.
- [x] Give app access to each operator at each sign-in.
- [x] Add the waitlist routes: read the app access state, the pause, the
      address of the approval email, and the referral code of the
      signed-in user, and use a code. One D1 batch checks the code, the
      pause, and the user, takes the use, and runs the grant. Reply with
      the codes of the design.
- [x] Carry the code of a join link through the Terms page and the signed
      sign-in state. The sign-in uses it for an account without app
      access.
- [x] Give app access to a person without app access who accepts an org
      invitation, in the same batch as the membership. Invitations have no
      count, as decision 163 chose. The record holds the org and the admin
      who sent the invitation.
- [x] Apply the pause to codes and org invitations. A code is not used up
      while the pause is on.
- [x] Add the app access state to the session reply.
- [x] Test with local D1: each way in, an operator, each reason that a
      code does not work, the use limit under two parallel uses, a double
      submit, a code use at the moment of an org invitation, the pause, a
      repeat grant, the migration of existing users, and the join link
      through the sign-in.
- [x] Update `worker/security/README.md`, `worker/members/README.md`,
      `worker/README.md`, and the path helpers and types in `src/shared/`.

Evidence: `.context/waitlist/m3/report.md`, the logs in `.context/waitlist/m3/`,
and the complete gate in `.context/waitlist/m3/gate.log`.

## Milestone 4: Operator routes and the approval email in the Worker

Depends on: 3

- [x] Add a migration for the state of each approval email.
- [x] Add `GET /api/operator/waitlist` with a search, oldest first, 20 at
      a time. Each row says whether the person has a verified email, with
      no address, so that the Approve question can choose its words.
- [x] Add the approval of a person who waits. It uses the grant step of
      Milestone 3, also during the pause. It saves the email as pending in
      the same batch, and sends it at once. It refuses a suspended person
      with 409 `user_suspended`.
- [x] Send each pending approval email again from the 15-minute Cron
      Trigger, with the same idempotency key, until Resend accepts it or
      24 hours pass.
- [x] Add the routes of the invite codes: list with a search, make, and
      disable. A disable also works for a referral code.
- [x] Add the routes of the pause: read, turn on, and turn off.
- [x] Add the app access state, its source, the state of the approval
      email, whether the user has a verified email, and the referral code
      to the user detail and the user list.
      Add the count of the people who wait to the overview, without
      suspended people.
- [x] Send the approval email through one mail sender that the invitation
      email shares.
- [x] Test with local D1: each route, 403 `operator_required` for another
      user, an approval during the pause, a repeat approval, a failed
      email and its retry, the end of the retries, the search of a
      referral code, and the overview counts.
- [x] Update `worker/operator/README.md`, `worker/README.md`, and the path
      helpers and types in `src/shared/operator.ts`.

Evidence: `.context/waitlist/m4/report.md`, `.context/waitlist/m4/fix-1/report.md`,
and the complete gate in `.context/waitlist/m4/gate.log`.

## Milestone 5: The waitlist and the referral code in the web app

Tags: ui

Depends on: 1, 1a, 3

- [x] Add the waitlist screen, in the browser and in the Mac app, with its
      states from the mockups.
- [x] Open the waitlist screen when the session reply says that the user
      waits. Open Get started only after app access. Read the app access
      again when the person comes back to the tab or the window, and after
      Use code.
- [x] Add the join link. It keeps the code through the sign-in, and it
      uses the code for a signed-in person who waits.
- [x] Add the referral code to the Account page, with Copy and its states.
- [x] Change the words of the marketing button and its closing line in
      the Astro marketing site under `src/marketing/`, and in its test
      `worker/marketing/built-site.test.ts`.
- [x] Update the Privacy draft in `src/marketing/privacy.ts`, as the
      design says. Update the Terms draft when it promises an open
      sign-up.
- [x] Add dev fake options for a person who waits and for the pause.
- [x] Test the screens, the join link, and the referral code.
- [x] Update `src/app/README.md` and `src/marketing/README.md`.

Evidence: the report, the logs, and the screenshots in `.context/waitlist/m5/`,
and the complete gate of the merged tree in `.context/waitlist/m5/gate-merged.log`.

## Milestone 6: The operator tabs in the web app

Tags: ui

Depends on: 1, 1a, 4. The operator section screens are on `main` since
pull request #89.

- [x] Add the Waitlist tab with its search, and Approve with its question.
- [x] Add the Invite codes tab with New code, Disable, the search, and the
      pause.
- [x] Add the notice of the pause to each tab of the section.
- [x] Add to the Users tab and the page of a user: the waiting state,
      Approve, the app access, the state of the approval email, the
      referral code with Disable, and the offer in the Suspend dialog.
- [x] Add the count of the people who wait to the Overview.
- [x] Test the tabs, the dialogs, and the pause.
- [x] Update the README of the operator screens and `src/app/README.md`.

Evidence: the logs, the mutation report, and the screenshots in
`.context/waitlist/m6/`.

## Milestone 7: The waitlist gate in the Worker

Depends on: 5, 6

- [x] Make a new account start without app access in the GitHub sign-in.
      An operator, or a code of a join link, still gives app access in the
      same sign-in.
- [x] Add the app access check to the gate. It reads the method and the
      path that the browser sent. A session without app access reaches
      only the requests of the design. Every other request and WebSocket
      upgrade gets 403 `access_required`.
- [x] Make the Mac app connect its device socket again when app access
      arrives.
- [x] Pass the code of a join link through the sign-in of the Mac app, and
      load the join address after it, so that the window uses the code or
      shows its reason. Say in `desktop/README.md` that the waitlist page
      has no controls strip.
- [x] Test with local D1: a new account waits, an existing account keeps
      app access, a new operator account gets app access, each allowed
      request, a refused request of each kind with an org read and an org
      write among them, the sign-in exchange and the device socket of the
      Mac app, and a suspended user who stays refused.
- [x] Update `worker/security/README.md`, `worker/README.md`, and the
      README of the Mac app when its code changes.

Evidence: `.context/waitlist/m7/report.md` and its logs, and the complete
gate in `.context/waitlist/m7-check/gate.log`.

## Milestone 8: Verification, commit, review, and pull request

Depends on: every other milestone

- [x] Merge `main` into this branch after the operator section merges.
      `main` adds a fifth Account screen, `share-not-saved`, and a
      `shareChange` prop. Move that screen into its own folder under
      `app/account`, as this branch did for the other Account states, and
      give each Account entry the prop. The merge decisions are in
      `.context/waitlist/merge-justifications.md`.
- [x] Merge the latest `main` again before the review and the pull
      request.
- [x] Smoke-test in `npm run dev`: a person who waits, a code, a join
      link, an org invitation, the referral code, the pause, and the
      operator tabs.
- [x] Run the targeted tests and the complete gate named in `AGENTS.md`.
- [x] Commit with Conventional Commits and push the branch.
- [x] Review the complete local diff against `origin/main` with the
      `implementation-review` skill after the push. Report the findings,
      then apply the fix rule: fix the `fix now` findings, record
      follow-up items under `plans/follow-ups/` for the rest, re-review
      once, and report.
  - [x] Apply the shared directory fix for confirmed findings 2 and 3:
        one owner for confirmed rows, read ordering, and the waiting count.
  - [x] Record the deferred approval-email origin and account-age fixes
        as follow-up items.
  - [x] Re-review the combined result, including Mac invite-link origins.
  - [x] Record the checked Mac link-origin and search-change count
        defects as follow-ups. Record the unconfirmed approval-feedback
        observation as a separate post-merge check.
- [ ] Delete this plan when the `plans` skill says, under "Deleting the
      plan".
- [ ] Open the pull request. Its description gives the decisions and the
      design calls of this plan with their dates, a permalink to this plan,
      and the follow-up items that the change adds.

Evidence: `.context/waitlist/m8/gate-final.log`,
`.context/waitlist/m8/smoke-final.log`,
`.context/waitlist/m8/ui-fix/report.md`,
`.context/waitlist/m8/links.json`, and
`.context/waitlist/m8/combined-test-cost.md`.

## Post-merge follow-up (non-blocking)

- [ ] On the deployed app, sign in with a new GitHub account, and check
      the waitlist screen. Approve the account from the operator section,
      and check the email. Use an invite code and a referral code. Turn
      the pause on, check that a code waits, and turn the pause off.
