# Transcript copy fails in the development app

- **Severity:** Low. **Likelihood:** Common. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Fix after merge.
- **Added:** 2026-11-10, from finding 2 of the session transcript copy review.
- **Location:** `src/chat/api/client.ts:72`, `src/app/dev/fake-services.ts:58`, and `src/test-support/fake-api.ts:132`.
- **Reason:** The gap affects development hosts only. Its direct fix reaches the shared fake API outside the feature diff.

- **Source:** Review.
- **Category:** Product bug.
- **Terms:**
  - **Development fake:** The in-memory API that serves the full web app during `npm run dev`.
  - **FakeApiServer:** The shared fixture API that answers requests without a development route.
  - **SessionMarkdown:** The shared builder of concise and full transcript text in `src/shared/transcript/session-markdown.ts`.
- **Background:** Each session tab offers Copy concise transcript and Copy full transcript. The full development app uses `createFakeServices` and `FakeApiServer`. The separate chat development page uses a stateful backend in `src/chat/dev/`.
- **Problem:** Neither the full app's development routes nor `FakeApiServer` answers the transcript route. Both copy actions reach HTTP 404 with `fake_route_missing`. The separate chat page handles the route in `src/chat/dev/dev-transcript.ts`.
- **Impact if no action:** Developers cannot copy a transcript from the full development app. Each attempt shows the copy failure toast.
- **Root question:** How can a developer copy a transcript on each development page that shows session tabs over the shared fake API?
- **Options:**
  - **A.** Answer the route in the full app's development fake alone. Other fixture hosts still lack it. Effort: Small.
  - **B.** Register both transcript replies for each session while building the shared fake workspace routes. This builds Markdown before any request and ignores later reply overrides. Effort: Small.
  - **C.** Share a transcript request adapter between the full app and the separate chat development page. This also shares request parsing and response construction. Effort: Medium.
  - **D.** Answer the route in `FakeApiServer.fetch` when a request arrives, after checking recorded replies. Build both details with `SessionMarkdown` from recorded sessions, history, models, and members. Read those replies directly so `requests` records only the copy. Document the support in the shared fake and app READMEs. Effort: Small.
  - **E.** Document that the full app's copy actions fail and direct developers to the separate chat page. The failure toast stays. Effort: Small.
  - **F.** Use the stateful `DevBackend` for the chat routes of all development hosts. It needs support for many workspaces, streams, clocks, and options. It replaces the recorded chat behavior documented in `src/app/README.md`, so it needs user approval. Effort: Large.
- **Left out:**
  - A fixed Markdown reply cannot match the chat that a developer compares with the copy.
  - Hiding the copy items makes product code depend on its fake host.
  - Forwarding to the local Worker fails because it has no fixture workspace data.
  - A test for every fake route would test the internals of the test harness.
- **Wider fix:** F. One stateful chat fake prevents each new chat route from needing a separate fixture implementation. It remains an optional wider change that needs approval.
- **Previous examples:** `dev-fake-new-workspace-chat.md` records the missing session-list route of a new workspace.
- **Related:** `workspace-dev-page-command-palette.md` records a separate crash that must be fixed before the workspace development page can exercise its chat menu.
- **Recommendation:** D. A request-time reply covers each shared fake host and lets explicit transcript replies take priority.
- **Action:** fix after merge, apply D, because the separate chat page provides a working development host and production copying works.

The independent check confirmed the source path from `src/main.tsx` through
`createFakeServices`, `routeFetch`, and `FakeApiServer.fetch`. The production
build uses `live-services.ts` and the Worker transcript route.

The shared fake currently has 49 recorded sessions. Option B would build 98
transcripts for each construction, although most consumers never request one.
Option D computes only the requested copy and respects later fixture reply
changes. Its metadata can still show the recorded workspace name after a
rename made only in the development fake.

The app README already limits `npm run dev` to the recorded chat load and
kept chat. Full transcript support there is not a production requirement.
Option E is therefore viable, but D gives a better development workflow.
The separate chat page remains the host for live writes and events.
