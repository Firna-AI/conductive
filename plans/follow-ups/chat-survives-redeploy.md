# Check that chat survives a Worker deploy

- **Severity:** Medium. **Effort:** Small. **Confidence:** Medium. **Harder later:** No.
- **Kind:** Post-merge task.
- **Added:** 2026-11-17, from `calummoore/delete-outstanding-plans-status-f01f`, an open check of the deleted Boat-native remote workspaces plan (first deployment).
- **Location:** None.
- **Reason:** The check needs a deploy of the Worker while a real workspace waits for its runner, which no branch check can do.

- **Background:** A chat message that a member sends before the runner of the workspace connects waits in the Worker. A deploy restarts the Worker and its Durable Objects. The chat history, the event numbers, and the waiting message must survive the restart. No event may go missing, and no tab may show an event twice or out of order. Tests cover the restart with a local Worker, but nobody checked it against a real deploy.
- **Task:**
  1. Start or resume a workspace on a test deployment.
  2. Send a chat message before its runner connects.
  3. Deploy the Worker again.
  4. Check that the history is complete, that the event numbers continue with no gap and no repeat, and that the waiting message reaches the agent once.
- **Impact if no action:** A deploy can lose a waiting message or break the event order, and nobody sees it until a user reports it.
- **Needs:** A test deployment that can be deployed again during the check, and a real workspace with an agent login.
- **Done when:** After the deploy, the history and the event numbers are complete and in order, and the agent answers the waiting message once.
