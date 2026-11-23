# Skills section comments carry decision labels

- **Severity:** Low. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Fix after merge.
- **Added:** 2026-11-18, from PR #426 on branch `calummoore/oslo-3u7a`, round 7 review finding 412 and its independent check.
- **Location:** `src/shell/settings/SkillsSection.tsx:79`, `src/shell/settings/ComputerTab.tsx:51`, `src/members/ComputerSections.tsx:209`.
- **Reason:** The skills change that added these labels had used its two review fix rounds, and this comment-only fix costs the same after the merge.

### 1. Skills section comments carry decision labels

- **Severity:** Low. **Effort:** Small.
- **Source:** Review.
- **Category:** Repository rule.
- **Location:** `src/shell/settings/SkillsSection.tsx:79`, `src/shell/settings/ComputerTab.tsx:51`, and `src/members/ComputerSections.tsx:209`. The full doc comments are at `SkillsSection.tsx:77-96`, `ComputerTab.tsx:48-57`, and `ComputerSections.tsx:207-215`.
- **Terms:**
  - **Skills section:** The part of the Cloud computer tab of the org settings where an admin saves one public GitHub repository of agent skills.
  - **Decision label:** A decision number in a comment, such as `decision 57` or `skills decision 2 A`. Each number names the dated record of one user decision.
  - **Protocol doc:** A page under `docs/protocol/` that holds the product requirements and the decisions in force.
  - **Mockup:** The visual spec of a screen, in TypeScript and React under `docs/mockups/src/`.
- **Background:**
  - An org admin saves one public GitHub repository of skills in the Skills section. The agents of every workspace of the org use its skills.
  - Three doc comments say who sees and changes this repository. They belong to the two `SkillsSection` components, for admins and for members, and to the admin Cloud computer tab.
  - Commit `6a50fc0b5` added the decision label `skills decision 2 A` to each of the three comments.
  - The shared `documentation` skill keeps dated decisions in the plan of a change, then in its pull request description.
  - A protocol doc holds the decision in force, and it can cite its number next to the requirement.
  - `docs/protocol/org-skills.md:89` cites `skills decision 2 A` next to the rule that only an admin changes the skills repository.
- **Problem:** The three comments carry decision labels. The `documentation` skill says: "A `README.md` or a code comment holds no decision number, decision status, milestone name, or branch status." The comment at `ComputerTab.tsx:51` also keeps an older `decision 57` in the same parenthetical.
- **Impact if no action:** The comments keep decision bookkeeping where the repository requires current facts.
- **Root question:** How do the three comments explain who changes shared skills without decision numbers?
- **Options:**
  - **A.** Remove the decision labels from the three changed comments. Remove the whole parenthetical in `ComputerTab.tsx`, including its older `decision 57`. Keep every permission and behaviour fact. Explain the org-wide effect in words, or link the relevant protocol requirement where useful. Effort: Small.
- **Left out:**
  - Keep the labels. This breaks the existing rule of the `documentation` skill.
  - Remove the useful descriptions. This loses context. The comments say what each part of the screen shows to whom.
  - Add a prose test. The `testing` skill gives doc prose no test.
  - B: add a custom check to `npm run check:static` that rejects a decision number in a code comment. Effort: Medium. The independent check proposed it as a detection wider fix.
  - B stays out. The `implementation-review` skill says: "When the wider fix for the class is already in force, such as a skill rule or an existing lint, say so and propose no other wider fix."
  - The `documentation` skill rule is in force for this class. B would also add a new lint, and a new lint needs the user's approval.
  - B would also need the older labels on `main` removed first, or an allow list.
  - Fewer than three approaches are real, because the rule already settles this prose cleanup.
- **Wider fix:** None. The `documentation` skill already supplies the rule for this class.
- **Previous examples:**
  - Commit `84f757685` added "for the reason of decision 57" to the doc comment of the Skills section mockup, in `docs/mockups/src/components/settings/SkillsSection.tsx`.
  - Commit `e714e5c72` replaced it with "because it changes the work of every agent of the org". The fixed comment is at `docs/mockups/src/components/settings/SkillsSection.tsx:133-135`.
  - Commit `e714e5c72` also edited the lines next to two of the product labels, at `SkillsSection.tsx:81-95` and `ComputerSections.tsx:210-214`. It kept those labels.
  - Class examples outside this item:
    - Commit `83d065ec61` added the unchanged `(decision 57)` comment at `src/members/ComputerSections.tsx:30`.
    - `src/shell/settings/MemberComputer.tsx:60` keeps `(decision 57)` from `main`. Commit `6a50fc0b5` only rewrapped that paragraph.
    - On `main` at commit `418026086`, a search found 88 comment lines in 71 product files that match `[Dd]ecision [0-9]+`.
    - The same search found five matching lines in four `README.md` files. Nobody read each line. These counts do not widen this item.
  - The older `decision 57` at `ComputerTab.tsx:51` is not such an example. It is inside one of the three changed comments, in the same parenthetical as a new label. So A removes it.
- **Related:**
  - `plans/follow-ups/skills-copy-status-in-app.md` has the same code. That later work shows the newest copy result of the org in the Skills section, to admins and to members.
  - That work will probably rewrite the doc comments of both `SkillsSection` components. The related follow-up holds its complete design.
  - No options conflict, and neither item waits for the other. The first later branch that edits these comments applies A, also when it is the copy-status work.
  - `plans/follow-ups/org-name-editor-stale-draft.md` has the same file. It records how a saved draft editor can lose an edit.
  - That item cites the doc comment at `SkillsSection.tsx:81-83`, but only for an option that it leaves out. Its fix changes other lines. No options conflict.
  - `plans/follow-ups/member-failure-notice-icon.md` has the same file, `src/members/ComputerSections.tsx`. It concerns the icon of a failure notice, which is other code. No options conflict.
  - `plans/follow-ups/decision-numbers-across-plans.md` is not linked. It asks how each decision gets a number that no other plan uses. This item removes labels, so it does not wait for that answer.
- **Recommendation:** A. It keeps the useful explanation and meets the existing rule. It also matches the fix that commit `e714e5c72` made in the mockup comment of the same section.
- **Action:** fix after merge, apply A, because the change that added these labels had used its two review fix rounds, and the fix changes no behaviour.

## Shared assumptions

- The `documentation` skill rule applies to these TypeScript doc comments. Source: the shared `documentation` skill, which the repository `CLAUDE.md` adopts. The reason holds. Kept.
- The labels add no permission fact. The protocol doc already holds each fact. Source: the code and the rule. The reason holds. Kept.
  - Commit `f13c1f370` deleted the plan that held the dated skills decision records. `docs/protocol/org-skills.md:14-16` says that the pull request keeps them after the merge.
  - `docs/protocol/org-skills.md:89-94` holds the decision in force, its reason, and the rejected alternatives.
  - Keeping the labels drops this assumption. That approach stays out.
- The facts of the three comments are correct, and they stay. Source: `docs/protocol/org-skills.md:89-101`. The check read the protocol text, not the permission code. Kept.

## Static evidence

1. The lines carry the labels.
   - `src/shell/settings/SkillsSection.tsx:79` has "Only an admin changes it (skills decision 2 A)".
   - `src/shell/settings/ComputerTab.tsx:51` has "(decision 57, skills decision 2 A)".
   - `src/members/ComputerSections.tsx:209` has "(skills decision 2 A)".
2. The skills change added the three labels in commit `6a50fc0b5`.
   - `src/shell/settings/SkillsSection.tsx` did not exist on `main` at commit `418026086`.
   - On that `main`, the `ComputerTab.tsx` comment had only "(decision 57)", at line 49.
   - The member `SkillsSection` function in `src/members/ComputerSections.tsx` was new.
3. The rule says what this item claims.
   - The `documentation` skill says: "A `README.md` or a code comment holds no decision number, decision status, milestone name, or branch status."
   - It permits a current code fact or a link to the protocol requirement.
   - It also says: "A protocol doc can cite a decision number next to a requirement." So `docs/protocol/org-skills.md:89` stays as it is.
   - The "Decision numbers" section of `docs/architecture.md` defines the numbers. It does not allow them in code.
4. The impact is a broken rule in three committed comments. No product behaviour changes.

## Facts that stay

- `docs/protocol/org-skills.md:89-91` states the rule. Only an admin changes the skills repository. Reason: a skills repository changes the work of every agent of the org.
- `docs/protocol/org-skills.md:95-101` states the read-only view. A member who is not an admin, and everyone in a suspended org, sees the repository as text.
- `SkillsSection.tsx:78-95` keeps every fact. Only an admin changes the repository, in the field. The rest of the comment describes the field, Save, the list, the notices, and the trust draft.
- `ComputerTab.tsx:49-56` keeps every fact. Only an admin builds and changes the builds, the scripts, the env vars, and the skills repository. Nobody does in a suspended org.
- `ComputerSections.tsx:208-214` keeps every fact. The section shows the repository as text, without a field or Save. It does so for a member who is not an admin, and for everyone in a suspended org.

## Implementation and verification

- Edit only the three doc comments. Change no code, test, protocol doc, or mockup.
- At `SkillsSection.tsx:79`, remove `(skills decision 2 A)`. Keep "Only an admin changes it".
- Where useful, add the reason in the words of the mockup: "because it changes the work of every agent of the org".
- At `ComputerTab.tsx:51`, remove the whole parenthetical `(decision 57, skills decision 2 A)`. Keep "which only an admin builds and changes" and "nobody in a suspended org".
- At `ComputerSections.tsx:209`, remove `(skills decision 2 A)`. Keep "for a member who is not an admin, and for everyone in a suspended org".
- Keep every other sentence of the three comments.
- A link is optional. `docs/protocol/org-skills.md#the-skills-section` holds the rule at line 89 and its reason at lines 90-91.
- If you add the link, check its path and its anchor by hand.
- Do not change `src/members/ComputerSections.tsx:30`, `src/shell/settings/MemberComputer.tsx:60`, or other labels on `main`.
- Add no test and no new check.
- Run `npm run format:check` and `npm run lint`. CI runs the complete gate on the pull request.
- Search the three files for `decision [0-9]`. Expect only `src/members/ComputerSections.tsx:30`, which stays.
- A later branch that rewrites these comments first applies A and deletes this item.

## Limits

- The checks were static reads at commit `5d5e49c4b0cf23cdc6b7e11a3a75883a139680a3`. No runtime reproduction, test, build, or probe ran. The fix changes comments only.
- The counts on `main` came from a pattern search on lines that start as a comment. Nobody read each line.
- The copy-status link is an inference from its detailed design, which still waited for approval. No copy-status code existed.
- The line numbers come from that commit. If they move, find the comments by the text `skills decision 2 A`.
- The older `decision 57` at `ComputerTab.tsx:51` is a label, not behaviour. Its removal keeps every fact, so the review judged that it overrides no functionality on `main`.
