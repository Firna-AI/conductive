# Continue routes

This page belongs to [Continue](continue.md). It gives the routes of
Continue, their replies, and their errors.
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
