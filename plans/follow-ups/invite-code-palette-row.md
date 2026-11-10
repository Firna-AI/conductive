# The palette has no row for the invite code

- **Severity:** Low. **Effort:** Small. **Confidence:** Medium. **Harder later:** No.
- **Kind:** Outside the scope.
- **Added:** 2026-11-10, from `calummoore/keyboard-shortcuts-settings`, the options check of the decision on the place of This Mac in the palette.
- **Location:** `src/app/palette/commands.ts` (the Account settings of the palette) and `docs/protocol/command-palette.md` (its Settings section)
- **Reason:** The gap is on `main`: the Invite code section came after the palette, and the keyboard shortcuts change does not touch it.

- **Terms:**
  - **Account group:** the second group of the Settings tab of the command palette. It holds a row for each section of the Account page.
- **Background:** The Settings tab of the palette lists the sections of the Account page, as `docs/protocol/command-palette.md` says. A later change added an Invite code section at the end of the General tab of the Account page (`src/shell/account/InviteCodeSection.tsx`). The Account group has no row for it.
- **Problem:** A search for "invite" finds only the Members row of the org settings. The protocol's phrase "the sections of the Account page" now misses one section, and no doc says why the palette leaves it out.
- **Impact if no action:** A person who looks for the invite code from the palette does not find it.
- **Root question:** How does a person reach the invite code from the palette?
- **Options:**
  - **A.** Add an Invite code row to the Account group, which opens the General tab, with the search words "invite", "code", and "link". Add it to the protocol and the mockup. Effort: Small.
  - **B.** Leave it out, and say in the protocol that the group leaves out the invite code, with the reason. Effort: Small.
- **Left out:** None.
- **Wider fix:** None. Each new section of the Account page is one choice.
- **Previous examples:** This Mac joined the Account group when the Mac app added its section.
- **Recommendation:** A. A person then finds every section of the page from the palette.
- **Action:** ask the user, because A adds a palette row that no requirement covers.
