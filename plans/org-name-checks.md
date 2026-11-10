# Org name checks

Status: Active. On branch `calummoore/org-name-ai-check`, no pull request yet. The pull request that completes the work deletes this plan, as the `plans` skill says.

An org name is free text. Today nothing tells the operator when a new org
gets an offensive, misleading, or otherwise strange name. The operator
finds such an org only by chance in the Orgs tab, or after an abuse report.

This change adds an automatic check of each org name. A Workers AI model
reads the name in the background, in the same way as the workspace titles
of decision 184. The operator section shows each name that the model flags,
so that the operator can review it. The check never delays, refuses, or
changes a create or a rename. The members of the org never see the check.

The change does not cover workspace names, section names, GitHub names, or
chat text. It sends the operator no email. It adds no automatic suspension.

Contract owners:

- A new protocol doc, `docs/protocol/org-name-checks.md`: the check.
- [Operator section](../docs/protocol/operator-section.md): the review.
- [Deployment inputs](../docs/deployment.md): the model variable.
- The [operator backend README](../worker/operator/README.md) and the
  [operator section README](../src/shell/operator/README.md).

## Terms

- **Workers AI:** the model service of Cloudflare. The Worker calls it
  through the `AI` binding, on the Cloudflare account that hosts the app.
- **Name check:** one request to the model about the name and the custom
  initials of one org. Its result is clear, flagged, or unchecked.
- **Flag:** the mark of a flagged name, with the category that the model
  gave, such as "Claims to be a known brand".
- **Review:** the operator's look at a flagged or unchecked name. Mark
  reviewed ends it.

## Decisions

### Decision 260: Check org names with an AI model, and flag strange names

- **Date:** 10 November 2026. The user chose it in the task message of
  this workspace: "add an ai check (use same approach we use for naming
  workspaces) - to flag orgs with strange names - still let them create,
  but flag in operator to review".
- **Choice:** a Workers AI model checks each org name in the background,
  as the workspace titles do. A create always goes on. The operator
  section shows each flagged org for a review.
- **Left out by the request:** a check that refuses a strange name, a
  check that delays the create, and a review by hand of each new org.

### Decision 261: How the operator finds and ends the review of a flagged org

Open. It waits for the user.

- **Severity:** Medium. **Effort:** Medium.
- **Source:** Design.
- **Category:** Docs or spec.
- **Location:** `docs/protocol/operator-section.md`, `worker/operator/`,
  and `src/shell/operator/`.
- **Terms:**
  - **Operator section:** the part of the web app at `/operator`, where
    the operator sees the whole app. Its tabs are Overview, Orgs, Users,
    Waitlist, and Invite codes.
- **Background:** The Overview tab shows counts and the five orgs with the
  most workspaces. A line under the user count opens the Waitlist tab. The
  Orgs tab lists the newest orgs, 20 at a time, with a search. The page of
  an org shows its details and members, and it has Suspend.
- **Problem:** No requirement says where the operator sees a flag, or how
  a review ends. Without an end, a false flag stays for ever. The operator
  then cannot tell a new flag from an old one.
- **Impact if no action:** The check runs, but the operator has no
  reliable way to find new flags. Strange names then still go unnoticed.
- **Root question:** How does the operator learn of each org name that
  needs a look, and tell it from the names already handled?
- **Options:**
  - **A.** Show the flag only. The row in the Orgs tab and the org page
    show the flag and its category. No list and no review state. A rename
    to a clear name removes the flag. Cost: the operator must look
    through the Orgs tab, and a false flag never goes away. Effort:
    Medium.
  - **B.** A list on the Overview. A new section, "Names to review", lists
    the orgs that wait for a review: up to 10, oldest first, with the
    total. Each row opens the org page. The org page shows the flag with
    its category, and it has Mark reviewed. The Orgs tab marks each row
    that waits. Cost: no paging, so the 11th name shows only after a
    review. The first check of the existing orgs can flag more than 10.
    Effort: Medium.
  - **C.** A filter on the Orgs tab. A line under the org count of the
    Overview, such as "3 names to review", opens the Orgs tab with only
    the orgs that wait, with paging. The org page has Mark reviewed, as in
    B. Cost: a new filter in the address and in the directory read.
    Effort: Medium.
  - **D.** A sixth tab, Review. It lists the orgs that wait, with paging,
    and the Overview links to it. The org page has Mark reviewed, as in B.
    Cost: a new tab, page, route, and mockups. It changes the tab list of
    decisions 147 and 160. Effort: Large.
  - **E.** C without a review state. The filter lists each flagged or
    unchecked name, newest flag first. The Overview line counts the flags
    of the last 7 days. No Mark reviewed and no write route. Cost: a false
    flag stays in the filter for ever. No operator sees which names
    another operator already looked at. Effort: Medium.
  - **F.** C, with Mark reviewed also on each row of the filtered list.
    The Waitlist tab puts Approve in the same two places. Cost: Mark
    reviewed asks nothing and has no undo, so a slip on a row ends a
    review. Effort: Medium.
  - **G.** B or C, and a count of the names that wait on the Operator link
    of the rail and of the phone switcher. Cost: a new mark with mockups,
    and one more D1 read at each account read of an operator. The waitlist
    count has no such mark. Effort: Large.
  - **H.** B or C, and one email for each new flagged or unchecked name. The
    email links to the section and holds no name. Cost: a new kind of
    email that can fail, a choice of recipient, and a wider scope.
    Effort: Large.
- **Left out:**
  - An end of the review at Suspend: a suspension for another reason then
    ends a review that nobody did. That fails the goal.
  - An end of the review when the operator opens the org page: a page that
    the operator leaves without a look then ends the review. That fails
    the goal.
  - A flag that ends after a set time: a flag that nobody saw in time
    goes away. That fails the goal.
  - A chat message, such as Slack, or a browser notification: H gives the
    same signal through the email service that the app already uses. The
    others add a secret and a new third party that gets data.
- **Wider fix:** None, because this is a design question, not a defect.
- **Previous examples:**
  - The waitlist line on the Overview opens the Waitlist tab
    (decision 160).
  - The Overview lists the five largest orgs (decision 144).
  - The user removed a list of suspensions from the Overview. The Orgs and
    Users tabs find a suspended org or user instead (decision 148).
- **Recommendation:** C. It repeats the waitlist line under an Overview
  tile, and it pages through each waiting name, for the effort of B.
  Decision 148 also kept lists in the tabs. The first recommendation was
  B. The options check of this plan changed it.
- **Action:** ask the user, because the options trade the size of the
  change against paging and visibility, and no option is clearly best.

## Design

These are design calls. Each is my call, made on 10 November 2026. The
calls about the review follow option C of decision 261. They change when
the user chooses another option.

- **When the check runs.** At each create, and at each rename that changes
  the name or the custom initials. Reason: a rename can give a strange name
  to an org after a clean create. The server accepts any text as initials,
  and the rail shows them to every member.
- **What the model flags.** The prompt asks whether a careful moderator
  would want to look at the name. It flags offensive, hateful, sexual, or
  violent words, threats, and harassment. It flags a claim to be a known
  company, brand, public person, government body, or Conductive itself.
  It flags signs of a scam, phishing, spam, or crypto mining, and a link,
  an email address, or a phone number. It flags code, instructions to a
  model, and random characters with no meaning. It does not flag ordinary
  company, team, project, or personal names, or plain test names such as
  "Test" or "My org". Reason: the request asks for strange names, which
  is wider than offensive names. A false flag costs the operator one
  review, and it blocks nobody.
- **The input.** The prompt gives the name and the initials as JSON
  strings, and it says to treat them as data, as the title prompt does.
  It sends at most the first 500 characters of the name, with the full
  length. Reason: a user can write a name that tries to steer the model.
  Such a name counts as strange.
- **The answer.** One line: `OK`, or `FLAG:` and one category word. The
  words are `offensive`, `impersonation`, `scam`, `contact`, `code`, and
  `nonsense`. A flag with another word gets the category `other`. The
  reader takes the first line with text, from either answer shape that
  the title reader accepts. Each other answer is a failed check. Reason:
  JSON mode works only on some Workers AI models, and it can fail with
  "JSON Mode couldn't be met". A one-line answer works with each text
  model, as the title answer does.
- **No model text on the page.** The section shows a fixed label for each
  category, never the text of the model. Reason: the operator section
  shows only counts, names, IDs, dates, roles, states, and codes. The
  category is a state. The model reads user text, so its own words are
  untrusted text.
- **The model.** A new Worker variable, `CONDUCTIVE_NAME_CHECK_MODEL`.
  `wrangler.jsonc` sets it to `@cf/meta/llama-3.3-70b-instruct-fp8-fast`.
  Reason: the check needs judgment and knowledge of brands. The title model
  `@cf/ibm-granite/granite-4.0-h-micro` is very small. Creates and renames
  are rare. At $0.293 for each million input tokens and $2.253 for each
  million output tokens, a check costs less than $0.001. A variable of its
  own lets the operator change one model without the other.
- **No configuration.** Without the variable or the binding, no check
  runs, no attempt counts, and the Worker logs a warning, as for the
  titles. The names stay pending, and the org page shows each one as not
  checked yet. Reason: local development has no Workers AI, so its orgs
  must not fill the review list. `wrangler.jsonc` sets both inputs for
  each deploy. A later configuration then checks the waiting names.
- **The records.** A new D1 table, `org_name_checks`, holds one row for
  each org. The row holds a check ID, the checked name and initials, the
  state, the category, the times, the attempts, and the review with its
  operator. The states are `pending`, `clear`, `flagged`, and `unchecked`.
  A create or a changed rename writes a new check ID, `pending`, and no
  review, in the same D1 batch as the org write. A result applies only
  while its check ID is current. Reason: a result for an old name must
  never flag or clear the current name. The same batch leaves no new name
  without a check.
- **The schedule.** The create and the rename start the check through
  `waitUntil` of the request, so the reply does not wait. Each call aborts
  after 15 seconds, as the title call does. The scheduled handler runs
  every 15 minutes. It checks each pending name whose last attempt is 10
  minutes old or more, 10 names in each run. Twenty-four hours after the
  first failed attempt, the state becomes `unchecked`. Reason: a failed
  call must not let a strange name pass in silence. The approval emails
  retry for 24 hours too.
- **Existing orgs.** The migration writes a pending check for each org
  that is not deleted. The scheduled handler then checks them. Reason: the
  project has few orgs, and each org then has a check.
- **A name that needs a review.** A `flagged` or `unchecked` name with no
  review, in any org.
- **The review list.** It holds each org whose name needs a review, except
  a suspended or a deleted org. A lift brings back the org of a name that
  nobody reviewed. Reason: a suspended org needs no look while the
  suspension stays, and a deleted org is hidden from its members. The
  waitlist count leaves out suspended people in the same way.
- **Mark reviewed.** The org page offers it while the name needs a review,
  also for a suspended or a deleted org. The request sends the check ID.
  The server records the review only while that check is current and the
  name needs a review. Otherwise it answers HTTP 409 with
  `name_check_changed`, and the page reads the org again. A repeat answers
  HTTP 200 and changes nothing. It acts at once, with no question.
  Reason: the operator must not review a name that they did not see. The
  action changes no access and no data of the org.
- **The members.** They see nothing of the check. Reason: the request asks
  for a flag in the operator section only.
- **The code.** A new folder, `worker/org-names/`, holds the prompt, the
  call, the records, and the retries. `worker/operator/` reads the records
  and holds the review route. The timeout, the abort, and the answer reader
  of `worker/chat/title-model.ts` move to one shared module for both calls.
  Reason: the create in `worker/app-api/` and the rename in
  `worker/members/` both start a check, and neither owns the other. One
  shared call keeps the same timeout and reader for both.
- **The protocol docs.** The check gets its own protocol doc. The review
  goes into `docs/protocol/operator-section.md`, after a split of that doc.
  `docs/protocol/operator-actions.md` stays as it is. Reason: both operator
  docs pass the target of about 250 lines, and the `documentation` skill
  splits a doc past the target when a change touches it.
- **The Privacy page.** It says that Cloudflare's AI model service checks
  each org name, and that the operator sees a flagged name. Reason: the
  notice lists each use of personal data, and an org name can hold
  personal data.

## Milestone 1: Mockups

Tags: mockup

Depends on: none. It waits for the answer to decision 261.

Draw the review of the option that the user chooses for decision 261. The
TODOs below are for option C, the recommendation.

- [ ] Overview: the line "N names to review" under the org count, at
      desktop and phone sizes. Draw the Overview with no name to review
      too.
- [ ] Orgs tab: the filter of the names to review, with a flagged row and
      an unchecked row, and the filter with no row. Draw the mark on a row
      that waits in the list with no filter.
- [ ] Org page: a flagged name with its category and Mark reviewed, a name
      that could not be checked, a name not checked yet, and a reviewed
      name.
- [ ] Update `docs/mockups/catalogue-operator.md` and
      `docs/mockups/design-operator.md`.
- [ ] Run `npm run mockups:check`. Smoke-test the changed pages with
      `npm run mockups:serve`.
- [ ] Update the design and the TODOs of this plan for each problem that the
      mockups show.

## Milestone 2: Documentation and protocol

Depends on: 1

- [ ] Add `docs/protocol/org-name-checks.md` with the check of
      decision 260: what it sends, when it runs, what it flags, its
      categories, its retries, and its states. Say that it never delays,
      refuses, or changes a create or a rename. Link it from the protocol
      list of `docs/architecture.md`.
- [ ] Split `docs/protocol/operator-section.md` into linked pages, so that
      each page stays near 250 lines. Then add the review of decision 261,
      and the category of a flag to what the section shows.
- [ ] `docs/protocol/orgs-and-members.md`: under Orgs, say that a create
      and a rename start the check, with a link.
- [ ] `docs/deployment.md`: add `CONDUCTIVE_NAME_CHECK_MODEL` to the inputs
      table, and a section on the name check model.
- [ ] Root `README.md`: add the check to the features, and the variable to
      the `wrangler.jsonc` paragraph.
- [ ] Read both legal pages in full. Update each sentence of the Privacy
      page and the Terms page that restates a changed fact.
- [ ] Check the rows of `src/marketing/from-conductor/` for a listed
      feature that this change ships.
- [ ] Check each relative link of each changed Markdown file.

## Milestone 3: The name check

Depends on: 2

- [ ] Move the timeout, the abort, and the answer reader of
      `worker/chat/title-model.ts` to a shared module. Keep the behaviour
      and the tests of the title request.
- [ ] Add the migration `org_name_checks`, with ON DELETE CASCADE, its
      review index, and a pending check for each org that is not deleted.
      Reserve its range and add its paragraph in `migrations/README.md`.
- [ ] Delete the rows in `purgeOrgRecords` of
      `worker/members/purge-data.ts`, before the org row.
- [ ] Add `CONDUCTIVE_NAME_CHECK_MODEL` to `AppEnv` and to `wrangler.jsonc`.
- [ ] Add `worker/org-names/` with the prompt, the answer reader, the call,
      the records, and a README. Inject the model call as a dependency, so
      that the tests use no Workers AI.
- [ ] Write the pending check in the D1 batch of the create in
      `worker/app-api/feature-org-data.ts`. Write it in the batch of the
      rename in `worker/members/org-data.ts`, only when the name or the
      initials change.
- [ ] Pass `waitUntil` of the request to the create and the rename routes,
      and start the check there. Give the test harness a `waitUntil` that
      the tests can await.
- [ ] Add the retry to the scheduled handler in `worker/application.ts`,
      after the repairs. Catch its errors, as the approval emails do.
- [ ] Add the warning kinds to `worker/warning-types.ts`. No warning holds
      the name, the initials, or the answer.
- [ ] Tests:
  - [ ] The answer reader: `OK`, `FLAG:` with each category, an unknown
        category, and other answers.
  - [ ] The create and a changed rename write a pending check. A rename
        that keeps the name and the initials keeps the check.
  - [ ] A flagged answer and a clear answer. A result for an old check ID
        changes nothing.
  - [ ] The retry, and `unchecked` after 24 hours. No attempt without the
        variable or the binding.
  - [ ] The migration writes the pending checks, and the purge removes the
        row.
- [ ] Update the Worker READMEs that list the folders and the warnings.

## Milestone 4: The operator API for the review

Depends on: 3

The TODOs below are for option C of decision 261.

- [ ] `src/shared/operator.ts`: add the count of the Overview, the review
      filter of the Orgs read, the flag of an Orgs row, the name check of
      the org page, and the path and the reply of Mark reviewed.
- [ ] `worker/operator/overview.ts`: count the orgs of the review list.
- [ ] `worker/operator/org-directory.ts`: read only the review list when
      the filter is on, with the existing paging and search. Mark each row
      whose name needs a review.
- [ ] `worker/operator/org-detail.ts`: read the name check, its category,
      its time, and its review with the operator.
- [ ] Add `POST /api/operator/orgs/<orgId>/name-review` with the body
      `{ checkId }`, for the operator only.
- [ ] Tests: each read, the filter with a suspended and a deleted org,
      Mark reviewed with HTTP 409 and the repeat, HTTP 403
      `operator_required` for a member, and `access_required` for a person
      who waits.
- [ ] Update `worker/operator/README.md`.

## Milestone 5: The operator screens

Tags: ui

Depends on: 1, 4

The TODOs below are for option C of decision 261.

- [ ] Overview: the line of the names to review, which opens the filter.
- [ ] Orgs tab: the filter in the address, its rows, and the mark on a row
      that waits.
- [ ] Org page: the flag, its category, its time, Mark reviewed, the
      states not checked yet and could not be checked, and the reviewed
      state. After HTTP 409, read the org again.
- [ ] Tests for each state, the filter, and Mark reviewed.
- [ ] Update `src/shell/operator/README.md`.

## Milestone 6: Verification, commit, review, and pull request

Depends on: every other milestone

- [ ] Run the targeted tests and the complete gate named in `AGENTS.md`.
- [ ] Commit with Conventional Commits and push the branch.
- [ ] Review the complete local diff against `origin/main` with the
      `implementation-review` skill after the push. Report the findings,
      then apply the fix rule: fix the `fix now` findings, record
      follow-up items under `plans/follow-ups/` for the rest, re-review
      once, and report.
- [ ] Before the pull request, give decisions 260 and 261 new numbers if
      `origin/main` uses them.
- [ ] Delete this plan when the `plans` skill says, under "Deleting the
      plan".
- [ ] Open the pull request. Its description gives the decisions and the
      design calls of this plan with their dates, a permalink to this plan,
      and the follow-up items that the change adds.

## Post-merge follow-up (non-blocking)

- [ ] On the deployed app, create one org with a plain name and one with a
      strange name. The strange name waits for a review within a minute,
      with a category. The plain name does not. Mark reviewed ends the
      review. The Worker log shows no name check warning.
