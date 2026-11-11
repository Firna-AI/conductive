# Check transcript copy in other browsers

- **Severity:** Medium. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Post-merge task.
- **Added:** 10 November 2026, from the session transcript copy plan on `calummoore/session-transcript-copy`.
- **Location:** The session tab menu in the test deployment at `app.conductive.build` and in the Mac app.
- **Reason:** This check needs the deployed feature and browsers outside the cloud Linux workspace.

- **Terms:** A never-shown tab is an open session tab whose chat has not been selected in the current browser visit.
- **Background:** Session tabs offer Copy concise transcript and Copy full transcript. The browser requests Markdown from the Worker. A pending clipboard item keeps the press active where supported. A fallback browser writes after the reply. If a write is refused, a second press can copy the kept text immediately for one minute.
- **Task:** In Safari, Firefox, and the Mac app, open a workspace with more than one session. Keep one session selected. Copy each detail level from another never-shown session tab. Paste the real clipboard text into an editor. Check the session title, source, messages and fold detail. Check that the shown tab stays selected. Check archived session copying too. If the first write is refused, press the same copy item again within one minute and check the pasted result.
- **Impact if no action:** Chrome and automated tests cover the implementation, but clipboard permission behaviour in the other supported hosts remains unverified.
- **Needs:** The deployed session transcript feature, a signed-in org member, Safari, Firefox, and the Mac app.
- **Done when:** Both copy kinds produce the expected Markdown in each host. Copying keeps the selected tab. Archived copying works. Record each result and any refusal/retry behaviour. File a specific defect for a failed case.
