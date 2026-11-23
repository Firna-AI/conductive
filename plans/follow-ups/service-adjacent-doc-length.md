# Existing service-adjacent docs exceed length targets

- **Severity:** Low. **Effort:** Medium. **Confidence:** High. **Harder later:** No.
- **Kind:** Outside the scope.
- **Added:** 2026-11-20, during services documentation on `calummoore/run-dev-servers-as-services-55oo`.
- **Location:** `docs/protocol/agent-tools.md`, `docs/protocol/sandbox-software.md`, `docs/protocol/repository-change.md`, and `worker/chat/README.md`.
- **Reason:** These files already exceeded their length targets, and splitting unrelated content is outside the approved services scope.

- **Terms:**
  - **Pointer section:** A heading that keeps an existing anchor and links to content moved to another page.
- **Background:** Protocol docs target about 250 lines. Other docs target about 200 lines and split above 300. The services change adds focused links and restatements to existing long pages.
- **Problem:** Before services, the three protocol pages had 251, 276, and 272 lines. The Worker chat README had 352 lines. After the documentation checkpoint, they have 257, 278, 272, and 364 lines.
- **Impact if no action:** Readers must scan several topics in each page. Later changes meet the same split requirement.
- **Root question:** How can these pages stay short while preserving their facts and links?
- **Options:**
  - **A.** Move cohesive topics to linked pages. Keep the facts and useful headings as pointer sections. Check relative links and inbound anchors. Effort: Medium.
- **Left out:** Dropping content loses requirements or entry points. Compacting lines hides the problem. A new Markdown gate needs approval and does not split the pages. Only the preserving split meets the existing rule.
- **Wider fix:** Already in force. The documentation skill defines content homes, short pages, and pointer sections.
- **Previous examples:** `worker/chat/key-code.md` and `worker/chat/access.md` already hold topics moved from the chat README. The protocol index links many child pages.
- **Related:** `plans/follow-ups/agent-instructions-doc-length.md` owns the same observation for the agent instructions protocol. This item does not duplicate that work.
- **Recommendation:** A. It gives each topic a short home and keeps each existing link useful.
- **Action:** fix after merge, apply A, because a structural cleanup of these existing pages is outside the services change.

Read each current page and its linked pages before choosing the split.
Preserve requirements, decisions in force, entry points, and anchors.
Keep requirements in protocol docs and mechanics in READMEs or source.
Do not add tests of prose or a new gate.
