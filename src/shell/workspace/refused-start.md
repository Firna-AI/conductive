# A refused start

This page is part of the [workspace screen](README.md) guide.

`WorkspaceScreen` reads `model.startError`. While the sandbox is stopped or
failed, a start error whose code is in `refusalCodes` of `SandboxNotice.tsx`
shows the refused bar and panels: "The sandbox can't start", with no
action. The bar shows the reason of the error. The codes are
`user_suspended` and `org_suspended`. Other start errors keep the stopped
and error notices. The header, the history, and the owner control stay.
The Resume action and its failure toast stay as they were.

The bar and the panels take one notice, so each panel gets the whole
refusal with its reason: `SandboxPanelState` is a `SandboxNoticeState` or
the wait of a start. These types have one owner, the mockups'
`src/components/workspace/sandboxNoticeState.ts`, which the app and the
mockups both import. A phone shows the bar only on the Chat tab. So on a
phone, the panels of Files, Terminal, and Preview show the reason
in place of "Your chat history is available.", as they show the action of
the bar. A desktop panel keeps its short text beside the bar.

A suspended org refuses each start, so its workspace shows the refused bar
of the org in any state but archived, also while the stop of its cloud
computer runs. The bar has the same words for the org list's suspension
and for an `org_suspended` refusal. An archived workspace keeps its bar,
and `ChatArea` puts the notice of the org above it. `sandbox-view.ts` holds
these rules. `WorkspaceContext.readOnly` tells each part that the
workspace takes no write: it is archived, or its org is suspended.
`ChatArea` gives it to the kept chat, which then shows its history
read-only. `WorkspaceContext.panel` gives each part the same panel state
as the screen, with the words of a refusal. [A suspended org](../../app/suspended-org.md) gives the other
screens.

`WorkspaceContext.onReassigned(workspace)` passes a confirmed new owner to
`model.reassigned`. A feature that composes the owner slot must call it
from the `onReassigned` of the owner picker.
[Starts, stops, and builds](../../../docs/protocol/operator-actions.md#starts-stops-and-builds)
states the refusal.
