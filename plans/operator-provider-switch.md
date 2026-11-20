# An operator switches the provider account of an org

Status: Active. On branch `calummoore/operator-switch-user-boat-e2b-rn5q`, no pull request yet. The pull request that completes the work deletes this plan, as the `plans` skill says.

Today each org runs on one provider account, `boat` or `e2b`, for its whole
life (e2b decision 222). An org gets its account once, when it is created.
No operator action can move an org later.

On 20 November 2026, the user asked for this approach: "operator should be
able to switch the org to use a different provider - it would do a rebuild
after the switch - then that org can have some workspaces on a different
providers, switch would only apply to new workspaces". So:

- An operator can switch an existing org to another configured provider
  account.
- The switch builds the org image on the new account.
- New workspaces of the org start on the new account.
- Each existing workspace stays on its own account until it is archived.
  One org can then have workspaces on two accounts.

The message chooses the approach, so this plan skips the brainstorm. This
reverses the part of e2b decision 222 that dropped the operator move. The
earlier E2B plan designed this move as option G on 10 November 2026, with
items 219 and 220 about the build of a move. That record is at
[commit 237fb84](https://github.com/Firna-AI/remote-code/blob/237fb8485d3e2d4a5819611730a6aa3e7d514c24/plans/e2b-backup-provider.md).
The decisions below reuse its analysis.

The change does not cover a bulk switch of many orgs, an automatic failover,
an overflow by capacity, or a move of an existing workspace. E2b decision
222 rejected the failover and the overflow. The user's message keeps
existing workspaces where they are.

Contract owners:

- [Provider accounts](../docs/protocol/provider-accounts.md).
- [Operator section](../docs/protocol/operator-section.md).
- [Org image](../docs/protocol/org-image.md).
- [Orgs and members](../docs/protocol/orgs-and-members.md).
- The [migrations README](../migrations/README.md).

## Decisions

The prefix `switch` names this change, as
[Decision numbers](../docs/architecture.md#decision-numbers) says. The user answered every decision on 20 November 2026.

### switch decision 1. New workspaces wait while the switch builds

- **Severity:** Medium. **Effort:** Medium.
- **Source:** Design.
- **Category:** Docs or spec.
- **Location:** `prepareCreationRequest` in `worker/lifecycle/create-request.ts`, `readOrgProviderAccount` in `worker/data/org-provider-account.ts`.
- **Background:** Each create reads the account of the org, then the org image of that account. The image of each account is its own row in `org_images`. A new account has no image until its first build succeeds. A build of the org image takes minutes, up to its 60-minute limit. [The org image](../docs/protocol/org-image.md#the-org-image) says that a failed build keeps the last good image (decision 9).
- **Problem:** The user's message says that the switch does a rebuild. It does not say what a member gets from a new workspace while that build runs, or after it fails.
- **Impact if no action:** If the account changes at once, every new workspace of the org fails with "The cloud computer is still being prepared" until the build succeeds. A failed build leaves the org with no image.
- **Root question:** From when do the new workspaces of a switched org start on the new account?
- **Options:**
  - **A.** Switch at once. The account of the org changes when the operator switches, and the build starts on the new account. New workspaces fail until the build succeeds. A failed build leaves the org with no usable image until an admin builds again. Effort: Small.
  - **B.** Switch when the image is ready. The switch records the target account and builds there. The org keeps its account until that build succeeds. Then the account changes in the same write that publishes the image. Until then, new workspaces start on the old account. A failed build leaves the org on its old account. Effort: Medium.
  - **C.** Two operator steps. Prepare builds the image on the target account. When the image is ready, the operator presses Switch, and the account changes. Effort: Medium.
  - **D.** Added by the options check. Builds move at once, and creates follow the newest good image. The switch changes the account of the org at once, so each later build and refresh runs on the new account. A create uses the image of the org's account when it exists, and else the newest good image of the org on another account. A failed switch build does not undo the switch. Each reader of the org image must then choose between two images: the create, the Cloud computer tab, and the repository lists of New workspace and of the agent tools. While builds on the new account fail, the image that serves creates gets no refresh. Effort: Large.
- **Shared assumptions:** The options check named these.
  - Each switch runs a full build on the target account. Source: the task message. It holds.
  - One record gives the account of builds and of creates. Source: the code, `create-request.ts` and `image-builds.ts`. It is not a requirement. D drops it.
  - One job runs at a time in each org. Source: [Org image](../docs/protocol/org-image.md). It holds. Option C of switch decision 3 drops it.
- **Left out:**
  - A switch now override on top of B, for an outage. In an outage, a create on the old account fails anyway, and B moves the creates as soon as the image is ready, as A does.
  - A create that falls back to the other account by itself. E2b decision 222 rejected an automatic failover and an overflow by capacity.
  - Create a new org on the other account. It fails the goal, because the members lose the workspaces and settings of the org.
- **Wider fix:** D, as the options check says. It keeps creates working for every account change, with no special rule for each case.
- **Previous examples:** Option G of e2b decision 222, in the earlier plan at commit 237fb84: "When the image is ready, the org's account changes. Until then, new workspaces start on the old account."
- **Related:** Switch decisions 2 and 3 are about the same build.
- **Recommendation:** B. Members never lose new workspaces to the switch, and a failed build keeps the last good image, as decision 9 asks. Under A, the web app still shows the old good build as current, so members get no wait notice, only a failed create. Older copies of the Mac app do the same. Choose D only if the operator's switch must never wait for a build. The options check also recommends B.
- **Action:** ask the user, because A and B have real trade-offs, and the user's words "switch, then rebuild" can mean A.
- **Chosen:** B, by the user on 20 November 2026, as recommended.

### switch decision 2. Members see the switch build as their own

- **Severity:** Medium. **Effort:** Medium.
- **Source:** Design.
- **Category:** Docs or spec.
- **Location:** `startImageBuild` in `worker/lifecycle/image-builds.ts`, the Settings mark in `src/shell/list/Sidebar.tsx`, and the Cloud computer tab in `src/app/computer-model.ts`.
- **Background:** The Cloud computer tab of the org lists each build of the org image. When the newest build failed, the Settings link shows a mark, and the tab offers Try again. A build of the kind `build` runs the saved install script and the saved repositories. An admin can save a script without a build. Open tabs refuse a build kind that they do not know.
- **Problem:** Members see a switch build as a build of their own. A failed switch build gives them a mark and Try again, though under switch decision 1 B their image still works. A switch build also runs a saved script that nobody built yet.
- **Impact if no action:** Admins see a failure that they cannot fix. A switch can change the cloud computer of the members with a script that they did not build.
- **Root question:** What may a switch change for the members of the org, other than the account of their new workspaces? The options check wrote this root question, because what members see and what their image holds are one problem.
- **Options:**
  - **A.** A normal build from the saved settings. Members see it as any build, with the mark and Try again on a failure. Effort: Small.
  - **B.** A build from the saved settings. Members see it while it runs. A failed switch build gives no mark and no Try again. The page of the org in the operator section shows the failure. Effort: Small.
  - **C.** B, and the switch build copies the inputs of the newest good image: the install script, the settings revision, the repositories, and their folders. So a saved script that nobody built cannot fail the switch, or reach members without Build computer. Effort: Medium.
  - **D.** Members do not see the switch build. Only the operator section shows it. A Build computer of an admin waits until the switch build ends. Effort: Medium.
  - **E.** Added by the options check, from item 219 of the earlier plan. B, and a failed switch build stays in the members' history with its log and a note. The note says that new workspaces still start from the current image. Admins can then find a script that fails only on the new cloud computer. E can join C. Older copies of the Mac app still show the mark and Try again for that build. Effort: Small.
  - **F.** Added by the options check. C, and a Build computer or Try again of an admin during the switch build records one added build. That build runs the saved settings on the new account after the switch build succeeds. Today such a request gets the running switch build back, so the admin's saved script would not run. Effort: Medium.
- **Shared assumptions:** The options check named these.
  - The switch build keeps the kind `build`. Source: a design call. It holds, because the web app and the Mac app refuse other kinds.
  - The app can tell a switch build from a members' build. Source: none. The build in the API has no such field today. Older copies of the Mac app show the mark unless the Worker leaves a failed switch build out of the list. D drops this assumption.
- **Left out:** A Try again that retries the switch, because admins then see a provider failure that they cannot fix.
- **Wider fix:** C. It keeps the image that members use, whatever the saved settings hold.
- **Previous examples:** Item 219 of the earlier plan at commit 237fb84 asked the same question for a move. Its options check recommended C.
- **Related:** Switch decision 1. Under switch decision 1 A, the org has no working image during the build, so B and C lose their reason for no mark. Switch decision 3: under C, an ended build of an admin is not rebuilt by the switch.
- **Recommendation:** C. Members keep the image that they use, and a failed switch build is the operator's problem, not theirs. C needs two conditions. The Worker leaves a failed switch build out of the members' list, so that older Mac apps show no mark. The switch build does not start the added build of the saved settings. The options check also recommends C.
- **Action:** ask the user, because a switch build is behaviour at a boundary that no requirement covers.
- **Chosen:** D, by the user on 20 November 2026: "hide the operator builds from the user". The agent recommended C. D keeps the input copy of C as a design call, because a hidden build must not change the image of the members.

### switch decision 3. A switch waits behind a running build

Changed by the options check: option E, and the recommendation changed from B to D.

- **Severity:** Medium. **Effort:** Medium.
- **Source:** Design.
- **Category:** Docs or spec.
- **Location:** `startImageBuild` and `runningBuild` in `worker/lifecycle/image-builds.ts` and `worker/lifecycle/build-data.ts`.
- **Background:** One org runs one build at a time. When a build runs, a new build request gets the running build back. A build that gets only provider errors fails after the provider retry window of 10 minutes. A build that hangs runs to its 60-minute limit. A refresh is a job that only fetches new commits into the image.
- **Problem:** A switch of an org with a running build on the old account waits until that build ends.
- **Impact if no action:** The switched org gets new workspaces on the new account 10 to 60 minutes later. In an outage of the old account, its members get no new workspace in that time.
- **Root question:** How soon does a switched org get its new image when the org has a build in progress?
- **Options:**
  - **A.** The switch waits until the running build ends, then builds on the new account. Effort: Medium.
  - **B.** The switch ends the running build. That build fails, as a build of a suspended user does, and the switch build starts at once. The switch question says that it ends the running build. Effort: Small.
  - **C.** One running build for each account of an org, so that the switch build runs beside the old build. Effort: Large.
  - **D.** The switch waits, as in A, unless the operator ends the build. The switch question shows the running build and offers to end it. Effort: Medium.
  - **E.** Added by the options check, from item 220 of the earlier plan. The switch ends a running refresh at once, but it waits for a running build. A refresh only fetches commits, and the switch build clones the newest commits anyway. Effort: Medium.
- **Shared assumptions:** The options check named these.
  - One job runs at a time in each org. Source: [Org image](../docs/protocol/org-image.md). It holds. C drops it.
  - A switch happens in an outage. Source: the first recommendation, carried over from the earlier plan. It does not hold, because the user's message names no outage. A, D, and E drop it.
  - The switch build redoes the work of an ended build. Source: the text of B. Under switch decision 2 C, it does not hold: the switch build runs the old inputs, so an admin's build of a new script is lost. A, D, and E drop it.
- **Left out:**
  - A switch that refuses while a build runs. B is better on every point: the same effort, and the switch starts at once.
  - A switch that ends only a stuck build. A hang shows no error that the Worker can find.
- **Wider fix:** C. It removes the wait for each build on another account.
- **Previous examples:** Item 220 of the earlier plan at commit 237fb84 asked the same question for a move, and recommended B.
- **Related:** Switch decision 2. Under B, members see the ended build. Under switch decision 2 C, B loses the admin's build of a new script.
- **Recommendation:** D. The first recommendation was B. This request is about a real user's org, not an outage, so B would end an admin's good build for no gain. D still lets the operator end a stuck build in an outage. The options check recommends D.
- **Action:** ask the user, because B ends a build that an admin started, and A and B have real trade-offs.
- **Chosen:** D, by the user on 20 November 2026, as recommended.

### switch decision 4. Real orgs on E2B before E2B consents

- **Severity:** High. **Effort:** Small.
- **Source:** Design.
- **Category:** Process.
- **Location:** `plans/follow-ups/e2b-written-consent.md`, [Regions](../docs/protocol/provider-accounts.md#regions).
- **Background:** E2B's terms bar giving others access to its service without E2B's written consent. The follow-up item keeps every real org off E2B until E2B consents in writing. Today only the weights and the create choice of an operator can put an org on E2B. The weight of `e2b` stays at 0%, and operators create only test orgs there.
- **Problem:** The switch gives operators a new way to put a real org on E2B. The user's question was about a real user.
- **Impact if no action:** A real org on E2B can breach E2B's terms. E2B can then suspend the app's project, which stops every org on `e2b`.
- **Root question:** How does the app keep real orgs off an account that is not yet cleared for them? The options check wrote this root question. Reason: consent is one of several steps in "Before a real org runs on E2B" of `docs/sandbox-provider-accounts.md`, and the switch is a third way onto an account.
- **Options:**
  - **A.** No guard in the code. Operators switch only test orgs to `e2b` until E2B consents, as the follow-up item says. The switch joins the list in "Before a real org runs on E2B". Effort: Small.
  - **B.** A. Also, the switch question names each account that the configuration marks as "tests only", and asks the operator to confirm. Effort: Medium.
  - **C.** Ship the switch only after E2B consents. Effort: Small.
  - **D.** Added by the options check. B on every path. The switch question, the weights on the Providers tab, and the account choice in Create org each name an account that the configuration marks as "tests only". It needs a new field in `SANDBOX_PROVIDER_ACCOUNTS`. Effort: Medium.
  - **E.** Added by the options check. The Worker refuses a switch to a "tests only" account unless every member of the org is an operator. It adds a refusal. A tester who is not an operator cannot switch a test org, but Create org can still put it on `e2b`. Effort: Medium.
- **Shared assumptions:** The options check named these.
  - Consent is the only step before a real org runs on `e2b`. Source: the text of A and C. It does not hold. The doc also asks for the Pro plan, the EU cluster, and a 51 GB disk. D drops it.
  - Production has a configured `e2b` account. It is not confirmed. `plans/follow-ups/e2b-production-account.md` is still open. Until it is done, the switch offers no `e2b`.
- **Left out:** None. The options check brought back the Worker refusal as E, because a rule from the members and the operator list needs no record of test orgs.
- **Wider fix:** D, as the options check says. D reminds operators on every path that can put an org on the account.
- **Previous examples:** The same rule holds for the weights, in the follow-up item `plans/follow-ups/e2b-written-consent.md`.
- **Related:** None.
- **Recommendation:** A. The operators are the app's own staff, and `docs/sandbox-provider-accounts.md` already holds the rule. Choose D if more people get operator access. The options check also recommends A.
- **Action:** ask the user, because only the user can accept the risk under E2B's terms.
- **Chosen:** none of the options, on 20 November 2026. The user said that E2B consented. So the risk is gone, and no guard is needed. The change deletes `plans/follow-ups/e2b-written-consent.md` and the consent steps of `docs/sandbox-provider-accounts.md`. The other steps of "Before a real org runs on E2B" stay.

## Design

These are agent calls of 20 November 2026, marked as my calls. The user can
change each one. Each assumes switch decision 1 B.

- The page of an org in the operator section gets Switch account. It
  offers each configured account other than the current one, by its ID.
  It asks first. The question says that the switch builds the image on
  the new account, that new workspaces move when that build succeeds, and
  that existing workspaces stay. Reason: the page already holds Suspend
  and Lift, with the same question first.
- The app records each switch, with its time, its operator, the old
  account, and the new account, as it records each change of the weights.
  The page of the org names the last switch.
- While a switch build runs, the page of the org shows the target account
  and the build state. A failed switch build shows its failure there, with
  Switch account again.
- A switch back to the current account during a switch build ends that
  build. The org stays on its account.
- An org with no good image and no running build switches at once, and
  its next build runs on the new account. Reason: no workspace can start
  from an image that does not exist. A first build that still runs on the
  old account follows switch decision 3, and the switch then waits for
  it or ends it.
- A suspended org gets a waiting switch. No build runs while the org is
  suspended. Lift starts the switch build. Reason: no build runs for a
  suspended org, and Lift today starts no build, so Lift needs a change.
  Changed after the options check: the first call switched at once, which
  left the org with no image on its account.
- The switch build starts as the first active admin of the org, as an
  automatic refresh does. An org with no active admin gets a waiting
  switch. The image timer starts the switch build when an admin is
  active. Changed after the options check, for the same reason.
- The switch build keeps the build kind `build`. Reason: open tabs refuse
  a kind that they do not know.
- The switch build starts from the software image, as a first build does,
  and it records no previous image. Reason: an old image of the target
  account gets no refresh, and a first build must start from the software
  image, as [Org image](../docs/protocol/org-image.md) says. Added after
  the options check.
- The switch build copies the inputs of the newest good image: the
  install script, the settings revision, the repositories, and their
  folders. It does not start the added build of the saved settings.
  Reason: under switch decision 2 D, members do not see the switch build,
  so it must not change their image. This is the input copy of option C.
- The Worker leaves each switch build out of every read of the members:
  the build list, the current build, the newest build that sets the
  Settings mark, and the build log. Only the operator section shows it.
  After the switch, the Cloud computer tab keeps the newest visible good
  build as current. That build holds the same inputs.
- A Build computer or a Try again of an admin during a switch build waits
  until the switch build ends. Then it runs on the account of the org at
  that time. The tab shows it with the build states that it knows today,
  so that older copies of the Mac app keep working. The mockups settle
  its words. Reason: switch decision 2 D.
- Under switch decision 3 D, the switch question names a running build of
  the org and offers to end it. Without that choice, the switch waits,
  and the switch build starts when the running build ends. The page of
  the org shows the waiting switch.
- The automatic build after a GitHub rename or a new default branch reads
  the newest build on the account of the org. Today it reads the newest
  build on any account, so a failed switch build would stop it. Added
  after the options check.
- A push during the switch build also marks a refresh as due for the new
  image. The switch then starts that refresh after the switch build.
  Added after the options check.
- Each existing workspace keeps its account for every action: resume,
  Continue, a repository change, Archive, and Restore. The code already
  reads the account of the workspace for these actions.
- A new workspace from any source uses the account of the org: the app,
  a sub-workspace, an agent tool, and an automation.
- A retry of a create that failed before the switch uses the account of
  the org at the time of the retry. Reason: the old account may have no
  refreshed image.
- After the switch, the image of the old account stays, and its refresh
  stops. The deletion of an org deletes the images of every account, as
  it does today. A follow-up item records the cleanup of an old image.
- The page of an org gives its workspaces by account when they run on
  more than one account.
- A new table holds the switch records. The migration only adds data, so
  the previous Worker keeps working.

## Milestone 1: Mockups

Tags: mockup

Depends on: none

The operator org page gets Switch account and the states of a switch. The
Cloud computer tab of the members changes only for a build that waits for
a switch build, as switch decision 2 D says.

- [ ] Update `OperatorOrgScreen.tsx` in `docs/mockups/src/screens/`: Switch account, its question, a running switch build, a failed switch build, the last switch, and the workspaces by account.
- [ ] Update the Cloud computer tab mockup: a Build computer of an admin that waits for a hidden switch build. Members see no other sign of the switch.
- [ ] Show a waiting switch on the org page, and the running build that the switch question offers to end.
- [ ] Run `npm run mockups:check`. Smoke-test the changed pages.
- [ ] Update the design and the TODOs of this plan for each problem that the mockups show.

## Milestone 2: Documentation and protocol

Depends on: 1

- [ ] Update [Provider accounts](../docs/protocol/provider-accounts.md): replace "No org and no workspace moves" with the switch rules and the answered switch decisions.
- [ ] Update [Orgs and members](../docs/protocol/orgs-and-members.md), [Workspaces and sandboxes](../docs/protocol/workspaces-and-sandboxes.md), [Org image](../docs/protocol/org-image.md), [Operator section](../docs/protocol/operator-section.md), and the terms of the [architecture doc](../docs/architecture.md).
- [ ] Read the Terms page in `src/marketing/terms.ts` and the Privacy page in `src/marketing/privacy.ts` in full. Update each sentence that restates the account rule, such as "The org keeps that account for its life".
- [ ] Read each public guide in `src/marketing/docs/` in full, and update each sentence that restates the account rule.
- [ ] Delete `plans/follow-ups/e2b-written-consent.md`, and remove its link from `plans/follow-ups/e2b-production-account.md`, because E2B consented.
- [ ] Update `docs/sandbox-provider-accounts.md`: remove the consent steps from "Before a real org runs on E2B", and keep the documents, the settings, and Pro. Also: "No call of an org goes to another account" changes, an old image keeps its account in use, and the switch joins "Before a real org runs on E2B".

## Milestone 3: Switch records and the operator route

Depends on: 2

- [ ] Add the migration of the switch table, under the rules of the [migrations README](../migrations/README.md).
- [ ] Add the operator route of Switch account, with the operator check of the other operator actions, and its record.
- [ ] Add the switch and the workspaces by account to the org detail of `worker/operator/org-detail.ts`.
- [ ] Add tests for the route, the record, and the access check.

## Milestone 4: The switch build

Depends on: 3

- [ ] Start the switch build on the target account, as switch decisions 1, 2, and 3 say.
- [ ] Leave switch builds out of every members' read, and show them on the org page of the operator section.
- [ ] Make a Build computer or a Try again of an admin wait for a running switch build.
- [ ] Change the account of the org in the same write that publishes the image of a switch build.
- [ ] Handle a failed build, a switch back, an org with no good image, a suspended org, and an org with no active admin, as the design says.
- [ ] Start a waiting switch build at Lift and from the image timer.
- [ ] Make the switch build start from the software image, with no previous image and no added build.
- [ ] Read the newest build on the account of the org in `staleImageOrgs` of `worker/lifecycle/org-image-refresh-data.ts`.
- [ ] Carry a push that arrives during the switch build to the new image.
- [ ] Use the current account of the org for a retry of a create.
- [ ] Add tests for each case, also a create during the switch build and a resume of a workspace on the old account.

## Milestone 5: The operator screen

Tags: ui

Depends on: 1, 4

- [ ] Build Switch account, its question, and the switch states on the org page of the operator section, as the mockups show.
- [ ] Change the Cloud computer tab for the answer to switch decision 2.
- [ ] Test the screens in a browser, and save screenshots under `.context/operator-provider-switch/`.

## Milestone 6: Verification, commit, review, and pull request

Depends on: every other milestone

- [ ] Run the targeted tests and `npm run check`.
- [ ] Commit with Conventional Commits and push the branch.
- [ ] Review the complete local diff against `origin/main` with the `implementation-review` skill after the push. Report the findings, then apply the fix rule: fix the `fix now` findings, record follow-up items under `plans/follow-ups/` for the rest, re-review once, and report.
- [ ] Delete this plan when the `plans` skill says, under "Deleting the plan".
- [ ] Open the pull request. Its description gives the decisions and the design calls of this plan with their dates, a permalink to this plan, and the follow-up items that the change adds. It names e2b decision 222 as changed.

## Post-merge follow-up (non-blocking)

- [ ] Switch a test org from `boat` to `e2b` on production. Check that a new workspace starts on `e2b` and that an old workspace still resumes on `boat`.
