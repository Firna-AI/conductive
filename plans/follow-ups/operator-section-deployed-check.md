# Check the operator section on the deployed app

- **Severity:** Low. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Post-merge task.
- **Added:** 2026-11-09, the post-merge task of the operator section plan on branch `calummoore/admin-section-brainstorm`.
- **Location:** `/operator` of the deployed web app, `GET /api/operator/overview` in `worker/operator/overview.ts`, and the production D1 database `conductive`.
- **Reason:** It needs the deployed change, an operator account in `OPERATOR_GITHUB_IDS`, and the production database.

- **Terms:**
  - **Operator section:** the pages at `/operator` of the web app, which only the people in the Worker setting `OPERATOR_GITHUB_IDS` open, as `docs/protocol/operator-section.md` says.
- **Background:** The operator section reads live counts from D1 each time it opens: the users, orgs, and workspaces with the new ones of the last 7 days, the running cloud computers, the workspaces by state, the new workspaces and users of the last 30 UTC days, and the five largest orgs. The tests ran with local D1 and fake providers only.
- **Task:**
  - Set `OPERATOR_GITHUB_IDS` on the deployed Worker to the numeric GitHub ID of the operator, if it is not set.
  - Sign in as the operator, and open `/operator`. Confirm that the rail shows Operator above the account.
  - Compare the totals and the workspaces by state with `npx wrangler d1 execute DB --remote --command "SELECT state, archived_at IS NOT NULL AS archived, COUNT(*) FROM workspaces GROUP BY 1, 2"` and a count of `users` and `orgs`.
  - Search one org by name, and open its page.
  - Sign in as a person who is not an operator, and confirm that `/operator` shows the not-found page.
- **Impact if no action:** A wrong count or a broken page on the real database stays unseen until the operator needs the page.
- **Needs:** The deployed change, an operator GitHub account, and access to the Cloudflare account of the app.
- **Done when:** The counts on the page match the D1 queries, the search finds an org, and a person who is not an operator gets the not-found page.
