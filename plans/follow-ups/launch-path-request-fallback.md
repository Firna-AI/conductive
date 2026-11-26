# Remove the request path senders and fallback

- **Severity:** Low. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Post-merge task.
- **Added:** 2026-11-20, from branch `calummoore/follow-up-launch-paths-lose-their-line-fdpt`, which fixes the follow-up item `plans/follow-ups/launch-path-line-breaks.md` with its option C.
- **Location:** `previewHandoff` in `worker/previews/launch.ts`, which reads the `path` field of the request. `previewLaunchPage` in the same file and `previewLaunchDocument` in `worker/previews/launch-document.ts`, which put the path in a hidden field of the launch form. The authorizer page script in `worker/previews/browser-launch.ts`, which adds the fragment path to the query of its POST. `redeemLaunchGrant` in `worker/previews/credentials.ts`, which returns the path of the grant. The two rollout regressions in `worker/previews/launch-rollout.test.ts`, with their helper in `worker/previews/browser-launch-test-support.ts`. The other tests of the senders and of the fallback, such as those in `worker/previews/launch-grant-path.test.ts`, `worker/previews/launch-path.test.ts`, `worker/previews/browser-launch.test.ts`, and `worker/previews/opening-page.test.ts`. `launchForm` in `worker/previews/launch-test-support.ts`. The section "Launch paths" of `docs/protocol/preview-grants.md`. The paragraphs about the launch form, the authorizer modes, and the authorizer page in `worker/previews/README.md`.
- **Reason:** The senders and the fallback must serve Workers before the fix for one release, and until the last grant of such a Worker ends.

- **Terms:**
  - **Launch page:** the page on the app's hostname that posts a one-use grant to the authorizer in a form. The workspace object, the Durable Object of each workspace, serves it.
  - **Authorizer:** the fixed hostname `authorize.<preview domain>`. It redeems a grant, sets the preview cookie, and sends the browser to the preview hostname.
  - **Authorizer page:** the page of the authorizer for a browser launch from the Mac app. It reads the grant, the hostname, and the path from the fragment of its address.
  - **Launch path:** the optional `path` query of a launch address. It names the HTML file that the preview opens.
  - **Previous Worker:** the Worker version that was live before a deploy, as "Migrations and the previous Worker" in `docs/automatic-deploys.md` says.
- **Background:**
  - A browser turns each lone CR and each lone LF of a form field into CR LF. So a launch path with a line break reached the authorizer changed, and the preview showed 404.
  - The launch-path fix of 2026-11-20 applies option C of its recorded follow-up action. The encrypted one-use grant holds its exact path. The authorizer sends the browser to the path of the redeemed grant.
  - The fix keeps the path out of the credential cookie. The authorizer page checks that the reply names the exact address of its fragment path.
  - A valid path keeps each character, also a lone CR, a lone LF, CR LF, a tab, and a backslash. The authorizer checks the path of the grant with `isFilePath` before the redemption. The fix adds no other refusal or validation.
  - A grant of a Worker before the fix holds no path. Its launch page posts the path in the form body. Its authorizer page posts the path in the query of its POST.
  - The fix keeps a fallback for one release, as its task requires. For a grant that holds no path, the authorizer reads the `path` field of the request.
  - Both authorizer modes read the request fields from one `URLSearchParams`: the form body in form mode, and the query in header mode. So the fallback covers both kinds of old page.
  - The authorizer checks that field with `isFilePath` before the redemption. An invalid or repeated field gets the same 404 as an invalid grant, and the grant stays unused.
  - The workspace object serves the launch page and the browser launch. The outer Worker serves the authorizer and the authorizer page.
  - During a deploy, a workspace object can still run a Worker before the fix. Its browser launch holds a grant without a path. So the new authorizer page must post the fragment path, or the authorizer returns the root.
  - During a rollback, a workspace object can still run the fixed Worker while the outer Worker runs an older authorizer. That authorizer reads the path only from the request. So the new launch page and authorizer page must post it.
  - A review of the fix branch reproduced the deploy failure with the real authorizer page and handlers. A grant of the older format, with the path only in its fragment, got the root as its address. The page refused it and showed "Preview not available", and the grant was used up.
  - On 2026-11-20, the parent orchestrator, the agent that coordinated the fix, made a design call. It is not a decision by the user, Cal.
  - The call keeps both path senders for one release: the HTML-escaped hidden `path` field of the launch form, and the fragment path in the query of the authorizer page's POST. For that release, it lifts the task rule of the fix that new pages post no path.
  - The sealed path still wins over a request path. The cookie still holds no path, and the authorizer page still checks the exact address. The call adds no format marker and no looser check.
  - The call did not choose three other ways:
    - A marker of the new format in the fragment, because it adds a field and a branch to the authorizer page.
    - A check of the authorizer page that also accepts the root, because the page could then go to an address that the reply does not name.
    - A new grant from the outer Worker for each older browser launch. It adds grant work to the shared route, and it misses the addresses that the previous outer Worker gave out.
  - Old pages can post after the deploy of the fix. A workspace object can keep the previous Worker for some time after a deploy, and no doc gives an upper bound. "Effects on open pages" in `docs/automatic-deploys.md` describes these late restarts.
  - Each grant works for 60 seconds at most. So an old page can post until 60 seconds after a Worker before the fix issued its last grant.
  - After that time, and without a rollback to a Worker before the fix, no reader needs a request path. The authorizer uses the sealed path of each grant with a path, and a launch without a path sends no path. So the senders and the fallback have no use.
  - A hand-made request can still add a `path` field to a grant without a path. It opens a valid path on the same preview, which the holder of the grant can open anyway. So the removal is a clean-up, not a security fix.
- **Task:**
  1. Find the fix commit on `main`. It is the commit that deleted `plans/follow-ups/launch-path-line-breaks.md`. Run `git log origin/main --diff-filter=D --format='%H %cs %s' -- plans/follow-ups/launch-path-line-breaks.md`.
  2. Check the release condition. `git tag --list 'v*' --contains <fix commit>` must list at least one tag. Then one release holds the fix with its senders and fallback, and the removal ships in a later release.
  3. Confirm that every instance of a Worker before the fix stopped issuing grants without a path. Find the time of its last grant. One possible source is the Workers Logs of the Worker in Cloudflare, if they show the Worker version of each launch request.
  4. Check the time condition. At least 60 seconds, the longest life of a grant, must pass after that last grant before the removal merges. The clock starts only after every such instance stopped.
  5. When a rollback puts a Worker before the fix live again, it issues grants without a path again. After that Worker stops, find its last grant again, and start the clock again.
  6. When a condition does not hold, or nobody can confirm it, keep the senders and the fallback, and wait.
  7. In `previewHandoff` of `worker/previews/launch.ts`, stop the read of the `path` field of the request. Use only the path of the redeemed grant for the preview address.
  8. Remove the hidden `path` field of the launch form from `previewLaunchDocument` in `worker/previews/launch-document.ts`. Stop passing the path from `previewLaunchPage` to it. Delete the HTML escape helper when nothing else uses it.
  9. In the authorizer page script of `worker/previews/browser-launch.ts`, stop adding the fragment path to the query of the POST. Keep the fragment path and the exact check of the reply.
  10. Remove the senders and the fallback in the same change. Both serve only the overlap with Workers before the fix, and the same conditions end that overlap.
  11. Keep each other check before the redemption: the method, the Origin, the content type, the body limit, the hostname, the grant, and the path of the grant.
  12. Ignore a `path` field that a request still holds. Do not refuse it, and remove its `isFilePath` check and its repeat check. Reason: the field then has no effect, and the fix chose to add no refusal.
  13. Change the tests to show the new rules. The launch form holds no `path` field, and the authorizer page posts no path. A `path` field in the form body or in the query, with a grant that holds no path, opens the root of the preview hostname.
  14. Remove each test that only proves a sender or the fallback, under the removal rule of the `testing` skill. The two rollout regressions in `worker/previews/launch-rollout.test.ts` are such tests. Delete their helper in `worker/previews/browser-launch-test-support.ts` when no other test uses it. Make `launchForm` in `worker/previews/launch-test-support.ts` match a form without a `path` field.
  15. In "Launch paths" of `docs/protocol/preview-grants.md`, remove the bullet that starts with "For one release" with its list, the bullet that starts with "For the same release", and the "Reason" bullet after them. Remove the list that starts with "These ways to keep the path while two Workers run together". Change "The authorizer checks the path of the grant and a path in the request before the redemption" to "The authorizer checks the path of the grant before the redemption".
  16. In `worker/previews/README.md`, remove the hidden value from the paragraph about the launch GET, the fallback and the senders from the paragraph about the request fields of both modes, and the query path from the paragraph about the authorizer page. Remove the check of the `path` field, also from the list of checks before the redemption.
  17. The change touches a protocol doc. So read both legal pages and every public guide in full, as `AGENTS.md` says. Update each sentence that restates the senders or the fallback.
  18. Delete this item in the same branch, and name it in the commit message.
- **Impact if no action:** The launch page and the authorizer page keep sending a path that no current reader needs. The authorizer keeps a second source of the redirect path. The code, its tests, and the protocol rules stay, and each later change of the launch must keep them.
- **Needs:** The fix merged on `main`, deployed, and in a release. A way to confirm the last grant of each Worker before the fix, such as access to the Workers Logs of the Worker in Cloudflare.
- **Done when:** The launch form holds no `path` field, and the authorizer page posts no path. `previewHandoff` reads no `path` field of a request. The path of the redeemed grant is the only path of the preview address. A test shows that a `path` field in the form body or in the query changes nothing. `docs/protocol/preview-grants.md` and `worker/previews/README.md` state no sender and no fallback. This item is deleted. No status line links this item.
