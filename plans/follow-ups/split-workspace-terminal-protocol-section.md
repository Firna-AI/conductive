# Workspace tools doc is too long

- **Severity:** Low. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Post-merge task.
- **Added:** 2026-11-18, from branch `calummoore/output-summary-f7sm`, the Markdown parser documentation milestone.
- **Location:** `docs/protocol/workspace-tools.md`, the Terminal section, and `docs/architecture/protocol-docs.md`.
- **Reason:** The user assigned the split after the merge. Protocol docs are outside the table implementation scope.

- **Background:** `docs/protocol/workspace-tools.md` has 409 lines. The documentation skill sets a target of about 250 lines for one protocol doc. The Terminal section is a separate area of requirements. The earlier split of `docs/protocol/temporary-tabs.md` from this doc gives the pattern.
- **Task:** Move the Terminal section to a linked protocol page, such as `docs/protocol/workspace-terminal.md`. Keep a short Terminal section in `workspace-tools.md` with a link to that page. Keep the `#terminal` anchor valid. Add the new page to `docs/architecture/protocol-docs.md`. Check incoming links and move section-specific links to the new page where needed. Keep every requirement and decision unchanged.
- **Impact if no action:** The doc remains above its length target. Readers must search one large page for the file and terminal requirements.
- **Needs:** The Markdown parser change merged. No new product decision is needed for this move of text.
- **Done when:** The Terminal requirements live on their own linked page. The tools doc keeps a working Terminal link. All relative links of the changed pages work. The move changes no requirement.
