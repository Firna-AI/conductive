# Save a Codex endpoint with its `/v1` base

Status: Active. On branch `calummoore/quito-oqn7`, no pull request yet. The pull request that completes the work deletes this plan, as the `plans` skill says.

An own endpoint login for Codex saves the base address of the OpenAI
Responses API, such as `https://proxy.example.com/v1`. The gateway adds
`/responses` to it. A Claude address works with or without a final `/v1`,
because the app drops it. A Codex address without `/v1` is accepted, but a
proxy such as CLIProxyAPI serves the API only under `/v1`. So each Codex
turn on that login fails with HTTP 404. A live check on 13 November 2026
showed it on Cal's proxy: `/v1/responses` and `/v1/models` return 200, and
`/responses` and `/models` return 404. A user who types the same address
in both forms meets this, and nothing warns at the save.

Cal chose option C of decision 1 below on 13 November 2026. At the save of
a Codex endpoint, when the typed base serves no model list and the same
base with `/v1` does, the app saves the `/v1` base. When the save can read
no model list at all, the account page warns. The change does not cover
one setup of a proxy for both agents. That is an open question of its own
in this workspace, and this change does not depend on its answer. It also
does not cover the Fable 5.2 failure on Cal's proxy, which is a proxy
setting.

Contract owners:

- [Own endpoint logins](../docs/protocol/own-endpoint-logins.md).
- The public guide [Agent logins](../src/marketing/docs/agent-logins.md).
- The [model gateway README](../worker/model-gateway/README.md).
- The [account screens doc](../src/app/account-screens.md).

## Decisions

### 1. Tell the user before a turn that a Codex address is wrong

Added on 13 November 2026 from the live check of Cal's proxy, as item 3 of
that report. The options check of 13 November 2026 changed the root
question, added options D to G, changed the recommendation from B to C,
changed the wider fix from B to E, and changed the effort of C from Small
to Medium. Its report is in
`.context/codex-endpoint-v1-base/options-check.md`.

- **Severity:** Medium. **Likelihood:** Common. **Effort:** Medium.
- **Source:** Implementation.
- **Category:** Product bug.
- **Location:** `src/shared/endpoint-address.ts:42`,
  `worker/app-api/boot.ts:130`, and `worker/model-gateway/endpoint-models.ts`.
- **Background:** The Claude form accepts an address with or without
  `/v1`. The Codex form expects the API base, such as `https://host/v1`.
  The hint of the form shows where the requests go. The save reads the
  model list once, and a failed read shows nothing.
- **Problem:** A user who types the same address in both forms gets a
  Codex login that fails each turn with 404. The save does not warn.
- **Impact if no action:** Users with one proxy for both agents often meet
  this, and the cause stays hidden until a turn fails.
- **Root question:** How does a Codex own endpoint login get a base that
  its turns reach, or tell the user at the save that it has none?
- **Options:**
  - **A.** Change nothing. The hint of the form already shows the request
    address. Effort: Small.
  - **B.** When the Codex model list read at the save fails, warn on the
    account page. Also read `/v1/models`, and when that works, suggest the
    `/v1` address. Cost: one more call to the endpoint at the save, so the
    protocol doc changes. Effort: Small.
  - **C.** As B, but save the `/v1` address when only that address works.
    Cost: the app changes what the user typed, and the rule that the form
    shows the saved address gets an exception. Effort: Medium.
  - **D.** The hint of the Codex form says "Add /v1" when the typed path
    does not end with `/v1`. It makes no call. Risk: a fixed guess that
    nags gateways with another base. Effort: Small.
  - **E.** At the save, send a POST with an empty JSON body to
    `<base>/responses`, and treat HTTP 404 as "no API at this base". Risk:
    a new kind of call to the endpoint, and proxies answer an empty body
    in different ways. Effort: Medium.
  - **F.** In the gateway, after HTTP 404 from a base without `/v1`, send
    the request again to `<base>/v1/responses`. Cost: the gateway must
    keep each Codex request body, and the user gets no message. Effort:
    Large.
  - **G.** As C, and Refresh also makes the second read and saves the
    `/v1` base. It repairs a login saved before the change with no new
    key. Cost: Refresh encrypts the login again, with a guarded write.
    Effort: Medium.
- **Left out:** Always add `/v1` to a Codex address, because a gateway
  whose API base has no `/v1` then fails. Add `/v1` only to an address with
  no path, because an API at the root could then not connect. A call from
  the browser, because the Worker must apply the address rule.
- **Wider fix:** E. It tests the request route, so it also catches a wrong
  base when the model list is at another place or is missing.
- **Previous examples:** `plans/follow-ups/codex-save-guide-omits-endpoints.md`
  covers a guide gap for Codex endpoints.
- **Recommendation:** C, first B. The live check shows that `/v1` is the
  usual repair, and the note shows the change, so the user need not save
  again. E best protects the codebase.
- **Chosen:** C, by Cal on 13 November 2026.

## Design

Each item is an agent call of 13 November 2026, unless it names Cal's
choice. Cal can override any agent call.

- **The read at the save.** For a Codex endpoint, the save reads
  `<base>/models` with the key, as today. When that read fails and the
  path of the base does not end with `/v1`, the save reads
  `<base>/v1/models`. When the second read gives a model list, the save
  stores `<base>/v1`, with the query of the typed address. Otherwise it
  stores the typed base. A read succeeds only when the reader of
  `worker/model-gateway/endpoint-models.ts` returns a list. Cal's choice C.
  Gap: a base that lists models at its own path but serves the Responses
  API only under `/v1` gets no second read and no warning. Option E covers
  it. Gap, rare: a base that serves the Responses API at its own path but
  lists its models only under `/v1` gets `/v1` added, and its turns then
  fail. Each new save adds `/v1` again. Option E covers it too.
- **A second read at most.** The save makes at most two reads. The read
  that succeeded becomes the model list of the login, so the save makes no
  third read. The save skips the second read when the first read got no
  HTTP answer, so that a hung endpoint holds the save for 10 seconds at
  most, not 20. Agent call. Reason: the protocol doc limits the calls to
  the endpoint.
- **Before the store.** The reads run before the save encrypts and stores
  the login, because the stored address depends on them. A read that
  fails never fails the save. The store writes the login, its model list,
  and the attempt time in one statement, so that the first turn does not
  read the list again at once. Claude takes the same path, so that one
  save path writes the list. Agent call.
- **Only the save.** Refresh and the background read never change the
  stored address. Agent call. Reason: a smaller change. Option G would
  let Refresh repair a login saved before this change. Without it, such a
  login needs Remove and Connect.
- **Claude.** Claude keeps today's behaviour, because the app already
  drops a final `/v1` of a Claude address. Agent call.
- **What the browser gets.** The save response says that the app added
  `/v1`, with a flag, and does not return the address. The browser keeps
  getting only the host, as the protocol doc says. A later save or a
  Remove clears the note. Agent call.
- **The note.** After such a save, the account page shows a note under
  the Codex row until the page reloads: "Conductive added /v1 to the
  address, because the endpoint lists its models there." Agent call.
  Reason for the words: the read proves only the model list, and the form
  and the guide name the API "the OpenAI Responses API", not "the Codex
  API".
  Reason: the user must see that the saved address differs from the typed
  one.
  The note sits under the kind and the host of the Codex row, before the
  share setting, with an info icon, as the mockup
  `app/account/endpoint-models/v1-added` shows. `EndpointAddressNote` in
  `docs/mockups/src/components/settings/EndpointRead.tsx` draws it.
  `endpointReadCopy.ts` beside it holds its words, with the product name
  from `brand.ts`. Agent call of the mockups, 13 November 2026. Reason:
  the kind and the host also say where the requests go.
- **The warning.** When the model list read of a save or of a Refresh
  fails, the account page shows a warning under the row of that agent:
  "Conductive couldn't read the model list of this endpoint. Check the
  address and the key." It keeps Refresh. A later Refresh that succeeds,
  a new save, a Remove, or a reload of the page removes the warning. The
  save and the Refresh responses carry a flag for it. The warning shows
  for both agents, because a failed read means the same for each. When
  the row also shows models that the list leaves out, the row shows one
  Refresh, not two. Agent call. Cal's choice C asked for the warning for
  Codex at the save. A Claude warning and a warning after Refresh cost no
  call.
  The warning sits under the kind and the host, after the note, with a
  warning icon. Refresh beside it lines up with Remove, as the mockup
  `app/account/endpoint-models/read-failed` shows. When the row also
  shows the models that the list leaves out, Refresh stays beside the
  warning, and the line of those models below it has no Refresh, as
  `app/account/endpoint-models/read-failed-unlisted` shows. That line
  keeps the time of the last list that the app read. `EndpointReadFailed`
  in the same file as the note draws the warning. Its caller gives it the
  Refresh button, so that the app gives the button its action. Agent call
  of the mockups, 13 November 2026. Reason: one read changes both lines,
  and the failed read is the line that a new read can change.
  An endpoint that serves its API but no model list that the app can read
  fails each read. Its row shows the warning after each save and Refresh,
  but a reload removes it, and its turns still work.
- **Get started.** The agent step of Get started shows the same list of
  the agents as the account page, so it shows the note and the warning
  too. The browser keeps the flags of the save and of Refresh beside the
  account data, so that the note and the warning stay when that step
  draws the list again. Agent call of
  the mockups, 13 November 2026. Reason: a user who connects Codex in Get
  started needs the note as much, and one list keeps one behaviour.
- **The Privacy date.** The change updates the effective date of the
  Privacy page to 13 November 2026, because its paragraph "Endpoint
  models" changed and the page says that a change updates its date. The
  Terms and `TERMS_VERSION` do not change. Agent call of 13 November 2026.
- **No stored failure mark.** The app stores no mark of a failed read, and
  a failed background read shows nothing, as today. Agent call of 13
  November 2026, which replaces the earlier agent call of the same day for
  a new nullable column of `agent_logins`. Reason: the Milestone 1 check
  showed that a stored mark keeps a warning that Refresh cannot remove on
  an endpoint that serves no model list. The warning after the reads that
  the owner starts matches Cal's choice C, and the change needs no
  migration. Cost: a key that stops working later shows no warning on the
  account page. Its turns fail with their own cause.


- **Reader result.** `EndpointModelsResult` has `ok`, with IDs,
  `http-error`, and `unreachable` states. A response with unreadable JSON,
  an incomplete list, or a failed body read counts as an HTTP answer.
  Agent call of the Milestone 3 implementation, 13 November 2026.
  Reason: the save needs to distinguish a failed HTTP answer from no
  answer, without keeping upstream error text.
- **Reply fields.** Endpoint saves return boolean `endpointV1Added` and
  `modelListReadFailed`. Native saves omit both. Refresh returns HTTP 200
  with `RefreshAgentLoginModelsResponse.modelListReadFailed`. It is true
  when no list was read, including a removed or native login.
  Agent call of the Milestone 3 implementation, 13 November 2026.
  Reason: one failed-read field serves both owner actions, and the save
  keeps returning only the host of the address.
- **Atomic save.** The existing login insert writes the new IDs, successful
  read time, attempt time, and a new attempt ID. It clears the old list
  when no read worked. The times use the save time after the reads.
  Agent call of the Milestone 3 implementation, 13 November 2026.
  Reason: the login and discovery metadata must become visible together,
  and the background claim must wait ten minutes after this attempt.
- **Fake hosts.** `v1-only.example.test` simulates a list only under `/v1`.
  `no-models.example.test` simulates failed reads for both agents.
  `modelList=v1-only` and `modelList=read-failed`, with `login=endpoint`,
  seed those hosts. Flags stay in replies, outside saved account data.
  Agent call of the Milestone 3 implementation, 13 November 2026.
  Reason: the next UI milestone can exercise both replies in development
  without storing a secret or a full address in the fake.
- **Gateway guide split.** The own endpoint details move from the gateway
  README into its linked `own-endpoints.md` page.
  Agent call of the Milestone 3 implementation, 13 November 2026.
  Reason: the README was at 299 lines before this implementation.

## Milestone 1: Mockups

Tags: mockup

Depends on: none

The account page gets two states of a Codex own endpoint row: the note
after a save that added `/v1`, and the warning after a failed model list
read.

- [x] Add the note state to the mockups of `app/account/own-endpoint`, or
      add a child page, with the text of the design. It is the state
      `v1-added` of `app/account/endpoint-models`, because
      `app/account/own-endpoint` already shows five screens, the limit of
      a page.
- [x] Add the warning state, with Refresh, for an own endpoint row of each
      agent. It is the states `read-failed` and `read-failed-unlisted` of
      `app/account/endpoint-models`.
- [x] Run `npm run mockups:check`. Smoke-test the changed pages.
- [x] Update the design and the TODOs of this plan for each problem that
      the mockups show.

## Milestone 2: Documentation and protocol

Depends on: 1

- [x] Update `docs/protocol/own-endpoint-logins.md`: the second read at
      the save of a Codex endpoint, the stored `/v1` base, the note, the
      warning, and the exception to the rule that the form shows the saved
      address. Keep the list of calls to the endpoint complete.
- [x] Update the public guide `src/marketing/docs/agent-logins.md` under
      "Connect an own endpoint". Read every public guide in full, and
      update each sentence that restates the changed facts. Line 123
      says that the hint shows the saved address, which changes.
- [x] Read the Terms page `src/marketing/terms.ts` and the Privacy page
      `src/marketing/privacy.ts` in full. Update each sentence that
      restates the calls to an endpoint.
- [x] Update `worker/model-gateway/README.md` and
      `src/app/account-screens.md`. Lines 36 to 38 of the account screens
      doc say that the hint shows the saved address, which changes.

## Milestone 3: Save and read flags

Depends on: 2

- [x] Add the second Codex read to the save in `worker/app-api/boot.ts`,
      before the encryption, and save the read list as the model list.
- [x] Add the flag for an added `/v1` and the flag for a failed read to
      `SaveAgentLoginResponse`, and the flag for a failed read to the
      Refresh response, in `src/shared/account.ts`. Update the fake API
      and the seeds.
- [x] Update the docs that describe the save and Refresh replies:
      `worker/app-api/README.md`, `src/shared/key-code.md`,
      `src/app/README.md`, and `src/app/dev-fake.md`. Check the save
      sentences of `worker/model-gateway/README.md` against the code. That
      README has 299 lines, so split it before it grows.
- [x] Add Worker tests: a base without `/v1` that only serves `/v1`, a
      base that serves both, a base that serves neither, a base that ends
      with `/v1`, a query on the base, a first read with no HTTP answer,
      Claude unchanged, Refresh that never changes the address, and the
      failed-read flag of the save and of Refresh.

## Milestone 4: Account page

Tags: ui

Depends on: 1, 3

- [ ] Show the note under the Codex row after a save with the flag, with
      `EndpointAddressNote` from
      `docs/mockups/src/components/settings/EndpointRead.tsx`, as
      `app/account/endpoint-models/v1-added` shows. Keep the flag beside
      the account data, so that the agent step of Get started shows it
      too.
- [ ] Show the warning under each own endpoint row whose save or Refresh
      returned the failed-read flag, until a reload, with Refresh, with `EndpointReadFailed` from the same file. Give it
      the Refresh button of the row, and take the words of Refresh from
      `endpointReadCopy.ts`, also in `src/shell/account/EndpointModels.tsx`.
      When the row also shows the models that the list leaves out,
      `EndpointModels` shows no Refresh, as
      `app/account/endpoint-models/read-failed-unlisted` shows.
- [ ] Add component tests for the note and the warning.
- [ ] Check the page in a browser with `npm run dev`.

## Milestone 5: Verification, commit, review, and pull request

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

- [ ] On `conductive.build`, connect Cal's proxy for Codex with the
      address without `/v1`. Check the note, the model list line, and one
      Codex turn.
