# Continue routes

This page belongs to [Continue](continue.md). It gives the routes of
Continue, their replies, their labels, and their errors.
[Continue](../../docs/protocol/continue.md) states the requirements.

## Routes

`workspacePaths` in [the shared contracts](../../src/shared/workspaces.ts)
builds both routes under `/api/orgs/:orgId/workspaces/:workspaceId`.
`continueRoute` in [`continue.ts`](../app-api/continue.ts) serves them
after the browser gate, beside the Archive route.

| Route | Method | Reply |
| --- | --- | --- |
| `/continue` | POST with `ContinueWorkspaceRequest` | 202 with `{ "state": "pending", "continueId": "<job ID>" }` |
| `/continue/:continueId` | GET or HEAD | 200 with a `ContinueWorkspaceResponse` |

- The request gives `expectedBranch`, the branch that the caller shows,
  and an optional `allowLocalWork` boolean for Continue anyway. Another
  body returns 400 `invalid_request`.
- A poll returns `pending`, `confirmation-required` with `branch`,
  `baseBranch`, and `localWork`, or `continued` with the updated
  `workspace` and the `eventNumber` of its update. A failed job returns its
  safe app error. HEAD returns the status with an empty body.
- Only the member who started a job can read it. An unknown or foreign job
  ID returns 404 `workspace_continue_unavailable`.
- A repeat from a branch that already continued returns the saved
  `continued` reply, and moves nothing.
- The workspace link of a `continued` reply uses the app origin of the
  request. No origin is saved in the job or in the events.
- The reply holds no fetch ID, token, command output, or GitHub error text.

## Labels

`continueRoute` passes each result of the workspace object through
`labelContinueResult` of [`continue-output.ts`](continue-output.ts), as
[Labels](continue.md#labels) says. The job keeps the real names.

- Only a `confirmation-required` reply and a `workspace_continue_failed`
  error get labels. The route reads the secret values of the sandbox only
  for these two results.
- Each other reply and error passes unchanged, with no read of the secret
  values. An example is a refusal of access, such as 404
  `workspace_not_found`.
- A `confirmation-required` reply gets `displayBaseBranch`, and its
  `localWork` gets `displayUncommittedFiles`: the label of each path of
  `uncommittedFiles`, in the same order. The `branch` of the question
  gets no label.
- `filterContinueResponse` of
  [the output fields](../../src/shared/output-fields.ts) leaves out the
  label when it equals `baseBranch`. It leaves out the list when each label
  equals its path.
- The route hides each secret value in the message of a
  `workspace_continue_failed` error, before it throws the error. The
  message of a clash names the real branches.

## Errors

| Status | Code | Cause |
| --- | --- | --- |
| 400 | `invalid_request` | The request body is not a `ContinueWorkspaceRequest` |
| 409 | `workspace_branch_changed` | The workspace is on another branch than the caller saw, or its binding changed |
| 409 | `workspace_turn_running` | A turn runs or stops in a session |
| 409 | `workspace_continuing` | Another Continue runs, or Archive waits for it |
| 409 | `workspace_not_merged` | The pull request of the branch is not merged |
| 409 | `workspace_continue_failed` | A phase failed, or Git refused the move |
| 409 | `sandbox_unavailable` | The workspace has no sandbox, or its sandbox or provider account changed |
| 404 | `workspace_continue_unavailable` | The job is unknown or belongs to another member |

The existing gate errors still apply, such as `workspace_not_found`,
`org_suspended`, and `workspace_archived`.
