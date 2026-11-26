# Create PR or Add to merge queue: decisions

This file holds the dated decisions of the plan
[Create PR or Add to merge queue on the first step](create-pr-or-merge-queue.md).
A first step decision number is the item number of the brainstorm in
workspace `calummoore/pr-creation-or-merge-queue-selection-ifin`. The
pull request that completes the work deletes this file with its plan.

## First step decision 1: How a queue choice joins before a pull request exists

Cal chose D on 26 November 2026. He first answered "1 = ok" for B. He
then chose first step decision 4 B with the words "4 = B - then we can
make it part of the prompt", which moves this decision to D. First step
decision 3, when a pending join ends, applied only to B, so it lapsed.

- **A.** The browser tab waits for the pull request, then adds. Rejected:
  a closed tab loses the join with no message.
- **B.** The Worker stores a pending join and adds when GitHub reports the
  pull request. Rejected by Cal for D. It needs a new store, a trigger,
  and a pending line in the bar.
- **C.** The chat message carries a hidden "then join" mark. Not chosen.
  It works with older sandbox software and does not depend on the agent.
  D keeps a bar message free of any mark of the action, and it gives the
  tool of first step decision 4.
- **D.** The queue prompt tells the agent to open the pull request, then
  call the queue tool. Chosen. It reuses the agent turn and the tool of
  first step decision 4. The agent can skip the call. Older sandbox
  software has no queue tool until its next update. The queuer is the
  sender of the turn, as first step decision 6 says.
- Left out:
  - A Worker job that sends the prompt. The Worker does not know the
    session that the member saw last.
  - A pull request that the app opens through GitHub. The app cannot push
    local work outside a turn, and the agent's title and description are
    lost.
  - A queue entry without a pull request. Each queue step reads the pull
    request, so each step would need a new state. D gets the entry a few
    minutes later.
  - A standing queue mode on the branch. It would join again after a
    Remove from queue.

## First step decision 2: Where the app remembers the last choice

Open. It waits for Cal and blocks Milestone 4.

- **Severity:** Medium. **Effort:** Medium.
- **Root question:** Which last choice decides the face of the button, and
  where is it kept?
- **Background:** The account keeps member settings, such as the keys and
  the New workspace choice. Those docs rejected browser storage, because
  a new browser and the Mac app start from the default. The one memory of
  past use today, the last workspace of each org, stays in the browser by
  Cal's choice of 13 November 2026.
- **A.** One choice for each browser, in browser storage. Each browser
  and the Mac app start from Create PR. The Privacy page changes. Effort:
  Small.
- **B.** One choice for each account, on the server. This is the literal
  reading of the request. Effort: Medium.
- **C.** One choice for each account and each repository, on the server.
  Effort: Medium.
- **D.** One choice for each browser and each repository, in browser
  storage. The Privacy page changes. A browser can show an old Add face
  after the member changed habit on another device. Effort: Small.
- **E.** One choice for each account. Add shows as the face only in a
  repository where the org has used the queue. Once any member adds, the
  gate stays open. Effort: Medium.
- **Left out:** one choice for each member and workspace, because most
  workspaces reach the first step once, so the face would almost always
  show the default.
- **Recommendation:** C. A queued pull request can merge with no further
  click, so a habit from another repository or an old browser face must
  not choose Add. GitHub keeps the merge method of each member for each
  repository in the same way. The options check of 26 November 2026 added
  D and E and kept C.

## First step decision 4: An agent tool to add to the merge queue

Cal chose B on 26 November 2026, with the words "4 = B". This settles
option B of the follow-up item `plans/follow-ups/merge-queue-agent-tools.md`.

- **A.** No agent tools for the queue. Rejected.
- **B.** A tool that adds the calling workspace's pull request, as the
  member who sent the turn, with the write access checks of the app.
  Chosen.
- **C.** B, plus remove and re-order. Not chosen.
- Left out: a tool that acts as the workspace owner. The queue merges and
  restacks as the queuer, so one member's turn would make another member
  the merger.

## First step decision 5: Where the first step offers Add to merge queue

Open. It waits for Cal and blocks Milestones 2 and 5.

- **Severity:** Medium. **Effort:** Small.
- **Root question:** Which places of the app offer Add to merge queue on a
  branch without a pull request?
- **Background:** Decision 317 offers Add in five places: the bar, the row
  menu, the header menu, the palette, and a drag into the queue group. The
  bar sends its prompts to the session that the member saw last. The list
  has no way to send a prompt.
- **A.** The bar only. Effort: Small.
- **B.** The bar and the palette, as the palette already runs the commands
  of the bar. Effort: Small.
- **C.** All five places. The menus and the drag need a new way to send
  the prompt from the list. Effort: Large.
- **Left out:** None.
- **Recommendation:** B. Create PR already shows in the palette, so its
  alternative belongs there too.

## First step decision 6: The queuer when the prompt joins another turn

Open. It waits for Cal and blocks Milestone 2.

- **Severity:** Medium. **Effort:** Small.
- **Root question:** Who becomes the queuer when a member's queue prompt
  joins a turn that another member started?
- **Background:** On the org login, or while the starter shares a login,
  a message of another member joins the running turn. The turn keeps its
  first sender. The queue tool adds as that sender, so that sender becomes
  the queuer. The queue then merges with that member's stored token.
  Create PR already pushes and opens the pull request as that sender.
- **A.** Accept it. The docs and the tool text say that the sender of the
  turn is the queuer. Effort: Small.
- **B.** Offer the queue choice only while no turn of another member runs
  in the target session. This is a new gate. Effort: Medium.
- **Left out:** a queuer taken from the message that asked. It needs a
  mark on the message, which first step decision 1 left out.
- **Recommendation:** A. It matches Create PR, where the same sender
  already pushes and opens the pull request.

