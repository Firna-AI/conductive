# Open decisions of the universal Expo app

This file holds the open decisions of
[One Expo app for web, phones, and the Mac app](universal-expo-app.md).
The plan deletes this file with itself. Decisions 11 and 12 were added on
23 November 2026, after the user chose decision 1 F. The options check ran
on the same day. Its report is in
`.context/universal-expo-app/options-check.md`. It added option 11 C, and it
moved the recommendation of decision 11 from B to C. The user chose
decisions 7 to 10 on 23 November 2026. The plan records them. The user then
asked about CSS converters. The plan records decision 9 H, which the user
chose after that. Decision 13 was
added on the same day, from the answer to decision 10. A second options
check of the same day added 13 E and 13 F, and 9 F to 9 I. Its record is in
`.context/universal-expo-app/options-check-2.md`.

Terms:

- **Primary branch:** the integration branch of a plan. Workspace branches
  merge into it, and only it merges into `main`.

## 11. Choose how the work reaches main

- **Severity:** Medium. **Effort:** Small.
- **Source:** Design.
- **Category:** Process.
- **Location:** `.github/workflows/ci.yml:6`.
- **Background:** This plan has 28 milestones and takes months. Each merge
  to `main` deploys to production. 176 of the 433 commits on `main` since
  10 November change views or CSS Modules under `src/`.
- **Problem:** One branch for months conflicts with each change on `main`,
  and its review is too large.
- **Impact if no action:** The merge risk grows each day.
- **Root question:** How does each milestone reach `main` and production?
- **Options:**
  - **A.** Keep one primary branch of the plan. Nested workspaces merge
    into it. One pull request merges it to `main` at the end. Effort:
    Small.
  - **B.** Merge this plan to `main` first. Each milestone then gets its
    own nested workspace and pull request to `main`. Effort: Small.
  - **C.** Added by the options check. Keep one primary branch for
    integration, with the combined gate. When a group of milestones is
    ready, a pull request merges the primary branch into `main`. The plan
    stays for the later pull requests. The CI push trigger must name the
    primary branch. Effort: Small.
- **Left out:** A split into several plans, because C can merge any group
  early, and a second plan only adds a second record.
- **Wider fix:** None, because this item sets the process itself.
- **Previous examples:** Decisions 141 and 143 of
  `plans/boat-native-remote-workspaces.md`. On 8 November 2026 the user
  chose 143 A, which is this item's C, over 143 B, which is this item's B.
- **Related:** Every milestone waits for the answer. Decision 7 E relies
  on steps that reach production one at a time.
- **Recommendation:** C. You chose it for the same question in decision
  143, and it keeps a combined gate with small batches. The first
  recommendation was B.
- **Action:** ask the user, because it sets how months of work reach
  production.

## 12. Stop new HTML views during the port

- **Severity:** Medium. **Effort:** Small.
- **Source:** Review, from the options check.
- **Category:** Code structure.
- **Location:** `eslint.config.js`.
- **Background:** Each port milestone moves the views of one area to the
  shared views. Other work adds views each day. 176 of the 433 commits on
  `main` since 10 November change views or CSS Modules.
- **Problem:** Nothing stops a new view with HTML elements or a new CSS
  Module in an area that is already ported.
- **Impact if no action:** The port keeps growing, and ported areas fall
  back to HTML views.
- **Root question:** How does a ported area stay ported while other work
  changes it?
- **Options:**
  - **A.** Change nothing. Each port milestone also ports the views that
    other work added. Effort: Small.
  - **B.** Add a lint rule that rejects HTML elements and CSS Module
    imports in the folders of each ported area. Each port milestone adds
    its folders. Effort: Small.
  - **C.** Add a line to `CLAUDE.md` and the UI README that says new views
    in a ported area use the shared views. Reviews check it. Effort:
    Small.
- **Left out:** None.
- **Wider fix:** B. It catches every new HTML view in a ported area.
- **Previous examples:** Decision 3 B of the shared UI move in #661 added
  an ESLint rule that blocks app imports of `docs/mockups/`.
- **Related:** Milestone 9 ports the first parts.
- **Recommendation:** B. A rule catches each case, as the rule of #661
  does.
- **Action:** ask the user, because it adds a new lint rule, and the
  always-on rules reserve that choice for the user.

## 13. Check each pull request on the phones

- **Severity:** Medium. **Effort:** Medium.
- **Source:** Design, from the answer to decision 10.
- **Category:** Process.
- **Location:** `.github/workflows/ci.yml`.
- **Background:** On 23 November 2026 the user chose to release the phone
  apps with the Mac app, in `.github/workflows/release.yml`. That answer
  covers the release builds. The gate of each pull request runs on Linux
  today. About 30 to 80 pull requests merge on most weekdays, and most of
  them change no native code.
- **Problem:** No rule says whether a pull request must prove that the
  phone apps still build.
- **Impact if no action:** A change can break the phone apps, and the break
  shows only at the next release.
- **Root question:** Which checks find a change that breaks the phone apps
  before a release ships it, and which of them block a merge?
- **Options:**
  - **A.** Add no phone check. The release build finds each break. Effort:
    Small.
  - **B.** Add a job to the `Complete gate` that exports the iOS and
    Android bundles on Linux, with no keys, and type-checks `expo/`. It
    finds syntax errors, type errors, and imports that do not resolve. It
    finds no native error and no crash at start. Effort: Medium.
  - **C.** Do B. Also build both native apps when the Expo fingerprint of
    the native inputs changes. The fingerprint is a hash, which a cache key
    can use with no new CI permission. The iOS build runs on a Mac runner.
    A skipped build must still pass the `Complete gate`. Effort: Medium.
  - **D.** Build both native apps on each pull request. It finds each
    native build error, but it adds a Mac job of about 20 minutes and about
    $1.60 to each pull request. Effort: Medium.
  - **E.** Added by the options check. Do C, and also start the Android app
    in an emulator on Linux for each pull request. It reuses the last
    native build from a cache and puts the new bundle into it. A Maestro
    test checks the first screen. It finds a crash at start, a missing
    native module, and web-only code that runs on the phones. It adds about
    10 to 15 Linux minutes, and emulator jobs can fail at random. Effort:
    Large.
  - **F.** Added by the options check. Do C, but run the native builds in
    a separate workflow that does not block a merge, as the Mac app checks
    do. Only the export and the type check go in the `Complete gate`.
    Effort: Medium.
- **Left out:**
  - EAS Build or Xcode Cloud for the checks, because they test another
    build path than the release jobs.
  - A nightly build, because releases ship up to five times a day.
  - Native builds after each merge, because C finds the same breaks
    before the merge.
  - A device farm, because E finds crashes at start on Linux.
- **Wider fix:** E. It is the only check that runs the phone code before a
  release.
- **Previous examples:** The Mac app checks in
  `.github/workflows/desktop-ci.yml` and `desktop-mac-checks.yml`.
- **Related:** Milestone 22 waits for the answer.
- **Recommendation:** E. It runs the phone code of the shared views before
  each merge, and it adds only Linux minutes. The first recommendation was
  C.
- **Action:** ask the user, because it adds a new check to the gate, and
  the always-on rules reserve that choice for the user.
