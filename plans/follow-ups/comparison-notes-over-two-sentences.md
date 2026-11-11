# Six comparison notes have three sentences

- **Severity:** Low. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Outside the scope.
- **Added:** 2026-11-10, from branch `calummoore/from-conductor-timestamp-and-links`, while it added the rows of local Conductor features.
- **Location:** `src/marketing/from-conductor/areas/agents-and-chat.ts:48`, `src/marketing/from-conductor/areas/models-and-providers.ts:19`, `src/marketing/from-conductor/areas/terminal-scripts-and-previews.ts:5`, `src/marketing/from-conductor/areas/cloud.ts:33`, `src/marketing/from-conductor/areas/cloud.ts:75`, `src/marketing/from-conductor/areas/cloud.ts:142`.
- **Reason:** The six rows existed before that branch, and the branch did not change existing rows.

- **Terms:**
  - **Row rules:** the rules for each row of the comparison page, in `src/marketing/comparison.md` under "Change a row".
- **Background:** The public page `conductive.build/from-conductor` compares Conductor with Conductive, one row for each Conductor feature. Each row has a short note. The row rules say: "Write each note in one or two plain sentences, with at most 25 words."
- **Problem:** Six notes have three sentences:
  - `stop-retry-and-background-tasks`: "Stop ends a turn. Try again retries the latest failed turn. Background task controls are under consideration."
  - `codex`: "Codex works with an OpenAI API key. Access token support is in progress. ChatGPT sign-in has no committed delivery plan."
  - `workspace-terminal`: "Each workspace has one cloud terminal. It keeps running through connection drops. Terminal tabs are under consideration."
  - `computer-builds-and-rollback`: "Builds show live logs and history. A failed build keeps the last good image. Selecting an older image is under consideration."
  - `organization-environment-and-secrets`: "Admins set org environment variables and secrets. Saved values stay hidden in settings. Personal cloud variables are under consideration."
  - `sleep-and-wake`: "Cloud computers stop after 30 idle minutes. Files and sessions stay. Opening a stopped workspace resumes it."
- **Impact if no action:** The six notes stay longer than the rule allows. Their facts stay correct.
- **Root question:** How does each note of the page stay within the length that the row rules set?
- **Options:**
  - **A.** Rewrite each of the six notes in one or two sentences, with the same facts. Effort: Small.
  - **B.** Change the row rules to allow three sentences. Longer notes make the table harder to scan. Effort: Small.
  - **C.** Add a unit test that fails on a note with more than two sentences or 25 words. It adds a new check to the gate, so only the user can approve it. Effort: Small.
- **Left out:** Change nothing: it fails the goal, because the six notes keep breaking the rule.
- **Wider fix:** C, a detection fix. No structural fix exists, because a type cannot count sentences. C is blocked until the user approves a new check.
- **Previous examples:** None found. The six rows came with the page in pull request #129 (`8999b4b4`), which also added the rule.
- **Recommendation:** A. The rule is in force, and short notes keep the table easy to scan. C best protects the page from new long notes, but only the user can approve it.
- **Action:** fix after merge, apply A, because the rows are outside the change that found them.
