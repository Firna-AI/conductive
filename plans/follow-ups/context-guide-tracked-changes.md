# Guide says Changes never lists context files

- **Severity:** Low. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Outside the scope.
- **Added:** 2026-11-24, from branch `calummoore/object-memory-runner-report-limits-0m1g`, the guide half of review finding 18 of round 5.
- **Location:** `src/marketing/docs/sessions-and-chat.md:132`.
- **Reason:** The sentence reads the same on `main` before the runner file report limits change, and that change did not alter which files Changes lists.

- **Severity:** Low. **Effort:** Small.
- **Source:** Review.
- **Category:** Docs or spec.
- **Location:** `src/marketing/docs/sessions-and-chat.md:132`.
- **Terms:**
  - **Context folder:** The `.context/` folder of each workspace for notes, screenshots, and files of other sessions. Git ignores its files unless the repository already tracks them.
- **Background:** The guide says that Git ignores the files of `.context/` unless the repository already tracks them. The next sentence says "**Changes** does not list them." Changes lists every changed tracked file, so a tracked file under `.context/` shows in Changes. The runner test `crates/cnd-runner/tests/repository/paths_tests.rs:239` checks that case.
- **Problem:** The sentence covers tracked context files too, and for them it is wrong.
- **Impact if no action:** A member with tracked files under `.context/` can think that their changes are lost or hidden.
- **Root question:** How does the guide say which context files Changes lists?
- **Options:**
  - **A.** Write "**Changes** does not list the ignored ones." Effort: Small.
- **Left out:** Other wordings say the same fact. One sentence fixes it.
- **Wider fix:** None. The repository rules already ask guides to restate facts correctly.
- **Previous examples:** None found.
- **Related:** None.
- **Recommendation:** A.
- **Action:** fix after merge, apply A, because the sentence is on `main` and is outside the scope of the change that found it.
