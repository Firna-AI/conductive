# The city name shows in lower case

- **Severity:** Low. **Likelihood:** Common. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Outside the scope.
- **Added:** 2026-11-08, from the branch `calummoore/chat-title-rename`, which plans the workspace title from the first message.
- **Location:** `worker/lifecycle/create-request.ts:9`, the list `CITIES`, and `worker/lifecycle/workspace-data.ts:137`, which stores the city as the workspace name.
- **Reason:** The branch adds the title request and does not change how the Worker writes the first name of a workspace.

- **Source:** Implementation. **Category:** Product bug.
- **Terms:**
  - **City name:** the first name of a new workspace. The Worker picks it from a fixed list of cities, and the branch name uses it too, such as `calummoore/lisbon-7k2q`.
- **Background:** A new workspace starts with a city name until a title from its first message renames it, as `docs/protocol/workspaces-and-sandboxes.md` says under "Create a workspace". Since decision 146 C of 8 November 2026, a Workers AI model writes that title about a second after the send. The Worker keeps the cities in lower case, because the branch name uses them. It stores the same lower-case word as the workspace name. The mockups show the first name with a capital letter: the fixture `savedCarts` in `docs/mockups/src/fixtures/workspaces.ts` has `generatedName: 'Lisbon'`.
- **Problem:** The workspace list and the workspace header show `delft`, where the mockups show `Delft`.
- **Impact if no action:** A new workspace shows a lower-case name for about a second, unlike the mockups. The name stays after a failed title, after a first message with no text, and when the Worker has no title model set.
- **Root question:** How does the first name of a new workspace look in the app?
- **Options:**
  - **A.** Store the city with a capital first letter as the workspace name, and keep the lower-case city in the branch. Effort: Small.
  - **B.** Keep the lower-case name, and change the mockup fixture to `lisbon`. Effort: Small.
  - **C.** Store the name as it is, and make the web app capitalize the first letter of each name. Every name then changes, also a title that the agent wrote in lower case on purpose. Effort: Small.
- **Left out:** None.
- **Wider fix:** None. One value in one place sets the name.
- **Previous examples:** None found.
- **Recommendation:** A. It matches the mockups and keeps the branch name as the protocol says.
- **Action:** ask the user, because the choice decides which side of a mismatch between the mockups and the product is right.
