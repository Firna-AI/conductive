# Purple tint for merged pull requests

Status: Complete on `calummoore/untitled-v5`. The purple presentation and all bounded checks are complete. A fresh review found no findings. The final delivery preserves this snapshot, deletes the plan, and opens a pull request. Final CI is watched before the report.

## Request and scope

On 11 November 2026, the user requested: "merged should have a purple tint".
This selects the approach and authorizes this focused visual change.
The merged desktop bar and phone row use purple instead of neutral styling.
The main Continue action follows the existing rule that its tint matches the bar.
The app and its mockups use the same light and dark palette tokens.

The GitHub state, actions, member rights, labels, links, and layout keep their current behavior.
The protocol already requires a full-bar tint, neutral edges, an icon, and words.
The design guide holds the concrete color mapping.

## Design calls

- 2026-11-11: Name the tone, button tint, and CSS class `merged`. Reason: the state supplies the semantic role, independent of its exact purple shade.
- 2026-11-11: Give each scheme five merged tokens beside the existing tints. Reason: text, soft fill, border, and rest/hover button fills need one shared mapping.
- 2026-11-11: Match purple's visual weight to the existing tints. Reason: the new state belongs in the same palette and preserves the existing contrast targets.
- 2026-11-11: Give Continue the purple tint through the existing button theme. Reason: the main action of each tinted bar matches its state.
- 2026-11-11: Keep the message below the bar in its own state tone. Reason: a wait and an error retain their existing neutral and red meanings.
- 2026-11-11: Use Firna's existing disabled and busy button states with purple. Reason: the shared button already owns these interaction states.
- 2026-11-11: Record purple in the merged mockup rationale and design guide. Reason: the visual spec must show the chosen mapping.
- 2026-11-11: Update two existing tone expectations and add no test case. Reason: the current cases cover this reversible visual mapping.

## Milestone 1: Mockups

Tags: mockup
Depends on: none

- [x] Add the light and dark merged palette and button tint.
- [x] Update the merged mockup bar, phone row, and affected design guide.
- [x] Check both themes and viewports. Keep neutral structural edges.

## Milestone 2: Documentation

Depends on: 1

- [x] Confirm the existing protocol tint, icon, and neutral-edge rules still apply.
- [x] Check README, public-guide, and comparison facts. No further source change is needed.
- [x] Keep the two existing deferred tint records aligned with the new color.

## Milestone 3: App

Tags: ui
Depends on: 2

- [x] Apply the shared merged tint to the app bar, row, and Continue action.
- [x] Update the two existing tone expectations.
- [x] Run affected checks and visually inspect the actual merged state.

## Milestone 4: Delivery

Depends on: 3

- [x] Audit the diff, preserve current main, commit, and push.
- [x] Review against `origin/main` with `implementation-review`, and apply its fix rule.
- [x] Preserve the completed plan snapshot and delete this plan.
- [x] Open the pull request and watch all final-commit CI checks before reporting. Leave it open.

Evidence: `.context/merged-purple-tint/ui-report.md` and its linked screenshots and logs.

Review: `.context/reviews/calummoore/untitled-v5/round-1-review.md` reports no findings and no new problems outside the scope.
