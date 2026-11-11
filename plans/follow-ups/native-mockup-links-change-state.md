# Native mockup links change the shown example state

- **Severity:** Medium. **Effort:** Large. **Confidence:** High. **Harder later:** No.
- **Kind:** Outside the scope.
- **Added:** 2026-11-11, from pull request #223, branch `calummoore/conductor-import-option`. It joins three observations outside the scope of its reviews: the shared member navigation of the review of 10 November 2026, the native Archive org tile of the supplementary review of 11 November 2026, and the native archived sidebar rows of a finding check of the same day.
- **Location:**
  - `docs/mockups/src/screens/ArchiveScreen.tsx:62-68`, which draws the Archived group with `WorkspaceListScreen` and the list `archived`.
  - `docs/mockups/src/screens/WorkspaceListScreen.tsx:266` and `:275`, where a native list keeps the default rail.
  - `docs/mockups/src/components/layout/OrgRail.tsx:109`, where a tile without `currentTo` opens the default page of the org, and `:198-204`, the Account link to `paths.account`.
  - `docs/mockups/src/components/workspaces/sections.ts:197-203`, `sectionsWithout`, which builds the other rows of a native Archived sidebar with `rowFor`.
  - `docs/mockups/src/components/workspaces/SidebarLinks.tsx:23`, the default Settings link.
  - `docs/mockups/src/components/settings/OrgSections.tsx:24-29`, `settingsLinks`, the admin pages of the settings tabs.
- **Reason:** Each case is on `main`, and any correction changes saved navigation of native mockups on `main`, which needs the user's approval.

- **History:** 2026-11-11, root integration record. The Location field now points to `16a4f76c`. The detailed static trace keeps its reviewed source citations. The reviewed Location field was:

> - `docs/mockups/src/screens/ArchiveScreen.tsx:62-68`, which draws the Archived group with `WorkspaceListScreen` and the list `archived`.
>   - `docs/mockups/src/screens/WorkspaceListScreen.tsx:266` and `:275`, where a native list keeps the default rail.
>   - `docs/mockups/src/components/layout/OrgRail.tsx:109`, where a tile without `currentTo` opens the default page of the org, and `:198-204`, the Account link to `paths.account`.
>   - `docs/mockups/src/components/workspaces/sections.ts:185-191`, `sectionsWithout`, which builds the other rows of a native Archived sidebar with `rowFor`.
>   - `docs/mockups/src/components/workspaces/SidebarLinks.tsx:23`, the default Settings link.
>   - `docs/mockups/src/components/settings/OrgSections.tsx:24-29`, `settingsLinks`, the admin pages of the settings tabs.

- **Source:** Review. **Category:** Mockup. A mockup finding has no likelihood grade.
- **Grade reasons:**
  - Severity is Medium. The defects show in saved examples of the visual spec. The same class in the import frames carried Medium.
  - Confidence is High. Static source traces show each step. No catalogue or browser ran.
  - Harder later is No. The fix stays in mockup files.
  - Effort is Large, the grade of C.
- **Terms:**
  - **Native frame:** a mockup screen that predates the Conductor import mockups and draws no Import from Conductor section.
  - **Org rail:** the narrow column at the left edge of the app that lists the orgs of the person. The tile of the current org and the Account avatar in it are links.
  - **Viewer:** the person and role that a mockup shows, such as Cal as an admin or Priya as a member.
  - **Mokly catalogue:** the mockup catalogue under `docs/mockups/`, which serves each saved example at its path, such as `app/org-settings/member`.
- **Background:**
  - The mockups in `docs/mockups/` are the visual spec of the product. A shared part of a frame links to a native default destination when its caller names none.
  - `docs/mockups/README.md:117-121` documents `LinkedControl`, which keeps a control static where no entry draws a matching screen.
  - The import mockups gave each control of an import frame a matching destination or kept it static, in commit `8be4ac2a`. [conductor-import-mockup-destinations.md](conductor-import-mockup-destinations.md) holds the rest of the import frames. Native frames kept their defaults, because a change overrides saved examples on `main`.
- **Problem:**
  - **The lifecycle state of the Archive example:**
    - `ArchiveScreen` draws the Archived group of Checkout address autocomplete with `WorkspaceListScreen` and the list `archived`, at `ArchiveScreen.tsx:62-68`. That list keeps the default rail, because `WorkspaceListScreen.tsx:275` replaces `currentTo` only for a list after an import.
    - A tile without `currentTo` opens the default page of its org, at `OrgRail.tsx:109`. So the tile of Acme opens the default list, where Checkout address autocomplete is active again.
    - A native Archived sidebar builds its other rows with `rowFor`, at `sections.ts:185-191`. Each row keeps its default destination, so a row such as Saved carts opens an example where the archived Checkout address autocomplete is active again.
  - **The viewer of the member examples:**
    - Saved member examples open admin examples through the shared frame.
    - Priya's avatar opens Cal's `app/account`, through the Account link at `OrgRail.tsx:198-204`.
    - The Repositories tab of `app/org-settings/member` opens the admin `app/org-settings/repositories`, through `settingsLinks` at `OrgSections.tsx:24-29`. The member variant `app/org-settings/repositories/member` exists.
    - The Settings link of the sidebar opens the admin settings, `paths.orgSettings`, at `SidebarLinks.tsx:23`.
    - Every member example on `main` uses this rule. A member example of the import only reuses it, and the import item above covers the import frames.
- **Impact if no action:** A reviewer who follows a shared link from a native example sees another lifecycle state or another viewer. The catalogue cannot show a stable state through that navigation. The product is not affected.
- **Evidence:**
  - The member case comes from a finding check of the review of 10 November 2026. The Archive tile comes from the supplementary review of 11 November 2026. The archived rows come from a finding check of 11 November 2026.
  - The import change does not change `ArchiveScreen.tsx`, `OrgSections.tsx`, `SidebarLinks.tsx`, or the native defaults of `OrgRail.tsx`.
  - These are static source traces. No catalogue, browser, or mockup build ran.
- **Root question:** How do the shared controls of a native mockup frame keep the lifecycle state and the viewer that the example shows, or stay static?
- **Options:**
  - **A.** Keep each shared control of a native frame static when no matching destination exists for its state and viewer, with `LinkedControl` or a null destination. Effort: Medium.
  - **B.** Name the matching destinations that already exist, such as the member Repositories variant and the archived list for the tile, and keep the rest static. Effort: Medium.
  - **C.** Give each native frame a context record, as the import frames get in [conductor-import-mockup-destinations.md](conductor-import-mockup-destinations.md). The record names the tile, the rows, the row Archive, the sidebar links, the settings tabs, and the Account destination, with no shared default. An unnamed destination stays static. Effort: Large.
  - **D.** Set a viewer and lifecycle marker that `ScreenLink` and `LinkedControl` honour, so that a link stays static unless the frame names its destination. It covers each present and future control, but it hides behaviour in a shared part. Effort: Medium.
  - **E.** Change nothing, and state in `docs/mockups/README.md` that shared links of native frames can open examples in another state. Effort: Small.
- **Shared assumptions checked:**
  - A link in a mockup keeps the shown state, or stays static. Source: the import design call of 10 November 2026 for import frames, and the catalogue role of the mockups. No rule states it for native frames. E drops it.
  - Native examples keep their saved navigation. Source: the safety rule against overriding functionality on `main`. A, B, C, and D drop it, so each needs the user's approval.
  - The defect is in the mockups only. Source: the code. Kept.
- **Left out:**
  - A check or a test over every catalogue link. A structural fix exists, and such a check is a test for the class or a new gate, which the user reserves.
  - An automatic rewrite of a catalogue address. No rewrite makes the destination draw the right state.
  - Remove the member examples or the Archive example. It deletes functionality on `main`, and it fails the goal.
- **Wider fix:** C. A context record with no shared default removes the native fallback for every native frame, as option K of [conductor-import-mockup-destinations.md](conductor-import-mockup-destinations.md) does for import frames. D is a marker form with hidden behaviour.
- **Previous examples:**
  - Commit `8be4ac2a` fixed the same class in the import frames: the phone header that returned to the native list, and the phone org switcher that dropped the import.
  - The review of 10 November 2026 left a viewer marker in `ScreenLink` out of its fix, because it would change native member examples on `main`.
  - [new-workspace-dialog-member-backdrop.md](new-workspace-dialog-member-backdrop.md) is the same viewer class, with another mechanism: a member dialog drawn over an admin backdrop.
- **Related:**
  - [conductor-import-mockup-destinations.md](conductor-import-mockup-destinations.md): a shared wider fix. Its context record serves the import frames now. C here applies the same owner to native frames. That item does not wait for this one.
  - [new-workspace-dialog-member-backdrop.md](new-workspace-dialog-member-backdrop.md): the same class of a member example that shows admin state. Its fix changes the backdrop, not the links. One mockup branch can carry both, with no conflict.
- **Recommendation:** C. One context record removes the native fallback for every native frame, as the import frames get. B is the smaller direct correction, if the user wants only the existing matching destinations.
- **Action:** ask the user, because every option that corrects these links changes saved navigation of native mockups on `main`, and the safety rules need the user's approval to override functionality on `main`.
- **Validation of the fix, after the answer:**
  - Run `npm run mockups:check`.
  - Do a one-time browser navigation check of the changed native examples on desktop and on a phone. Save its evidence under the ignored `.context/` directory. Add no permanent test or gate.
