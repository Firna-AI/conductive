# Operator section

Status: Active. On branch `calummoore/admin-section-brainstorm`, no pull request yet. The pull request that completes the work deletes this plan, as the `plans` skill says.

The operator runs Conductive for everyone, as the
[architecture doc](../docs/architecture.md#terms) says. Today the operator
has no screen. The only operator actions are the two suspension routes,
which the operator sends with `curl` and a copied session cookie. App-wide
numbers, such as the number of workspaces, need SQL against D1.

This change adds an operator page to the web app at `/operator`, for the
people in `OPERATOR_GITHUB_IDS`. The first version holds the layout of the
section and live numbers from D1: users, orgs, workspaces, the workspaces
in each state, the running cloud computers, new workspaces and new users
each day, and the largest orgs. The section also has Orgs and Users tabs,
with a search and a page for each org and each user, where the operator
suspends it or lifts its suspension, as decisions 145 and 147 chose. It
does not cover editable settings, trends over time, or costs. The brainstorm notes and sources are in
`.context/admin-section/brainstorm.md`. The options check of the decisions
is in `.context/operator-section/options-check.md`.

The decision numbers continue the numbers of
`plans/boat-native-remote-workspaces.md`, so that a doc can cite them
without a clash. The brainstorm asked them as items 1 to 4.

Contract owners:

- [Operator actions](../docs/protocol/operator-actions.md). Milestone 2
  adds the operator page to it.
- [Access and security](../docs/protocol/access-and-security.md#orgs-and-workspaces).
  Milestone 2 adds the operator exception to it.
- The [operator area README](../worker/operator/README.md).
- The [mockup catalogue](../docs/mockups/catalogue.md).

## Decisions

### 142. Choose where the operator section lives

- **Severity:** Medium. **Effort:** Large.
- **Source:** Design.
- **Category:** Docs or spec.
- **Location:** `worker/operator/route.ts` and `src/app/router.ts`, where a section attaches.
- **Background:** The operator routes live under `/api/operator/`, behind the sign-in gate of the app hostname and the operator check. They only write. The web app has no operator screen, and it does not know who is an operator. Every other request reaches only the orgs of the signed-in user.
- **Problem:** The operator cannot see app-wide numbers or change app-wide settings without a terminal or the Cloudflare dashboard.
- **Impact if no action:** Each check needs SQL. One bad JSON edit of the model list stops the app from loading for everyone.
- **Root question:** How does the operator see the state of the whole app and change its app-wide settings in one place?
- **Options:**
  - **A.** No screen. Add an `npm run operator` script with saved D1 queries and the two suspend calls. It needs a terminal, a Cloudflare login, and a copied cookie. Effort: Small.
  - **B.** Add read routes for the operator, and build the screens in a hosted internal-tool builder, such as Retool. It needs a new long-lived API credential. A third party then sees user data, so the Privacy page must name it. Effort: Medium.
  - **C.** Add an "Operator" section to the web app, at `/operator`. It reuses the sign-in, the gate, the operator check, and the UI parts. It needs mockups, a protocol section, routes, and screens. Effort: Large.
  - **D.** As C, but on its own hostname, such as `ops.conductive.build`, behind Cloudflare Access and the operator check. It adds a hostname, a gate, and a second sign-in, and only the user can set up Access. Effort: Large.
  - **E.** Added by the options check: C, plus a fresh sign-in for operator power. The page and the operator routes need a GitHub sign-in from, for example, the last hour, so a stolen session cookie alone gives no operator power. It costs one more GitHub round trip, and the `sessions` table stores no sign-in time, only `expires_at`. Effort: Medium.
- **Left out:** Stats for org admins in the org settings, because they serve org admins, not the operator. Only a daily email digest or alerts, because they give no control of settings. A screen in the Mac app only, because the Mac app shows the web app. A separate Worker for the operator tools, because D already keeps operator requests on their own hostname.
- **Wider fix:** None, because this is a new feature, not a class of defect.
- **Previous examples:** Decision 22, option B, and decision 23, option C, of `plans/boat-native-remote-workspaces.md` proposed an admin page. The user chose neither. Its Milestones 15m and 15o built the suspend routes with no screen.
- **Related:** Decisions 143, 144, 145, and 146 depend on this answer.
- **Recommendation:** C. It reuses the sign-in, the gate, and the UI parts, so it needs no new infrastructure. The options check keeps C, because the first version only reads counts. E fits the first write action on the page. D protects the codebase best, because operator power then has its own hostname and its own sign-in.
- **Action:** asked the user, because the options trade effort against isolation, and no requirement covers app-wide reads.
- **Chosen:** C, by the user on 8 November 2026: "1 = C".

### 143. Choose which settings the operator can change

- **Severity:** Medium. **Effort:** Medium.
- **Source:** Design.
- **Category:** Docs or spec.
- **Location:** `CONDUCTIVE_MODELS` and `CONDUCTIVE_DEFAULT_CHOICE`, in the "Models" section of `docs/deployment.md`, and `AppModel.start` in `src/app/app-model.ts`.
- **Background:** The model list and the default model are JSON text in Worker variables. The web app waits for the model list when it starts, so an invalid value stops the app from loading. The app has no switch that closes sign-up or pauses new cloud computers.
- **Problem:** Each settings change needs a deploy or a dashboard edit, and one bad value stops the app. The app also has no brake for the whole app.
- **Impact if no action:** Each new model release needs a JSON edit by hand. During an abuse wave or a cost spike, the operator can only suspend one user or one org at a time.
- **Root question:** How does the operator change app-wide behaviour, such as the model list, quickly and without the risk that one bad value stops the app? The options check wrote this question, because the first one named the deploy and hid the outage.
- **Options:**
  - **A.** None. The settings stay in Worker variables. Effort: Small.
  - **B.** Move the model list and the default model into D1, with an editor in the section. Each save checks the value. Each change records who made it and when. Effort: Medium.
  - **C.** B, plus two switches for the whole app: "Pause sign-up" and "Pause new starts". Each switch is a new rejection. Effort: Medium.
  - **D.** C, plus limits for each user or org, such as running computers at once and starts each day. This changes decision 81 of `plans/boat-native-remote-workspaces.md`, free with no limits. Effort: Large.
  - **E.** Added by the options check: A, plus a bad model value fails safely. The app starts without a valid model list or default choice. Only the model picker and the composer show the error, and the Worker logs a warning. It changes the boot, the account reply, the model picker, and the deployment doc. Effort: Medium.
  - **F.** Added by the options check: keep the model list and the default choice in the `vars` of `wrangler.jsonc`, and check them in the build. Each model change needs a commit and a deploy, an edit in the dashboard skips the check, and the build error needs the user's approval. Effort: Small.
  - **G.** Added by the options check: A, plus two brake variables in the Worker settings, such as "pause sign-up" and "pause new starts". A dashboard edit turns a brake on in seconds, with no table and no page. Each brake is a new rejection. Effort: Medium.
- **Left out:** Editable secrets, the runner archive, the frame sources, and the operator list. A stolen operator session could then change the code of every new computer, the page security policy, or who is an operator. A brake at Boat, such as a lower plan limit or a revoked key, because it breaks the running work of every user.
- **Wider fix:** E, added by the options check. A reader that survives a bad value protects every way of editing it, also a later editor in the section.
- **Previous examples:** Decision 22 chose open sign-up. Decision 23 chose limits for each user, and decision 45 removed them. Decision 81 kept the app free with no limits.
- **Related:** Decision 142. Under its option A, only option A applies here.
- **Recommendation:** E, after the options check. The first recommendation was C. E removes the outage of one bad value, adds no rejection and no table, and fits A for now. The brake for the whole app is a second question for a later change.
- **Action:** asked the user, because the two switches add new rejections, and B changes where the model list lives.
- **Chosen:** A for now, by the user on 8 November 2026: "for now, lets just do the layout and some stats?". B, C, D, or G can come in a later change. The follow-up item `plans/follow-ups/bad-model-list-stops-app.md` holds E, which the user has not seen yet.

### 144. Choose which numbers the operator sees

- **Severity:** Medium. **Effort:** Small.
- **Source:** Design.
- **Category:** Docs or spec.
- **Location:** None.
- **Background:** D1 holds each user, org, member, workspace, and build, with their creation dates and states. So D1 can count the users, the orgs, the workspaces in each state, and the computers that run now. The creation dates give the sign-ups and the new workspaces of each day. D1 has no history of running computers and no costs. Each chat lives in the Durable Object of its workspace, so D1 has no count of turns. Boat reports active sandboxes, starts left today, and the cost of each sandbox, through routes that the app does not call.
- **Problem:** Nothing shows these numbers today.
- **Impact if no action:** The operator cannot see the use and the load of the app without SQL.
- **Root question:** Which app-wide numbers does the operator see, and over what time?
- **Options:**
  - **A.** Live counts from D1 at each page load. They are users, new users in the last 7 and 30 days, orgs, workspaces by state, running computers, builds, and the largest orgs. Added by the options check: the counts read only the rows that exist now, so a past day loses the workspaces that an org purge or a failed first start deletes. Effort: Small.
  - **B.** A, plus a snapshot that the existing Cron Trigger writes to a new D1 table, for trends such as running computers through the day. The history starts on the day it ships. Effort: Medium.
  - **C.** A, plus events in Workers Analytics Engine: sign-ins, starts, stops, and turns, by user and by org, kept for 3 months. It needs a new binding, and a new secret, because the Worker reads the events through Cloudflare's SQL API with an API token. Effort: Medium.
  - **D.** A, plus Boat's own numbers: active sandboxes against the plan limit, starts left today, and the cost this month. It adds `GET /limits` and `GET /sandboxes?include=cost` to the fixed list of Boat routes, and the key may need new actions. While the app shares the "Firna" Boat organization, these numbers include other work. Effort: Medium.
  - **E.** Added by the options check: A, plus daily counters in a new D1 table. The Worker adds one to the count of the day at each sign-in, start, and turn, for the whole app and for each org. It needs a migration and a D1 write for each counted event, also on the turn path. The history starts on the day it ships. Effort: Medium.
  - **F.** Added by the options check: A, plus events that the Worker sends to a hosted product analytics service, such as PostHog. A new third party gets user data, so the Privacy page must name it, and it needs a new secret. Effort: Medium.
- **Left out:** Analytics in the browser, because the content security policy lets network calls reach only the app's own origins. Cloudflare's Worker metrics, because they count requests and errors, not users or workspaces.
- **Wider fix:** None, because this is a new feature, not a class of defect.
- **Previous examples:** `plans/follow-ups/computer-ledger.md` proposes one record of every computer, which would make the running count exact. `plans/follow-ups/separate-boat-organization.md` moves the app to its own Boat organization.
- **Related:** Decision 142.
- **Recommendation:** A. It shows the numbers that the user named, with no migration and no new Boat route. The options check keeps A.
- **Action:** asked the user, because the best option depends on whether the user needs trends or costs.
- **Chosen:** A for now, read from the user's answer on 8 November 2026: "for now, lets just do the layout and some stats?". Every other option adds history or costs on top of A.

### 145. Choose how the operator recovers from a wrong suspension

- **Severity:** Medium. **Effort:** Medium.
- **Source:** Design.
- **Category:** Docs or spec.
- **Location:** `worker/operator/README.md`, which says "No route lifts a suspension", and `reconcileLifecycleAccess` in the workspace Durable Object.
- **Terms:**
  - **Disk restart:** a short start of a stopped cloud computer near day 14 of its stop, so that Boat keeps its disk.
  - **Owner-change check:** `reconcileLifecycleAccess`, which stops a workspace, or sets its disk restart again when neither its owner nor its org is suspended.
- **Background:** A suspension stops the computers of the user or the org, and cancels the disk restart of each stopped workspace. No route lifts a suspension. A manual SQL edit can clear the suspension, but the disk restart does not come back. A workspace that was already stopped keeps its old stop time, so its day 14 can be only days after the suspension.
- **Problem:** A suspend button on the page makes a wrong suspension easier, and nothing can undo one or keep its disks.
- **Impact if no action:** A wrong suspension stays. After a SQL fix, a stopped workspace that nobody resumes before day 14 of its stop loses its disk, with any unpushed work.
- **Root question:** How does the operator recover from a wrong suspension, so that the user or the org gets access back and loses no work? The options check wrote this question, because the first one named one mechanism, an undo action, and hid the lost disk.
- **Options:**
  - **A.** No undo, as now. Effort: Small.
  - **B.** A "Lift" action for a user and for an org on the page, with a confirm step. It clears the suspension, records who lifted it and when, and brings back the disk restart. It needs a way to find the target, a mockup, and a migration for the lift record. Effort: Large, after the options check. The first grade was Medium.
  - **C.** B, plus a log in the section of each operator action: suspend, lift, and each settings change. Effort: Large.
  - **D.** Added by the options check: a lift route with no screen, next to the two suspend routes, such as `DELETE` on each suspension path. It has the same gate and operator check, clears the suspension, and runs the owner-change check of each affected workspace. One append-only table records each suspension and each lift, so a later log needs only a screen. A lift of a large org can start many overdue disk restarts at once, and an open page of a member keeps its suspended mark until a reload. Effort: Medium.
  - **E.** Added by the options check: the existing 15-minute Cron Trigger brings back overdue disk restarts. It finds each stopped workspace whose restart is overdue while neither its owner nor its org is suspended, and runs its owner-change check. So any end of a suspension brings the restart back within 15 minutes, also a SQL edit, and it repairs a lost alarm. It works with B, C, or D. Effort: Medium.
  - **F.** Added by the options check: keep the disk restart during an org suspension. A lift then finds every disk, also after day 14. Each stopped computer of a suspended org starts briefly every 13 days, so code that an abuse report named can run again. It changes the "Suspend an org" rule of the operator protocol. Effort: Medium.
- **Left out:** A suspension that ends on its own after a set time, because a wrong suspension stays until then and an abuse suspension must not end on its own. A confirm step before a suspension alone, because it undoes nothing. It belongs with the later suspend action. A saved snapshot of each suspended disk, because the user chose against it in decision 125 of `plans/boat-native-remote-workspaces.md`. A lift by the suspended user or an org admin, because the target could then end its own suspension.
- **Wider fix:** E, added by the options check. It brings the restart back however the suspension ends. A lift that runs the owner-change check is a direct fix.
- **Previous examples:** `worker/operator/README.md` says that no route lifts a user suspension or an org suspension. `plans/follow-ups/chat-open-edits-after-read-only.md` notes the same.
- **Related:** Decision 142. `plans/follow-ups/org-disk-restart-has-no-decision.md` shares option F: the org rule of the disk restart cites decision 125, which decided only the owner case.
- **Recommendation:** D, after the options check. The first recommendation was B. D gives the same undo for less effort, and it also covers the `curl` suspensions of today. B's screen can come with the later suspend actions. E protects the codebase best.
- **Action:** asked the user, because a lift is new behaviour that no requirement covers.
- **Chosen:** B, by the user on 8 November 2026: "145 = B". The options check had recommended D. Decision 147 moves the Lift action to the page of each user and org. Milestones 1a, 1b, 5, and 6 build it.

### 146. Choose what other people see at the operator address

- **Severity:** Low. **Effort:** Small.
- **Source:** Design. The options check moved it from a design call.
- **Category:** Docs or spec.
- **Location:** `src/app/router.ts`.
- **Background:** The web app shows its not-found page for an address that it does not know. The operator routes of the Worker answer 403 `operator_required` to everyone who is not an operator. The code of the operator page ships to every user.
- **Problem:** No requirement says what `/operator` shows to a signed-in person who is not an operator.
- **Impact if no action:** Such a person could see a broken page or a raw error.
- **Root question:** What does a person who is not an operator see at the address of the operator page?
- **Options:**
  - **A.** The not-found page of the app, as for any unknown address. The page stays out of sight in the app, but the API answer and the app code still show that it exists. Effort: Small.
  - **B.** A short page that says the page is for operators, with a link back to the workspaces. It tells every user that an operator page exists. Effort: Small.
  - **C.** A move to the home page, with no message. The person does not learn why. Effort: Small.
- **Left out:** Serving the page code only to operators, because the page holds no secret and the API answer already names the section.
- **Wider fix:** None, because this is a new feature, not a class of defect.
- **Previous examples:** None found.
- **Related:** Decision 142.
- **Recommendation:** A. It adds no screen, and it treats the address like any other address that the person cannot open.
- **Action:** asked the user, because this adds behaviour at a boundary that no requirement covers.
- **Chosen:** A, by the user on 8 November 2026: "146 = A".

### 147. Search orgs and users, and suspend or lift from their pages

Added on 8 November 2026 from the user's message.

- **Chosen by the user on 8 November 2026:** "admin should be able to
  search orgs and see an org detail page to suspend or unspend an org -
  same with users". "Admin" here means the operator.
- **Effects:**
  - The operator section gets the tabs Overview, Orgs, and Users.
  - Orgs and Users each have a search and a page for each org or user.
  - Each page has Suspend, or Lift for a target that is suspended, each
    with a confirm step. Lift stays as decision 145 B chose, on that page.
  - It replaces the design call that kept Suspend a `curl` call, and the
    call of one page with no tabs.
  - Milestone 1b draws the screens. Milestones 2, 4, and 6 add the
    requirements, the routes, and the screens.
- **Options check:** skipped, because this records a direct request of the
  user, with no options to check.

### 148. Remove the Suspended box from the overview

Added on 8 November 2026 from the user's message.

- **Chosen by the user on 8 November 2026:** "nice - we can remove
  suspended list from the overview", with a screenshot of the Suspended
  box.
- **Effects:**
  - The overview lists no suspensions. The Orgs and Users tabs find a
    suspended org or user, and its page shows the suspension and Lift.
  - `GET /api/operator/overview` returns no suspensions.
  - Milestone 1c removes the box from the mockups.
- **Options check:** skipped, because this records a direct request of the
  user, with no options to check.

### 149. Show the names on the org and user pages

Added on 8 November 2026 from the user's message.

- **Chosen by the user on 8 November 2026:** "also org and user detail
  pages should include the names". The agent reads "names" as the names
  that people give on GitHub.
- **Effects:**
  - Each member on the page of an org shows their name under their login.
  - The page of a user shows the name in a Name row of its Details.
  - An account with no name on GitHub shows no name.
  - Milestone 1c draws it. Milestones 4 and 6 return and show the names.
- **Options check:** skipped, because this records a direct request of the
  user, with no options to check.

## Design

The agent's calls, on 8 November 2026:

- The section is named "Operator" in the address and the code, because
  "admin" already names a role in each org.
- `OPERATOR_GITHUB_IDS` stays the only list of operators, so that a stolen
  operator session cannot add operators.
- The page shows counts and metadata only: no chat, files, env values, or
  agent logins. The largest orgs show their names and counts only.
- An operator opens the page from the rail, above the account, and on a
  phone from the org switcher, below Account. Other people see no change.
- The section has the tabs Overview, Orgs, and Users under its header, as
  the org settings have, since decision 147. Settings can be a later tab.
- The page reads the numbers once when it opens. Refresh reads them again.
  No cache and no history, as decision 144 chose.
- The workspaces by state are Running, Stopped, Failed, and Archived. They
  add up to the workspace total. Running holds the states starting, ready,
  working, unread, and input.
- The 7-day numbers count the last 7 times 24 hours. The charts count 30
  days in UTC, so that the server needs no time zone of the operator.
- The counts read only the rows that exist now, as decision 144 A says. A
  past day can go down after an org purge or a failed first start.

The agent's calls from the mockups of Milestone 1 and the options check,
on 8 November 2026:

- "Running now" counts the cloud computers that run now: those of the
  running workspaces and those of the unfinished builds. A line under the
  workspaces by state names the builds, so that the two numbers agree.
- New users in the last 30 days show as a second chart, with the total of
  the 30 days above it. The chart of new workspaces does the same.
- Each chart is a line with an area over a time axis, because the labels
  of 30 daily columns did not fit. The axis shows about five dates, and
  the table toggle lists every day.
- Each day of a chart sits at noon UTC, so that its local date is the UTC
  day in each time zone from UTC-11 to UTC+11.
- The largest orgs are the five orgs with the most workspaces, archived
  ones included. A tie goes by org name. Deleted orgs are left out.
- A phone leaves out the Members column of the largest orgs, so that each
  org name keeps one line.
- Refresh sits in the desktop header only. A phone reads the numbers each
  time the page opens.
- A failed read shows only the notice with Try again, and no numbers,
  because a count that did not load is not zero.
- The first load keeps the boxes and their titles in place, with
  placeholders, so that nothing moves when the numbers arrive.
- The workspaces by state use the glyphs of the workspace list: ready for
  Running, then stopped, error, and archived.
- One shared reader of `OPERATOR_GITHUB_IDS` serves the operator check of
  the routes and the operator flag of the account reply.

The agent's calls for the lift of decision 145 B, on 8 November 2026:

- The overview lists no suspensions, as decision 148 chose. The Orgs and
  Users tabs find a suspended org or user, and its page holds Lift.
- Lift asks first, in the confirm dialog of the app. The dialog says what
  comes back, and that a workspace that stopped 14 days ago or more may
  have lost its files.
- Suspend is on the pages of decision 147. Before that answer, it stayed a
  `curl` call.
- One append-only table records each suspension and each lift, with its
  time and its operator. The suspend routes write their rows too.
- A lift runs the owner-change check of each workspace that the user owns,
  or of each workspace of the org, so that each stopped workspace gets its
  disk restart again.
- A lift brings back no sign-in session, workspace token, preview, or
  failed build. The user signs in again, and each workspace gets a new
  token at its next start, as now.
- A lift of a deleted org leaves it deleted. An admin can then restore it
  while its 7 days last.
- An open page of a member learns of a lift at its next load, because the
  app keeps the suspended mark of an org until then, and lifts are rare.
- The overview reads its numbers in one read, `GET /api/operator/overview`,
  so that one loading state and one error state cover the page.
- The Suspended box of Milestone 1a is gone from the overview, as decision
  148 chose.
- A user shows on a disc and an org on a square, as in the rest of the
  app, and each row also names its kind.

The agent's calls for decision 147, on 8 November 2026:

- The org search finds an org by its name or its ID. It also finds the org
  of a cloud computer ID or of a preview address, because an abuse report
  names one of those, not an org.
- The user search finds a user by GitHub login, name, or numeric GitHub
  ID.
- With an empty search, each list shows the newest first, 20 at a time,
  with Show more.
- The lists and the pages show counts, names, roles, and states only. They
  show no email address, so that the section holds the least personal
  data.
- The page of an org shows its ID, its creation day, its repositories, its
  workspaces by state, and its members with their roles. Each member opens
  the page of that user.
- The page of a user shows the GitHub ID, the join day, the workspaces
  that the user owns, and the orgs of the user with the roles. Each org
  opens the page of that org.
- Suspend asks first, in the confirm dialog, with the danger tone. The
  dialog says what stops, what the members keep, and that the files of a
  stopped workspace can be deleted after day 14.
- Suspend of the operator's own account warns that the operator is then
  signed out, and that another operator must lift it. The page still
  allows it, because a warning is enough.
- After a suspend, the page shows the suspension, and the count of cloud
  computers that are still stopping, from the reply of the route.
- A deleted org can still be suspended from its page, as the operator
  protocol allows.
- The largest orgs of the overview open their org pages.
- From the mockups of Milestone 1b: in the tables of the Orgs and Users
  tabs, the state of a suspended or deleted target sits under its name,
  not in a column of its own, so that the columns stay apart.
- Suspend and Lift sit in the header of each page, and in its footer on a
  phone, as the actions of a page do.
- Each page of an org or a user keeps the tabs, with Orgs or Users
  selected, and adds a way back to its list.
- The org search also shows what matched when the match is not a name,
  such as a preview address.

## Milestone 1: Mockups

Tags: mockup

Depends on: none

The operator page and the places where an operator opens it, on desktop
and on a phone.

- [x] Add `app/operator`: the overview of an operator. Stat tiles for
      users, orgs, workspaces, and running now, then the workspaces by
      state with the running builds, the new workspaces and the new users
      of each day for 30 days, and the largest orgs.
- [x] Add `app/operator/menu`: Operator above the account in the rail, and
      Operator under Account in the org switcher of a phone.
- [x] Add `app/operator/error`: the numbers could not load, with Try
      again, and a `loading` variant for the first load.
- [x] Update `docs/mockups/catalogue.md` and `docs/mockups/design.md`.
- [x] Run `npm run mockups:check`, `npm run lint`, `npm run format:check`,
      and `npm run file-length:check`. Smoke-test the changed pages in
      both schemes and both viewports.
- [x] Update the design and the TODOs of this plan for each problem that
      the mockups show.

Evidence: `.context/operator-section/mockups-check.log` and the screenshots
in `.context/operator-section/shots/`.

## Milestone 1a: Lift mockups

Tags: mockup

Depends on: 1

The lift of decision 145 B on the operator page, on desktop and on a phone.

- [x] Add the Suspended box to `app/operator`: each suspended user and
      org, with the time, the operator, and Lift.
- [x] Add `app/operator/lift`: the confirm dialog of a lift for a user,
      with variants for an org and for a page with no suspension.
- [x] Update `docs/mockups/catalogue.md` and `docs/mockups/design.md`.
- [x] Run `npm run mockups:check`, `npm run lint`, `npm run format:check`,
      and `npm run file-length:check`. Smoke-test the changed pages in
      both schemes and both viewports.
- [x] Update the design and the TODOs of this plan for each problem that
      the mockups show.

Evidence: `.context/operator-section/mockups-check.log` and the `lift-`
screenshots in `.context/operator-section/shots/`.

## Milestone 1b: Search and page mockups

Tags: mockup

Depends on: 1a

The Orgs and Users tabs of decision 147: their searches, the page of an
org and of a user, and Suspend and Lift on those pages.

- [x] Add the tabs Overview, Orgs, and Users to the operator page. Make
      the rows of the Suspended box and the largest orgs open their pages.
- [x] Add `app/operator/orgs`: the newest orgs, a search with a match, and
      a search with no match.
- [x] Add `app/operator/org`: the page of an org with Suspend, its
      confirm dialog, the org after the suspension with Lift, the Lift
      dialog, and a deleted org.
- [x] Add `app/operator/users` and `app/operator/user` in the same way,
      with the warning before the operator suspends their own account.
- [x] Remove `app/operator/lift`, whose dialogs move to the two pages.
- [x] Update `docs/mockups/catalogue.md` and `docs/mockups/design.md`.
- [x] Run `npm run mockups:check`, `npm run lint`, `npm run format:check`,
      and `npm run file-length:check`. Smoke-test the changed pages in
      both schemes and both viewports.
- [x] Update the design and the TODOs of this plan for each problem that
      the mockups show.

Evidence: `.context/operator-section/mockups-check.log` and the `orgs-`,
`org-`, `users-`, and `user-` screenshots in
`.context/operator-section/shots/`.

## Milestone 1c: Mockup feedback on the overview and the names

Tags: mockup

Depends on: 1b

- [x] Remove the Suspended box and its placeholder from `app/operator`, as
      decision 148 chose.
- [x] Show the names of the members on `app/operator/org`, and a Name row
      on `app/operator/user`, as decision 149 chose.
- [x] Update `docs/mockups/catalogue.md`.
- [x] Run `npm run mockups:check`, `npm run lint`, `npm run format:check`,
      and `npm run file-length:check`. Smoke-test the overview in both
      schemes and both viewports.
- [x] Update the design and the TODOs of this plan.

Evidence: `.context/operator-section/mockups-check.log`, and the
`overview-` and `-names-` screenshots in
`.context/operator-section/shots/`.

## Milestone 2: Documentation and protocol

Depends on: 1c

- [ ] Add "The operator page" to `docs/protocol/operator-actions.md`: who
      sees it, the numbers that it shows, the app-wide reads, metadata
      only, and the not-found page for everyone else.
- [ ] Add "Lift a suspension" to `docs/protocol/operator-actions.md`: only
      an operator lifts, what comes back, what stays lost, the record of
      each suspension and lift, and the disk restart.
- [ ] Add the Orgs and Users tabs to the operator page part: the search
      keys, what each page shows, and Suspend and Lift from the pages,
      each with its confirm step.
- [ ] Add the operator exception to "Orgs and workspaces" in
      `docs/protocol/access-and-security.md`: the operator page reads
      counts and org names across every org.
- [ ] Add the operator page to the Web app part of `docs/architecture.md`,
      and say in its Operator and Suspension terms that the operator also
      suspends orgs.

## Milestone 3: Operator numbers in the Worker

Depends on: 2

- [ ] Add `GET /api/operator/overview` behind the gate and the operator
      check. It reads the counts of the design from D1 in one batch: the
      unfinished builds, and the new workspaces and new users of each UTC
      day as dates. The type `OperatorOverview` lives in
      `src/shared/operator.ts`.
- [ ] Add `operator: boolean` to the account reply. One shared reader of
      `OPERATOR_GITHUB_IDS` serves it and the route check.
- [ ] Test the route with local D1: each state, the running builds, the
      7-day windows, the 30 days, the largest orgs with an archived
      workspace and a tie, a deleted org, and 403 `operator_required` for
      another user.
- [ ] Update `worker/operator/README.md`, `worker/README.md`, and the
      `OPERATOR_GITHUB_IDS` row of `docs/deployment.md`.

## Milestone 4: Org and user pages in the Worker

Depends on: 3

- [ ] Add `GET /api/operator/orgs` and `GET /api/operator/users` with a
      search, behind the gate and the operator check. Each gives 20
      results, newest first, and a cursor for Show more. The keys are
      those of the design.
- [ ] Add `GET /api/operator/orgs/<orgId>` and
      `GET /api/operator/users/<githubId>`: the details with the name of a
      user, the workspaces by state, the running cloud computers, the
      members with their names and roles or the orgs with their roles, and
      the suspension with its time and its operator.
- [ ] Test with local D1: each search key, an empty search, Show more, a
      deleted org, a suspended user and org, an unknown target, and 403
      `operator_required` for another user.
- [ ] Update `worker/operator/README.md`, and the path helpers and types
      in `src/shared/operator.ts`.

## Milestone 5: Lift a suspension in the Worker

Depends on: 4

- [ ] Add a migration with an append-only table of suspension events: the
      user or the org, the kind, suspend or lift, the time, and the
      operator. The two suspend routes write their rows.
- [ ] Add `DELETE` on the user and the org suspension paths, behind the
      gate and the operator check. Each lift clears the suspension, writes
      its row, and runs the owner-change check of each affected workspace.
      A repeat changes nothing.
- [ ] Test with local D1 and the workspace object: a lift of a user and of
      an org, a repeat, an unknown target, 403 `operator_required` for
      another user, the disk restart set again, a deleted org that stays
      deleted, and a revoked token that stays revoked.
- [ ] Update `worker/operator/README.md`, `worker/README.md`, and the path
      helpers in `src/shared/operator.ts`.

## Milestone 6: Operator section in the web app

Tags: ui

Depends on: 3, 4, 5

- [ ] Add the `/operator` route and its screen, with the parts of the
      mockups. Other people see the not-found page.
- [ ] Add Operator to the rail and to the org switcher of a phone, for
      operators only.
- [ ] Add the loading and error states, and Refresh.
- [ ] Add the Orgs and Users tabs, their searches, and the page of an org
      and of a user, with Suspend and Lift and their dialogs.
- [ ] Test the screens, the routes, the links, the suspend, and the lift.
- [ ] Add a README for the new area, and update `src/app/README.md`.

## Milestone 7: Verification, commit, review, and pull request

Depends on: every other milestone

- [ ] Run the targeted tests and the complete gate named in `AGENTS.md`.
- [ ] Commit with Conventional Commits and push the branch.
- [ ] Review the complete local diff against `origin/main` with the
      `implementation-review` skill after the push. Report the findings,
      then apply the fix rule: fix the `fix now` findings, record
      follow-up items under `plans/follow-ups/` for the rest, re-review
      once, and report.
- [ ] Delete this plan when the `plans` skill says, under "Deleting the
      plan".
- [ ] Open the pull request. Its description gives the decisions and the
      design calls of this plan with their dates, a permalink to this plan,
      and the follow-up items that the change adds.

## Post-merge follow-up (non-blocking)

- [ ] Open `/operator` on the deployed app as an operator, and compare the
      numbers with a D1 query.
