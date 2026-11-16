# Check the last active time on production

- **Severity:** Low. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Post-merge task.
- **Added:** 2026-11-16, from branch `calummoore/milan-mq6q`.
- **Location:** None
- **Reason:** The check needs the merged change on the deployment at `conductive.build`.

- **Terms:**
  - **Last active time:** the nullable column `users.last_active_at`. The Users tab of the operator section (`/operator/users`) shows it in its Last active column, and the page of a user shows it in Details.
- **Background:** The Worker records the time after a browser request that creates a workspace, or sends or sends again a chat message, at most once a minute. Migration `202611161200_user_last_active.sql` gives each existing user a first value from the newest workspace that the person created in the app, or no value. Agent tools and routines do not set the time.
- **Task:**
  1. As an operator, open `/operator/users` on `conductive.build`. Check that the Last active column shows a time of day for today, a day for an older time, or Unknown.
  2. Send a chat message from the app. Open the Users tab again. Check that your row shows the time of the message.
  3. Open the page of your user. Check that Details shows Last active with the day, the year, and the time of day.
- **Impact if no action:** A deployment problem, such as a migration that did not run, stays unseen until an operator needs the column.
- **Needs:** The merged change on `conductive.build`, and an operator account.
- **Done when:** All three checks pass, or a failure has its own follow-up item.
