# Measure deployed Durable Object idle usage

- **Severity:** Low. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Post-merge task.
- **Added:** 2026-11-10, from branch `calummoore/workspace-open-error`, a post-merge task of its change to hibernate workspace connections.
- **Location:** `worker/workspace.ts`, `worker/native-sockets.ts`, `worker/features/workspace-alarm.ts`, `worker/features/alarms.ts`, `worker/previews/socket.ts`, and the Durable Object metrics of the `WORKSPACES` namespace in the Cloudflare account of the Worker.
- **Reason:** This measurement needs the deployed change, real use, and read access to the Cloudflare metrics of the Worker account.

- **Terms:**
  - **Durable Object:** Cloudflare's service instance for one workspace, or for the Mac connection of one user. Both kinds use the `Workspace` class of the `WORKSPACES` namespace.
  - **Duration:** the billed wall-clock time of a Durable Object in GB-seconds. It counts while the object is active, or idle in memory but unable to hibernate.
  - **Bridge:** the socket pair of an open terminal or preview. Its browser socket in the workspace object joins an outbound socket to the cloud computer.
- **Background:**
  - On 9 November 2026, the free daily duration allowance ran out. Workers Paid restored access, but idle duration remained.
  - On 9 November 2026, the user chose native hibernation to reduce the idle duration.
  - The browser, runner, and Mac sockets now use the hibernation API. An object whose open sockets all use these three roles can hibernate between its alarms and requests.
  - The access checks keep their timing. So a connected object still wakes for a tab or runner check every 15 seconds. A Mac broker wakes for a session check at least every 10 seconds.
  - An open bridge keeps its workspace object active, because its outbound socket cannot hibernate. A request that waits keeps the object active too, such as a file read, a Mac settings reply, or a title model call.
  - The Mac broker is a separate object, so it can sleep while a workspace object stays active.
  - The namespace holds three kinds of object. A workspace object has the workspace ID as its name. A Mac broker has the name `devices:v1:user:<user ID>`.
  - The image coordinator of an org has the name `org-image:<org ID>`. `WORKSPACES.idFromName(<name>)` gives the object ID of each object.
  - Local Miniflare tests proved restoration and delivery through a forced wake. They measured no deployed duration, cost saving, or wake latency.
  - On 9 November 2026, the change kept the bridges as they are. An option that it did not select moves them into the stateless Worker. That option needs routing, isolation, and checks of long-lived Worker CPU time.
  - Separate proxy Durable Objects were left out, because they move the duration charge of a bridge instead of reducing it.
- **Task:**
  1. Choose individual objects and representative windows of equal length. For each one, record the object role, the object ID, the window, and the workload.
  2. Measure an idle workspace object with open tabs and a connected runner, and no terminal or preview.
  3. Measure an idle Mac broker with a connected Mac app.
  4. Measure a workspace object with active agent output.
  5. Measure a workspace object with an open terminal or preview.
  6. For each case, read the duration, the requests, and the storage reads and writes of that object. Keep them apart from the account totals and from unrelated objects.
  7. Keep the conditions of each comparison the same where possible, such as the number of tabs and connections.
  8. Convert usage to money only with the current official Cloudflare pricing. Give the date of that pricing.
- **Impact if no action:** The change keeps only local lifecycle evidence. Nobody knows the deployed saving, or which active work still costs duration.
- **Needs:**
  - The merged change on the test deployment. Each push to `main` deploys it, as `docs/automatic-deploys.md` says.
  - Read access to the Durable Object metrics of the Cloudflare account of the Worker. `CLOUDFLARE_ACCOUNT_ID` of the deploy environment names that account, as `docs/automatic-deploys.md` says.
  - The deploy token of that doc lists no analytics permission. So read the metrics in the Cloudflare dashboard, as a member of that account.
- **Done when:** A report gives each object role, window, workload, duration, request count, and storage activity. It keeps the observed values apart from the estimates. It states the bridge limit and each other idle blocker that it found. It claims no saving that it did not measure.
- **Related:** [verify-deployed-hibernation-compatibility.md](verify-deployed-hibernation-compatibility.md): the other post-merge task of the same change. The two tasks need no fixed order.
