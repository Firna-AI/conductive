# One Allow settles the requests that its grant covers

Status: Active. On branch `calummoore/same-request-qlmr`, no pull request yet. The pull request that completes the work deletes this plan, as the `plans` skill says.

An agent asks for a secret with `run_with_secrets`. When no grant covers
the secret, the Worker makes a request, and a member answers it. The call
waits 90 seconds, and the request then becomes late. An agent often tries
again after that, so a second request for the same secret opens. Before
this change, an Allow on one request changed only that request. Each other
open request stayed open, and the member had to answer each one. A waiting
call stayed blocked until its 90 seconds ended. This change makes an Allow
also settle each other open request that the new grant covers. It does not
change Deny, and it does not change grants from Capabilities.

Contract owners:

- [Secret requests](../docs/protocol/secret-requests.md).
- The [secrets README of the Worker](../worker/secrets/README.md).

## Decisions

### 1. How one Allow treats the other open requests

Answered by the user on 17 November 2026: **A**.

- **Root question:** When a member allows a secret, which other open
  requests should that answer settle?
- **Options:**
  - **A.** Chosen. The Worker also allows every other open request whose
    secrets the new grants all cover. The scope of the grant sets the
    reach. A waiting call gets its values at once. One answer sends at most
    one late notice for each session, and none when a waiting call of that
    session gets the values.
  - **B.** A, and also grants from Capabilities: a workspace pre-approval
    and the all-agents mark. Rejected: each such write must reach every
    affected workspace, for a rare case.
  - **C.** No second request: a new call waits on the open request of the
    same secrets. Rejected: the card then shows an old command, and a late
    request waits again.
- **Left out:** A fix of the screen only, because the request stays open in
  the Worker. Change nothing, because it does not meet the goal.

### 2. Whether Deny also settles the other requests

Answered by the user on 17 November 2026: **A**.

- **Root question:** When a member denies a secret, should the other open
  requests for it also end?
- **Options:**
  - **A.** Chosen. Deny ends only its own request. A Deny judges one
    command, and the agent can ask again with a better reason.
  - **B.** Deny also ends every other open request of the same session
    that names only the denied secrets. Rejected: it can end a different,
    valid request.

## Design

- My call, 17 November 2026: an other request is covered when the
  answer's own grant reaches each secret that it asked for, in the session
  of the request. A grant from elsewhere, such as Capabilities, never makes
  a request covered. Reason: decision 1 A says the new grants all cover
  it, and the card and the late line must credit only grants that the
  member gave (review findings 2 and 4). A request that names a
  secret that is still not covered stays open and does not change. Reason:
  Allow on that request then gives the missing grant.
- My call, 17 November 2026: a settled request records the member who
  answered. Its lifetime is the lifetime of the answer when it asked for a
  value, and null otherwise. Reason: the card then names the grant that
  let it run, with the words that exist.
- My call, 17 November 2026: the late notice of each session goes on the
  answered request when that request is in the session and late. Otherwise
  it goes on the oldest late settled request of the session. A settled late
  request with no notice keeps the line "You answered." Reason: one line
  then starts one turn, and no new contract field is needed.
- The settle runs in the same chat operation as the answer, so a run call
  and a second answer cannot interleave.

## Milestone 1: Documentation and protocol

Depends on: none

- [x] Update `docs/protocol/secret-requests.md` with the rule of covered
      requests and the Deny rule.
- [x] Update `worker/secrets/README.md`.
- [x] Read the Terms page, the Privacy page, and each public guide in full.
      Update each sentence that restates the changed fact.

## Milestone 2: Settle the covered requests in the Worker

Depends on: 1

- [x] Add the settle of covered requests to the answer of a request.
- [x] Send at most one late notice for each session, and none when a
      waiting call of the session gets the values.
- [x] Deliver each notice that the settle starts.
- [x] Add Worker tests: a late request and a waiting request of one
      session, a request that is still not fully covered, a request of
      another session, and Deny.

## Milestone 3: Verification, commit, review, and pull request

Depends on: every other milestone

- [x] Run the targeted tests and the complete gate named in `AGENTS.md`.
- [x] Commit with Conventional Commits and push the branch.
- [x] Review the complete local diff against `origin/main` with the
      `implementation-review` skill after the push. Report the findings,
      then apply the fix rule: fix the `fix now` findings, record
      follow-up items under `plans/follow-ups/` for the rest, re-review
      once, and report.
- [ ] Delete this plan when the `plans` skill says, under "Deleting the
      plan".
- [ ] Open the pull request. Its description gives the decisions and the
      design calls of this plan with their dates, a permalink to this plan,
      and the follow-up items that the change adds.
