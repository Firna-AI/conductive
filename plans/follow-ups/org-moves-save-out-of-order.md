# Overlapping org moves save an older order

- **Severity:** Medium. **Likelihood:** Rare. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Fix after merge.
- **Added:** 2026-11-18, from branch `calummoore/follow-up-final-review-of-three-merged-o19k`, review round 1, finding 1. That branch ran the final review of pull request #293, merge commit `731b1077b`.
- **Location:** `src/app/org-list.ts:90` and `:101`, `src/app/app-model.ts:265`, `src/app/resource.ts:138`, `src/app/data-lifecycle.md:38`, `src/app/key-code.md:65`, and `src/app/app-model.test.ts:82`.
- **Reason:** The defect needs unusual timing, a reverse run of two overlapping moves, and the fix changes no API or stored data.

- **Source:** Review. **Category:** Product bug.
- **Terms:**
  - **Org rail:** the column of org tiles at the left edge of the app, in the person's own order.
  - **OrgList:** the browser store of the person's orgs and of the org moves that wait for an answer, in `src/app/org-list.ts`.
  - **AppModel:** the shared model of the app in `src/app/app-model.ts`, whose `moveOrg` starts each org move.
  - **Worker:** the Cloudflare Worker that serves the API of the app and saves each org move in the D1 database.
  - **Resource:** the client store in `src/app/resource.ts` for a server value that a screen shows, such as the workspace list or the settings.
- **Background:**
  - Each person keeps their own order of the orgs in the org rail. A phone shows the same order in the org switcher sheet.
  - Three inputs move an org. They are Alt and Up or Down on a focused tile, Move up or Move down in the tile menu, and a drag. On a phone, a long press in the org switcher starts the drag. Each input calls `AppModel.moveOrg` through `useOrgMove` in `src/shell/orgs/useOrgMove.ts`.
  - `AppModel.moveOrg` calls `OrgList.move` with a save that sends `PUT /api/org-order`. `putOrgOrder` in `src/app/org-writes.ts:41` builds the body. It holds the org ID as `orgId` and the place among the other orgs as `index`.
  - `OrgList.move` at `src/app/org-list.ts:81` shows the move at once. It calls the save at once, also while an earlier move waits for its answer. A failed save takes back only that move.
  - `OrgList.settle` at `src/app/org-list.ts:101` adds the saved moves to the confirmed list in call order. A saved move waits until each earlier move has its answer.
  - The Worker runs each move as one SQL `UPDATE` in `moveOrg` of `worker/members/org-data.ts:59`. The statement computes the new places from the rows at that moment.
  - The route at `worker/members/route.ts:68` answers HTTP 204 with no body. So the answer holds no saved order and no sequence.
  - `AppModel.openApp` at `src/app/app-model.ts:182` is the only caller of `OrgList.load`. So the app reads the order only when it opens, and no later read corrects the rail.
  - `Resource` sends the writes and saves of one value one at a time, each after the answer of the one before. Its private field `sending` and its method `queued`, at `src/app/resource.ts:63` and `:138`, do this.
  - `OrgList` does not use `Resource`. So the queue of `Resource` does not cover org moves.
- **Problem:** `OrgList` sends two overlapping moves at once, then confirms their successes in call order. The Worker can run the two requests in reverse order. The database then saves an older order than the rail shows, although both requests succeed.
- **Impact if no action:** After both saves succeed, the rail shows the order that the person chose. A reload, another device, or the Mac app then shows an older order. The person must move the org again.
- **Root question:** How does the saved org order match the order the person chose?
- **Options:**
  - **A.** Give `OrgList` its own send queue, so that each move goes out after the answer of the move before it. Each move still shows at once. A failure still takes back only that move. A request that does not answer holds the later moves. Add the regression that "What the fix of B needs" gives. Effort: Small.
  - **B.** Move the ordered sender of `Resource` into a shared helper in `src/app/`. Give each `Resource` and each `OrgList` instance its own helper. Both stores keep their immediate changes and their failure rules. Both stores then use one ordering mechanism. A request that does not answer holds the later sends of its store. Add the same regression. Effort: Small.
  - **C.** Make the Worker apply the moves of each client in the sequence that the client chose. Add a sequence to the request, stored state for it, and a compatible path for older clients. This reaches the client, the Worker, a migration, and the protocol doc. Effort: Large.
  - **D.** Make the API client in `src/app/api/client.ts` order the writes by default. Each write of one client goes out after the answer of the earlier write to the same method and path. All org moves use `PUT /api/org-order`, so they go out in order. This changes the timing of every write of the app, so each write path needs a check for long requests. It adds a second queue under the queue of `Resource`. It orders by path, but `src/app/data-lifecycle.md:82` orders by value, so it misses one value that changes through two paths. Effort: Medium.
- **Left out:**
  - Refuse a move while an earlier move waits: it breaks the requirement that each key press and menu item moves the tile at once.
  - Order the moves of a person in the Worker without a client sequence: two requests can swap before they reach the Worker. One Durable Object for each person is an example of this approach.
  - Refuse a move against an older saved order, such as by a version: overlapping moves from two devices must both apply, one after the other.
  - Build `OrgList` on `Resource`: B gives the same order with less change. `Resource` shows its confirmed changes under every write. So it needs a new mode to keep a new org after a saved move, as `src/app/data-lifecycle.md:42` requires.
  - Read the order after the moves end, and send the shown order again: it adds a round trip. Its sends still need ordered sends or a new request for the whole order.
  - Read the order again after each save: the read takes the older saved order in place of the person's latest choice.
  - Apply the successes in the order of their answers: an HTTP 204 answer does not tell in which order the database ran the moves.
  - Send the whole order in place of one move, without ordered requests: the older request can still save last.
  - Change nothing: the saved order can still differ from the chosen order.
- **Wider fix:** B. One shared sender gives both stores the same ordering. The private queue of `Resource` does not cover `OrgList`. D is a broader default, but it orders by path and not by value, so it does not prevent the class better than B.
- **Previous examples:**
  - Commit `2ce9adcdb` of 6 November 2026 added the save queue of `Resource`. Before it, two settings saves of one value could reach the server in reverse order. `src/app/settings-saves.test.ts` covers that case.
  - Commit `0e4390e65` of 13 November 2026 made `Resource.write` use the same queue. So two quick list writes of one value go out one at a time. Examples are two moves of a section, two moves of a workspace, and a collapse and then an open.
  - That commit reached `main` in the squash merge `f9c080465` of pull request #351.
  - On 13 November 2026, the user chose that fix. The writes and saves of one value go out one at a time, each after the answer of the one before. The message of `f9c080465` records the choice and its date. `src/app/data-lifecycle.md:82` to `:88` states the rule in force.
  - That fix deleted the follow-up items `plans/follow-ups/list-writes-save-order.md` and `plans/follow-ups/section-move-save-order.md`. Both stay readable at commit `2c915f82d`.
  - `OrgList` came on 12 November 2026, one day before the ordered sends, in merge commit `731b1077b`. The ordered sends changed only `Resource`, so `OrgList` kept its parallel sends.
- **Recommendation:** B. It removes the cause in the store that owns the value, with the per-value order that `Resource` already uses, at Small effort. It keeps the saved-order requirement and needs no new user decision. B also best protects the codebase, because one sender then orders both stores.
- **Action:** fix after merge, apply B, because the reverse run of two overlapping moves needs unusual timing, and the fix changes no API or stored format.

## The rules that the fix keeps

`docs/protocol/org-rail-order.md` states these requirements. The defect breaks the first one.

- "The order stays after a reload. The other devices of the person and the Mac app load the same order."
- "A move shows at once. When its save fails, only that move goes back, and a toast names the failure, as for a failed move of a workspace row."
- "Two moves that overlap, such as from two devices, give the order of the two moves one after the other." The Worker meets this rule for the moves in the order that they reach it.
- Move up and Move down in the tile menu each move the tile one place. Alt and Up or Down on a focused tile also move it one place.
- An org that the person creates or joins goes at the end of the rail.

`src/app/data-lifecycle.md` states two rules of the web app:

- Lines 38 to 43 give the `OrgList` rule. A saved move joins the confirmed list after the answers of the earlier moves. The doc says that a later new org then goes after it, "as on the server". That is true only when the server runs the moves in call order.
- Lines 82 to 88 give the ordered-send rule. The writes and saves of one value go out one at a time, each after the answer of the one before. Each write still shows at once. A failed write rejects only its own caller, and the next one goes. A request that does not answer holds the later ones of its value. Today the rule covers `Resource` values only.

The options rely on two earlier choices:

- On 13 November 2026, the user chose ordered sends for every `Resource` value. The user accepted the cost: a request that does not answer holds the later writes of its value.
- The change that added `OrgList`, on 12 November 2026, made an org move work like a write of the workspace list. The move shows at once over the confirmed list, and a failure takes back only that move. The writes of the workspace list go out in order since 13 November 2026. So the same reason covers org moves, and B needs no new user decision.

## Assumptions that the options share

- Each move shows at once, and a failed move goes back alone. `docs/protocol/org-rail-order.md` requires it, and its reason holds.
- The fix of A, B, and D lives in the web app. Installed copies of the Mac app bundle the web app, as `desktop/README.md` says. So an older copy keeps the defect until it updates.
- C keeps such copies too, because an older client sends no sequence. No Worker code alone can see the order of the person, because two requests can swap on the way to the Worker.
- In A, B, and D, a request that does not answer holds the later moves. A move that waits is lost when the page closes during the wait. The user accepted this cost for `Resource` values on 13 November 2026, and the same reason covers org moves.

## A counterexample with two Alt+Up presses

This is a static trace of the code. Nobody ran it. Here `firna`, `acme`, and `futex` stand for the IDs of the orgs Firna, Acme, and Futex.

1. The person has three orgs. The rail and the database both hold Acme, Futex, Firna.
2. The person focuses the Firna tile. The person presses Alt and Up. The rail shows Acme, Firna, Futex at once.
3. The app sends `PUT /api/org-order` with the body `{"orgId":"firna","index":1}`.
4. Before that request has its answer, the person presses Alt and Up again. The rail shows Firna, Acme, Futex at once.
5. The app sends `PUT /api/org-order` with the body `{"orgId":"firna","index":0}`.
6. The Worker runs the second request first. The database holds Firna, Acme, Futex.
7. The Worker runs the first request second. It puts Firna at index 1 among Acme and Futex. The database holds Acme, Firna, Futex.
8. Both requests answer HTTP 204. `OrgList.settle` confirms index 1, then index 0, in call order. The rail keeps Firna, Acme, Futex.
9. The person reloads the page, or opens the app on another device. `GET /api/orgs` returns Acme, Firna, Futex. The rail then shows that older order.

The result:

- The rail shows Firna, Acme, Futex after both saves.
- The database saves Acme, Firna, Futex.

More facts about the timing:

- A held Alt and Up key repeats the move, because `onKeyDown` in `src/shell/ui/useListMoves.ts:55` does not check `event.repeat`. So two moves overlap easily.
- The reverse run is still unusual. Before its write, each request reads the session and the app access from D1, at `worker/security/gate.ts:71` and `:80`.
- Two moves of different orgs can show the defect too, when the result depends on their order. Two moves of one org are the simplest case.

## Tests that miss the defect

- `src/app/app-model.test.ts:82`, "a failed org move takes back only that move, and keeps a later move and a new org", holds two moves at once. Its moves, Firna to index 0 and Acme to index 2, give the same order in either sequence. It checks the order that the app shows, not the order that the server saved.
- `src/shell/layout/RailMoves.test.tsx` waits with `settle()` between its two key moves, so the moves do not overlap.
- `src/shell/layout/RailDrag.test.tsx` and `src/shell/list/OrgSwitcher.test.tsx` make one move in each test.
- `worker/members/org-order.test.ts:118`, "composes overlapping moves using the rows at each write", tests the Worker alone. It checks that each move uses the rows at its write. It does not check that the server runs the moves in the order of the client.

## What the fix of B needs

- Move the private queue of `Resource`, the field `sending` and the method `queued`, into one shared helper file in `src/app/`. `Resource` keeps its behaviour.
- Give each `OrgList` instance its own helper. Send each save of `OrgList.move` through it.
- Keep these rules for both stores:
  - Each move shows at once, before its request goes out.
  - A failed move takes back only that move, and it rejects only its own caller.
  - The next move goes out also after a failure.
  - Each store instance keeps its own queue state. A slow request of one store does not hold the requests of another store.
- Update the `OrgList` rule in `src/app/data-lifecycle.md`, lines 38 to 43. It must say that the moves go out one at a time, as lines 82 to 88 say for `Resource`.
- List the new helper file in `src/app/key-code.md`, beside its entries for `org-list.ts` and `resource.ts`.
- Add a regression to `src/app/app-model.test.ts`, beside the rollback test at line 82:
  1. Hold the first `PUT /api/org-order` with `HeldRequests` from `src/app/test-kit.ts`. Hold only that request.
  2. Move Firna up one place, then up one more place, without a wait between the moves.
  3. Release the held request, and wait for both moves.
  4. Check that `server.requests` of the fake server holds the two moves in call order. `orgMoves` in `src/shell/layout/rail-test-kit.tsx` reads them.
  5. Check that a new `GET /api/orgs` to the fake server returns the order that the app shows: Firna, Acme, Futex.
- With the current code, both checks fail. The second move reaches the fake server first, and the fake server then holds Acme, Firna, Futex.
- A static trace shows that the rollback test at `src/app/app-model.test.ts:82` needs no change. `HeldRequests.release` opens its gate also before its request arrives. Nobody ran that test with the fix.
- Keep each assertion of the tests of the `Resource` queue:
  - `src/app/settings-saves.test.ts`: "an install save and a startup save go out one at a time, so the later save stays".
  - `src/app/settings-saves.test.ts`: "a failed save rejects its own caller, and the save after it still goes out".
  - `src/app/section-actions.test.ts`: "a failed collapse takes back only the collapse, and keeps a move and an update from its wait, which goes out after it".
- The fix changes no protocol doc, because `docs/protocol/org-rail-order.md` already requires the result.
