# The chat development page copies the states

- **Severity:** Low. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Outside the scope.
- **Added:** 2026-11-26, from branch `calummoore/needs-input-at-the-composer-milestones-3-j8a8`, a problem outside the scope that the check of review finding 7 of round 1 found.
- **Location:** `src/chat/dev/dev-options.ts:86`, the `state` list of `choices`.
- **Reason:** The hand copy is on `main`, and the change that found it did not touch the workspace states.

- **Terms:**
  - **Chat development page:** the local page of the chat under `src/chat/dev/`, which uses sample data. Its address options, such as `state=input`, pick what it draws.
  - **Workspace state:** `working`, `input`, `unread`, `ready`, `starting`, `stopped`, `error`, or `archived`. Rust owns the type, and `ts-rs` writes it to `src/shared/generated/WorkspaceState.ts`.
- **Background:**
  - `choices.state` in `src/chat/dev/dev-options.ts` lists the eight workspace states by hand, with `ready` first. The first item of each list is the default of its option.
  - `choices` only `satisfies Record<keyof DevOptions, readonly string[]>`. `readOptions` gives the picked value to `DevOptions.state`, a `WorkspaceState`. So a misspelled state fails the typecheck, but a list that leaves out a state passes.
  - `src/shared/workspace-read.ts` builds `WORKSPACE_STATES` from a `Record<WorkspaceState, WorkspaceState>`, so it holds every state. The app development options already read it, at `src/app/dev/options.ts:194`.
- **Problem:** When Rust adds a workspace state, the chat development page does not offer it, and no check says so.
- **Impact if no action:** A developer cannot draw the new state on the chat development page until someone adds it by hand.
- **Root question:** How does the chat development page offer every workspace state?
- **Options:**
  - **A.** Build `choices.state` from `WORKSPACE_STATES`, with `ready` first, so that it stays the default. Effort: Small.
  - **B.** Keep the hand list, and add a type check that the list holds every `WorkspaceState`. Effort: Small.
  - **C.** Change nothing. A developer adds each new state by hand, as before. Effort: Small.
- **Left out:** None.
- **Wider fix:** A. One shared list then gives the states to both development pages.
- **Previous examples:** Commit `13e8ad7a8` of 6 November 2026 added `input` to this list by hand, after the Worker started to send that state.
- **Related:** None.
- **Recommendation:** A. The shared list already holds every state, so the page needs no edit for a new one.
- **Action:** fix after merge, apply A, because the hand copy is on `main` and outside the change that found it.
