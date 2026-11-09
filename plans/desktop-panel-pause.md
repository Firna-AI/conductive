# Hide the Desktop panel

Status: Active. On branch `calummoore/desktop-panel-disable`, no pull request yet. The user approved this plan on 9 November 2026. Implementation is in progress. The completing pull request deletes this plan.

Conductive shows the live screen of a workspace's cloud computer through its Desktop tool. The user reported unreliable operation and chose a temporary pause on 9 November 2026. The user then clarified: "don't remove everything, just hide from the user - as we will bring it back later".

The change hides Desktop throughout the shared web and Mac interface. It keeps the Desktop component, backend, stream transport, styles, fixtures, tests, and stored view format for its return. It adds no operator exception, deployment flag, app setting, or server rejection.

Contract owners:

- [Workspace tools](../docs/protocol/workspaces-and-sandboxes.md#tools-of-a-workspace).
- [Command palette](../docs/protocol/command-palette.md#actions).
- [Workspace screen](../src/shell/workspace/README.md).
- [Desktop tool](../src/desktop/README.md).
- [Mockups](../docs/mockups/README.md).
- [Marketing site](../src/marketing/README.md).

## Decision 1: Pause the unreliable Desktop panel

Chosen on 9 November 2026: **A**, with the user's clarification that the implementation stays for later use. The clarification narrows A to the app interface. It supersedes the earlier proposal to refuse new stream URLs at the server.

- **Severity:** Medium. **Effort:** Medium.
- **Source:** Design.
- **Category:** Docs or spec.
- **Location:** `src/shell/workspace/tools/tool-address.ts:14`, `src/shell/workspace/WorkspaceColumns.tsx:82`, and `src/shell/workspace/WorkspacePaletteActions.tsx:69`.
- **Terms:**
  - **Desktop:** The tool that shows the live screen of a workspace's cloud computer.
  - **Operator:** A person on the app's operator list.
  - **Deployment flag:** A server setting that controls feature availability.
- **Background:** Desktop opens from panel tabs, phone navigation, the command palette, direct links, and saved selections. The existing Desktop transport work is deferred. The user wants to hide the feature while keeping its implementation.
- **Problem:** The interface still offers an unreliable Desktop panel.
- **Impact if no action:** Users continue to reach this panel while its repair remains low priority.
- **Root question:** How should Desktop stay out of normal use for now?
- **Options:**
  - **A.** Hide Desktop for every user in code. Keep its implementation. Restoring it needs a code change. Effort: Medium.
  - **B.** Add a deployment flag with `off`, `operators`, and `everyone` modes. Default to `off`. This adds configuration and access behavior. Effort: Medium.
  - **C.** Show Desktop only to operators. This adds no setting, but operators still see the panel. Effort: Medium.
  - **D.** Add a switch in the operator dashboard. This adds stored app settings, a write endpoint, and a screen control. Effort: Large.
  - **E.** Do A with a developer variable that restores Desktop in a local build. This adds another build mode. The existing tools dev page already permits component testing. Effort: Medium.
- **Left out:** Tab-only hiding leaves other app entry points active. Immediate stream repair does not provide the requested pause. Deleting the implementation conflicts with the user's clarification. A server refusal exceeds the clarified interface scope. A paused notice keeps the panel visible. A preference or secret address fails the chosen audience of every user.
- **Wider fix:** A includes one interface availability rule for navigation and tool selection.
- **Previous examples:** PR #65 added the visible blocked-frame error. The existing operator section aligns its navigation with access. The two Desktop transport follow-ups remain deferred.
- **Recommendation:** Apply A as chosen and clarified by the user. The earlier brainstorm recommended B for optional operator testing.
- **Action:** fix now, apply A. The user chose the temporary interface pause and confirmed preservation of the implementation.

Plan options check on 9 November 2026 confirmed A. It added E and identified five routine corrections, which this plan includes. The report is in `.context/desktop-panel/plan-options-report.md`.

## Design calls

These calls were made by the agent on 9 November 2026 under the user's clarified scope.

- Keep known tool identities separate from the tools offered by the interface. One named availability constant feeds navigation, effective selection, and the selection save effect. Its comment links to the protocol's retention requirement. This prevents an omitted entry point and records intentional preservation.
- Pass availability from `WorkspacePaletteActions` through `WorkspacePage` to the palette action selector. The app layer then needs no import from the shell.
- Hide Desktop for operators as well as other users. This follows option A.
- Hide Desktop in the tools panel, phone tab bar, and command palette. A hidden tool must not mount through another app path.
- A saved Desktop selection renders Terminal without changing that stored selection. Keep `desktop` valid in the shared view type and the server's view parser. This avoids a migration and permits its later return.
- A direct Desktop link opens Terminal in the same workspace on both screen sizes. It must not mount Desktop or request a stream URL. It must not overwrite a saved tool merely because the hidden link opened.
- Keep the Desktop backend and its existing access behavior. The clarified request concerns the interface, so a new server rejection is unnecessary.
- Keep the standalone Desktop mockup and fixture as retained design work. Default navigation and public marketing pictures show the available tools.
- Keep `src/terminal/dev/ToolsDevPage.tsx` and the Desktop option in `src/shell/workspace/dev/dev-options.ts`. They support development of the retained component and the hidden-route fallback.
- Update current feature promises, rather than deleting Desktop's developer documentation. State that the tool is retained and hidden where that fact helps the reader.
- Keep both deferred transport follow-ups. Hiding the panel does not resolve their problems or require deployment changes.
- An installed Mac build gets the hidden interface only when that build updates. Record this release limit in the pull request. The server adds no restriction to an old client.
- Let the phone tab bar size its columns from the tab count. The old fixed five-column layout leaves a gap with four tabs. Keep the five-tab layout equivalent so Desktop can return without another layout change.
- Use a shared tools picture label that describes both crops. The phone crop excludes the tab bar, so its label names the terminal rather than tabs outside the picture.

## Milestone 1: Mockups and marketing pictures

Tags: mockup

Depends on: none

The visual spec shows Terminal and Preview as the available tools. It preserves the Desktop design for later work.

- [x] Update the tools and phone navigation in `docs/mockups/src/components/workspace/tools.ts` and the palette fixtures that offer Go to Desktop.
- [x] Let the shared phone tab bar fill its width at either four or five tabs. Check the five-tab layout once for equivalence.
- [x] Keep the Desktop screen variant and component. Mark its retained status outside the rendered product screen.
- [x] Update the marketing picture labels that promise Desktop. Capture affected marketing pictures with `npm run marketing:pictures`.
- [x] Run `npm run mockups:check` and visually inspect the tools, phone navigation, palette, and affected marketing pictures.
- [x] Update this plan's design and TODOs for any problem that the mockups reveal.

Completed on 9 November 2026. The parent checked the source diff, screenshots, retained variant, grid proof, and check logs. Evidence: `.context/desktop-panel/m1-report.md` and `.context/desktop-panel/m1/parent-mockups-check.log`.

## Milestone 2: Requirements and documentation

Depends on: 1

The docs describe the temporary interface pause and retain the Desktop backend contract.

- [ ] Read both legal pages in full before changing protocol facts. Update a legal sentence only if it restates a changed fact.
- [ ] Update the Desktop requirement in `docs/protocol/workspaces-and-sandboxes.md`. State the hidden entry points, Terminal fallback, and intentional retention of the implementation. Split a touched protocol page that exceeds the documentation skill's length target.
- [ ] Update the action list in `docs/protocol/command-palette.md` for the pause. Preserve the other palette requirements.
- [ ] Update the root, mockup, Desktop, and workspace READMEs where they describe available tools. Preserve the Desktop mounting and backend guidance for its return.
- [ ] Check current live references to Desktop in docs, plans, and READMEs. Preserve historical plan records and the two deferred transport follow-ups.
- [ ] Check every relative Markdown link changed by this milestone.

## Milestone 3: Hide Desktop throughout the app

Tags: ui

Depends on: 2

The shared app hides Desktop for every user. Retained Desktop implementation and test coverage stay in the repository.

- [ ] Add one named interface availability constant. Link its comment to the protocol's retention requirement. Pass its value to the palette through `WorkspacePage`. Add no configurable flag system or app-to-shell import.
- [ ] Apply it to panel tabs, phone tabs, and palette actions. Keep the Desktop identities, renderer, styles, fixtures, and tests.
- [ ] Apply it when resolving direct links and saved selections. Show Terminal without mounting Desktop or changing the hidden saved selection.
- [ ] Keep the shared view contract and server parser compatible with existing Desktop selections. Change no Desktop backend behavior.
- [ ] Update user-facing marketing text to describe the available tools.
- [ ] Update navigation and integration tests for hidden Desktop. Keep independent Desktop component and backend tests.
- [ ] Cover an existing saved Desktop selection and a direct Desktop link at the lowest existing test level. Cover both screen sizes where their navigation differs. Verify that neither requests a Desktop stream URL.
- [ ] Verify that Terminal and Preview still open. Use existing tests and regression cases rather than tests that mirror a constant.

## Milestone 4: Verification, commit, review, and pull request

Depends on: 3

The orchestrator checks the complete change and its preservation of the retained feature.

- [ ] Run the targeted app tests and the early format, lint, file length, and export checks from `AGENTS.md`.
- [ ] Run new asynchronous or browser regression tests ten times, as the testing skill requires.
- [ ] Smoke-test the app on both screen sizes with a normal account and an operator account. Save screenshots under `.context/desktop-panel/`.
- [ ] Confirm that the Desktop component, hidden mount in `ToolsPart.tsx`, handler, styles, developer pages, fixtures, tests, stored identities, and `go-to-desktop` command remain present.
- [ ] Map the changed Desktop assertions in `ToolsWiring.test.tsx:56-75` to the new hidden-interface behavior. Preserve the independent URL and frame-error coverage in `src/desktop/` and `worker/desktop/handler.test.ts`. Add no duplicate test when existing coverage protects the retained behavior.
- [ ] Install the desktop and runner check dependencies if needed. Run `npm run check` once on the complete implementation.
- [ ] Commit with Conventional Commits and push this branch. Record the approved UI removals and the retained Desktop implementation.
- [ ] Review the complete local diff against `origin/main` with the implementation-review skill after the push. Fix the confirmed `fix now` findings, record follow-up items for the rest, re-review once, and report.
- [ ] Delete this plan under the plans skill's completion rules.
- [ ] Open the pull request. Its description keeps this decision, the clarification, the design calls, and a permalink to this plan.

## Post-merge follow-up (non-blocking)

- [ ] Check the deployed web app and the next Mac build for the hidden Desktop entry points and the Terminal fallback.
