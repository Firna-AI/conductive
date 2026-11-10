# The dev fake fails the chat of a new workspace

- **Severity:** Low. **Effort:** Small. **Confidence:** Medium. **Harder later:** No.
- **Kind:** Outside the scope.
- **Added:** 2026-11-08, from the report of Milestone 5 of the plan for the New workspace dialog, branch `calummoore/user-preferences-screen`.
- **Location:** `src/test-support/fake-workspace-routes.ts:113` and `src/app/dev/create-routes.ts`.
- **Reason:** the dev fake behaves the same on `origin/main`, and the branch does not change it.

- **Terms:**
  - **Dev fake:** the in-memory API of `npm run dev`, wired in `src/app/dev/`, which serves the web app without a Worker.
- **Background:** `npm run dev` serves the web app over the dev fake, as `src/app/README.md` says under "Run it". The fake API serves the session list of each workspace that it knows, in `src/test-support/fake-workspace-routes.ts`. A workspace that the user creates in the dev fake gets no such route.
- **Problem:** After a create in `npm run dev`, the new workspace shows "The chat didn't load", because the read of its session list fails.
- **Impact if no action:** A developer cannot see the chat of a new workspace in `npm run dev`, and can mistake the message for a bug of the change that they test.
- **Root question:** What does the dev fake serve for the chat of a workspace that it created?
- **Options:**
  - **A.** Serve the session of the first message for each workspace that the dev fake creates, as for the seeded workspaces. Effort: Small.
  - **B.** Say in `src/app/README.md` that the chat of a new workspace does not load in `npm run dev`. Effort: Small.
- **Left out:** A full chat backend in the dev fake, because the chat development page of `src/chat/dev/` already has a fake with state for live events.
- **Wider fix:** None. The item is one gap of a development tool.
- **Previous examples:** None found.
- **Recommendation:** A. The developer then sees the new workspace as a user does.
- **Action:** fix after merge, apply A, because the dev fake is outside the scope of the branch.
