# Remove the request path fallback of the authorizer

- **Severity:** Low. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Post-merge task.
- **Added:** 2026-11-20, from branch `calummoore/follow-up-launch-paths-lose-their-line-fdpt`, which fixes the follow-up item `plans/follow-ups/launch-path-line-breaks.md` with its option C.
- **Location:** `previewHandoff` in `worker/previews/launch.ts`, which reads the `path` field of the request. `redeemLaunchGrant` in `worker/previews/credentials.ts`, which returns the path of the grant. `worker/previews/launch-grant-path.test.ts` tests the legacy fallback. `worker/previews/launch-path.test.ts` tests the checks of request paths. The section "Launch paths" of `docs/protocol/preview-grants.md`. The paragraphs about the authorizer modes in `worker/previews/README.md`.
- **Reason:** Pages of a Worker before the fix need the fallback until a release holds the fix and the last grant of such a Worker ends.
- **Related:** [Preview paths fail while Worker versions overlap](launch-browser-rollout-compatibility.md) asks whether to keep both path senders for one release. Its answer can extend this removal task.

- **Terms:**
  - **Launch page:** the page on the app's hostname that posts a one-use grant to the authorizer in a form. The workspace object serves it.
  - **Authorizer:** the fixed hostname `authorize.<preview domain>`. It redeems a grant, sets the preview cookie, and sends the browser to the preview hostname.
  - **Authorizer page:** the page of the authorizer for a browser launch from the Mac app. It reads the grant, the hostname, and the path from the fragment of its address.
  - **Launch path:** the optional `path` query of a launch address. It names the HTML file that the preview opens.
  - **Previous Worker:** the Worker version that was live before a deploy, as "Migrations and the previous Worker" in `docs/automatic-deploys.md` says.
- **Background:**
  - A browser turns each lone CR and each lone LF of a form field into CR LF. So a launch path with a line break reached the authorizer changed, and the preview showed 404.
  - The launch-path fix of 2026-11-20 applies option C of its recorded follow-up action. The encrypted one-use grant holds its exact path. The authorizer sends the browser to the path of the redeemed grant.
  - The fix keeps the path out of the credential cookie. The launch page posts no path. The authorizer page keeps the path of its fragment only to check the reply, and it posts no path.
  - A valid path keeps each character, also a lone CR, a lone LF, CR LF, a tab, and a backslash. The authorizer checks the path of the grant with `isFilePath` before the redemption. The fix adds no other refusal or validation.
  - A grant of a Worker before the fix holds no path. Its launch page posts the path in the form body. Its authorizer page posts the path in the query of its POST.
  - The fix keeps a fallback for one release, as its task requires. For a grant that holds no path, the authorizer reads the `path` field of the request.
  - Both authorizer modes read the request fields from one `URLSearchParams`: the form body in form mode, and the query in header mode. So the fallback covers both kinds of old page.
  - The authorizer checks that field with `isFilePath` before the redemption. An invalid or repeated field gets the same 404 as an invalid grant, and the grant stays unused.
  - Old pages can post after the deploy of the fix. A workspace object can keep the previous Worker for some time after a deploy, and no doc gives an upper bound. "Effects on open pages" in `docs/automatic-deploys.md` describes these late restarts.
  - Each grant works for 60 seconds at most. So an old page can post until 60 seconds after a Worker before the fix issued its last grant.
  - After that time, only a launch without a path makes a grant without a path, and its pages post no path. So the fallback has no caller.
  - A hand-made request can still add a `path` field to such a grant. It opens a valid path on the same preview, which the holder of the grant can open anyway. So the removal is a clean-up, not a security fix.
- **Task:**
  1. Find the fix commit on `main`. It is the commit that deleted `plans/follow-ups/launch-path-line-breaks.md`. Run `git log origin/main --diff-filter=D --format='%H %cs %s' -- plans/follow-ups/launch-path-line-breaks.md`.
  2. Check the release condition. `git tag --list 'v*' --contains <fix commit>` must list at least one tag. Then one release holds the fix and its fallback, and the removal ships in a later release.
  3. Confirm that every instance of a Worker before the fix stopped issuing grants without a path. Find the time of its last grant. One possible source is the Workers Logs of the Worker in Cloudflare, if they show the Worker version of each launch request.
  4. Check the time condition. At least 60 seconds, the longest life of a grant, must pass after that last grant before the removal merges. The clock starts only after every such instance stopped.
  5. When a rollback puts a Worker before the fix live again, it issues grants without a path again. After that Worker stops, find its last grant again, and start the clock again.
  6. When a condition does not hold, or nobody can confirm it, keep the fallback and wait.
  7. In `previewHandoff` of `worker/previews/launch.ts`, stop the read of the `path` field of the request. Use only the path of the redeemed grant for the preview address.
  8. Keep each other check before the redemption: the method, the Origin, the content type, the body limit, the hostname, the grant, and the path of the grant.
  9. Ignore a `path` field that a request still holds. Do not refuse it, and remove its `isFilePath` check and its repeat check. Reason: the field then has no effect, and the fix chose to add no refusal.
  10. Keep the path of the fragment in the authorizer page, in `worker/previews/browser-launch.ts`, for its check of the reply.
  11. Change the fallback tests to show the new rule. A `path` field in the form body or in the query, with a grant that holds no path, opens the root of the preview hostname. Remove each test that only proves the fallback, under the removal rule of the `testing` skill.
  12. In "Launch paths" of `docs/protocol/preview-grants.md`, remove the bullet that starts with "For one release" and the "Reason" bullet after it. Change "The authorizer checks the path of the grant and a path in the request before the redemption" to "The authorizer checks the path of the grant before the redemption".
  13. In `worker/previews/README.md`, remove the fallback sentences from the paragraph about the request fields of both modes. Remove the check of the `path` field, also from the list of checks before the redemption.
  14. The change touches a protocol doc. So read both legal pages and every public guide in full, as `AGENTS.md` says. Update each sentence that restates the fallback.
  15. Delete this item in the same branch, and name it in the commit message.
- **Impact if no action:** The authorizer keeps a second source of the redirect path, which no real page uses after the deploy of the fix. The code, its tests, and a protocol rule stay, and each later change of the authorizer must keep them.
- **Needs:** The fix merged on `main`, deployed, and in a release. A way to confirm the last grant of each Worker before the fix, such as access to the Workers Logs of the Worker in Cloudflare.
- **Done when:** `previewHandoff` reads no `path` field of a request. The path of the redeemed grant is the only path of the preview address. A test shows that a `path` field in the form body or in the query changes nothing. `docs/protocol/preview-grants.md` and `worker/previews/README.md` state no fallback. This item is deleted. No status line links this item.
