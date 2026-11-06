# Members writes return the wrong refusal under a race

- **Severity:** Medium. **Likelihood:** Rare. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Fix after merge.
- **Added:** 2026-11-06, from PR #4, branch `conductor/boat-native-remote-workspaces-milestone-15a`, round 2 finding 6 and three new problems of its check.
- **Location:** `worker/members/membership.ts:52`, `worker/members/invites.ts:17` and `:33`, and `worker/members/ownership.ts:43`.
- **Reason:** it needs two changes at the same moment, and the SQL conditions still protect the data.

- **Terms:**
  - **Guarded write:** a members write whose SQL statement includes the permission and membership conditions, so that it changes nothing when they fail.
- **Background:** Each members handler reads the actor and the target first, then runs a guarded write. When the write changes nothing, the handler answers one fixed error.
- **Problem:** When a concurrent change removes the target or the actor's role between the read and the write, the handler answers the wrong error:
  - a removal or a role change answers 409 `last_admin`
  - `inviteOrgMember` answers 403 `admin_required` where the same request without the race gets 404 `org_not_found`
  - `cancelOrgInvite` answers 404 `invite_not_found` although the invitation exists
  - `reassignWorkspace` answers 404 `workspace_not_found` although the workspace exists
- **Impact if no action:** In a rare race, the admin sees a wrong reason, such as "make another member an admin first".
- **Root question:** How does every members write answer the true reason when its guarded write changes nothing?
- **Options:**
  - **A.** After a refused write, check the permission and the target again, and answer from those checks. Delete the pre-read at `membership.ts:52`. Effort: Small.
  - **B.** Return a typed outcome from the same SQL statement, with one error mapping for removals and role changes. Effort: Small.
  - **C.** Put the members commands in one queue for each org. Effort: Large.
  - **D.** One helper runs every guarded members write. When the write changes nothing, it runs the existing check functions again and answers their error. The keys, route, and deletion code already recheck this way. Effort: Small.
- **Left out:** None.
- **Wider fix:** D. No handler can turn a refusal into a fixed error without the checks.
- **Previous examples:** the rechecks in `worker/sandbox/keys.ts`, `worker/members/route.ts`, and `worker/members/deletion.ts`.
- **Recommendation:** D.
- **Action:** fix after merge, apply D, because it needs a rare race and the data stays safe.
