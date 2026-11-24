# What the start-run records count

- **Severity:** Medium. **Effort:** Medium. **Confidence:** High. **Harder later:** Yes.
- **Kind:** Needs decision.
- **Added:** 2026-11-24, from branch `calummoore/own-computers-milestone-6-commands-over-7v7g` (pull request #679), review findings 4 and 9.
- **Location:** `worker/lifecycle/timed-provider.ts:62` and `docs/protocol/step-timing.md:57`
- **Reason:** Each option changes what the protocol says a record counts, and no recorded decision covers it.

- **Terms:**
  - **Start-run record:** one database row with the counts and times of one run of a workspace create or resume.
  - **Host connection:** the connection from each computer to the Worker, which now carries the commands of a start.
- **Background:** `docs/protocol/step-timing.md` says that a run record gives the count and the time of its provider calls, command polls, and database calls. Operators compare these records across Worker versions. Since Milestone 6 of the own computers plan, each host command call counts in the provider totals, and each host status read counts as a poll.
- **Problem:** The provider totals now hold host calls too. A host call that the machine object refused before a fallback also counts, so one command can count twice. The protocol still says "provider calls".
- **Impact if no action:** A reader takes host calls for provider calls, and the protocol and the code disagree.
- **Root question:** How should a start-run record count calls to the computer, now that a command can take the host path or the provider path?
- **Options:**
  - **A.** Keep the combined totals, and state in the protocol that they count each call to the computer except status reads. Effort: Small.
  - **B.** Keep the provider totals for provider calls only. Host status reads stay polls, and host command calls get no total. Effort: Small.
  - **C.** Store host calls and their time in their own fields, with an additive D1 migration. Effort: Medium.
  - **D.** Keep one combined total, but count each command once, under the path that ran it. Effort: Small.
  - **E.** C, with exact rules: the host fields count only the calls that the host served, a refused attempt counts as no call, and host status reads stay polls. Effort: Medium.
- **Left out:** Rename `provider_calls`: the previous Worker writes that column by name, and `migrations/README.md` forbids a rename.
- **Wider fix:** None.
- **Previous examples:** None found.
- **Recommendation:** E. Each total keeps the meaning of its name, also after the provider commands go.
- **Action:** ask the user, because each option changes `docs/protocol/step-timing.md`.
