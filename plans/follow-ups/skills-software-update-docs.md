# Skills docs omit automatic software updates

- **Severity:** Medium. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Fix after merge.
- **Added:** 2026-11-17, from PR #426, review finding 406 and its independent check.
- **Location:** `docs/protocol/org-skills.md:185`, `plans/org-skills-repository-trust.md:146` while that plan exists.
- **Reason:** The branch has used its two review fix rounds, and this wording does not change runtime behavior.

### 1. Skills docs omit automatic software updates

- **Severity:** Medium. **Effort:** Small.
- **Source:** Review.
- **Category:** Docs or spec.
- **Terms:**
  - **Runner:** The cloud-computer process that manages agents and starts the SDK helper.
  - **SDK helper:** The process that starts the Claude and Codex adapters.
  - **Org image:** The saved starting image used for new cloud computers.
  - **Repository trust:** An admin's proposed choice to permit automatic inline shell from the configured shared skills repository.
- **Background:** Conductive copies an org's shared skills repository into its cloud computers. The feature needs runner and helper software that supports org skills. Older released software loads no org skills. The proposed trust setting also needs updated software. Cal chose a trust setting on 2026-11-17, with trust off by default and a native Claude restriction for an untrusted source. The detailed trust design still needs approval.
- **Problem:** The skills contract says, "Each build of the org image installs the newest runner" and concludes that workspaces from a later image get skills. The proposed trust design says the behavior needs updated software "from a new org image build." Both omit automatic updates. The existing software contract installs updates at runner start and while idle. A new org image is not required for an existing cloud computer to get updated software. Building an image also does not update an existing cloud computer.
- **Impact if no action:** The trust protocol and public guide can repeat the false prerequisite. Members can rebuild images unnecessarily and still wait for their existing cloud computers to update.
- **Related:** `plans/follow-ups/claude-skill-inline-shell-setting.md` holds the chosen trust approach and the pending design approval. This wording correction needs no trust decision. The software delivery contract is already in force.
- **Root question:** What must the skills and trust docs say about older software, and which doc owns how updated software arrives?
- **Options:**
  - **A.** Correct the trust sentence to include automatic updates and image builds. Keep the separate requirement to refresh repository settings at cloud-computer start or resume. Cost: the delivery fact stays duplicated, and the existing skills sentence still omits automatic updates. Effort: Small.
  - **B.** State that trust needs updated runner and helper software. Link to the existing update contract for delivery details. Keep settings timing separate. Cost: the existing skills sentence still suggests an image-only path. Effort: Small.
  - **C.** Apply B. Also rewrite the older-runner sentence of the skills contract. State that older software gets no org skills and applies no trust choice. Link to `docs/protocol/sandbox-software.md#updates` for how updated software arrives. Correct the proposed trust wording before it is copied into requirements or guides. If its planning file has gone, correct the resulting trust contract instead. Cost: the correction reaches both places that repeat the false prerequisite. Effort: Small.
  - **D.** Remove the trust-specific software statement. Rely on the general older-runner contract. Cost: trust off appears to restrict every Claude skill without explaining that older software applies no trust choice. The image-only skills sentence also stays. Effort: Small.
- **Left out:** Requiring or recommending an org image build changes no existing computer and adds no trust protection. A new runner-version gate or product notice adds a rejection or behavior that no requirement requests. Leaving the text unchanged preserves the false prerequisite. The existing contract settles delivery, so a new delivery mechanism is unnecessary.
- **Wider fix:** None. The documentation rule already gives each fact one home. C follows it by linking to the existing update contract.
- **Previous examples:** `docs/protocol/repository-folders.md#the-context-folder` states its older-runner limit and links to software updates. `docs/protocol/port-previews.md` also links to software updates. `plans/follow-ups/production-runner-inventory.md` already explains automatic updates. Commit `6ba984926` added installation while idle.
- **Recommendation:** C, changed from the first review's B after the independent check found the same omission in the skills contract. C corrects both copies without changing software delivery or settings timing.
- **Action:** fix after merge, apply C, because the branch has used its two review fix rounds.

The correction must keep these facts separate:

- Updated software arrives under `docs/protocol/sandbox-software.md#updates`
  and `docs/protocol/agent-runner.md#the-agent-runner`.
- A changed skills source or trust setting applies at the next
  cloud-computer start or resume. An active computer can keep its old
  trust until it stops and resumes.
- An older released runner loads no org skills and applies no trust
  choice. It needs no new rejection or compatibility converter.

Read both legal pages and each public guide in full when correcting the
protocol. Update any sentence that repeats the same false prerequisite.
Validate changed Markdown links. Add no permanent test of doc prose.
