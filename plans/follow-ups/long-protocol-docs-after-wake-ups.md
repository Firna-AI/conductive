# Eight protocol docs pass the length target

- **Severity:** Low. **Effort:** Medium. **Confidence:** High. **Harder later:** No.
- **Kind:** Fix after merge.
- **Added:** 2026-11-23, from branch `calummoore/agent-scheduling-wake-future-nlp0`.
- **Location:** `docs/protocol/agent-tools.md`, `docs/protocol/agent-instructions.md`, `docs/protocol/isolation.md`, `docs/protocol/tokens-and-secrets.md`, `docs/protocol/skill-mentions.md`, `docs/architecture/protocol-docs.md`, `docs/architecture/components.md`, `src/marketing/docs/sessions-and-chat.md`.
- **Reason:** A split moves many sections and links, which does not serve the wake-up change and is easier to review alone.

- **Category:** Docs or spec.
- **Background:** The `documentation` skill sets a target of about 250 lines for a protocol doc. The wake-up change added lines to these docs. Each was near or past the target before. The public guide `sessions-and-chat.md` has about 550 lines.
- **Problem:** Long docs are slow to read for agents and people, and each new change grows them.
- **Impact if no action:** Each later change to these areas reads and edits a longer doc.
- **Root question:** How do these docs return under the length target?
- **Options:**
  - **A.** Split each doc by topic into linked docs, update every link, and add the new docs to `docs/architecture/protocol-docs.md`. Effort: Medium.
  - **B.** Change nothing. Effort: Small.
- **Left out:** A shorter style for the same facts, because the docs already use Simplified Technical English.
- **Wider fix:** None. The `documentation` skill already sets the target.
- **Previous examples:** The wake-up change split `wake-ups.md` into `wake-ups-chat.md` and `wake-ups-delivery.md`.
- **Recommendation:** A. Each split follows the earlier pattern.
- **Action:** fix after merge, apply A, because the split does not serve the wake-up change.
