# Mac commands

The Mac commands of the chat: the requests that an agent sends to the Mac
of the person who sent the turn, their answers in the Mac app, and the
settings that the Mac keeps. The chat shows the requests of each session.
The Mac app adds `ThisMacSection` to the account and `AllowAllBar` to the
top of the workspace. See [the chat](../README.md) for the whole chat.

## Use it in the app

`ThisMacSection` goes in the account, and `AllowAllBar` goes at the top of
the workspace. Mount them only in the Mac app, because a browser has no
Mac. Both read the Mac's settings through `useMacSettings(fetch)`. Call its
`refresh` from `onWorkspaceChange`, which follows each change of a Mac
command, so the bar shows the 15 minutes that an answer started.

```tsx
<ThisMacSection fetch={appFetch} viewport="desktop" />
const { controller, state } = useMacSettings(appFetch)
<AllowAllBar controller={controller} state={state} workspaceId={workspaceId} />
```

## Rules for this code

- The Mac commands load after the stream starts, and again after each
  `workspace.updated` event, because the Worker records one with each change
  of a request. Only the reply of the latest read applies. A failed read
  keeps the requests that show, takes away the choices, and shows Try again.
- A request that waits leaves its place in the chat and stays just above the
  composer, one compact message for each request. The requests share one
  region that takes at most 40% of the window, so the transcript and the
  composer stay in view. A long command or many requests scroll inside it,
  an edge that cuts a request fades, and the keyboard scrolls it from any
  control in it. Once a request has its answer, it is a card in its turn:
  after the items of the turn that came before the request, and before the
  end of the turn. The session log keeps the time of the first event of
  each item for that place. A card names its Mac by the name that the Mac
  app gave, or as the sender's Mac. A finished run shows its time from its
  start on the Mac, so the wait for the answer does not count.
- Each command and folder that the Mac runs or keeps shows through
  `LiteralText`, which owns its whitespace rules: line breaks, tabs, and
  repeated spaces show as they are. A line feed, and each character that
  does not draw as itself, such as U+00A0 or U+202E, shows a mark of its
  code point that CSS draws. So a wrap looks different from a line break,
  and the page text keeps the original characters. A hidden bidi control
  is isolated in its mark. A copy of a selection inside the literal gives
  the original text, because a native copy changes U+00A0 into a space.
  Any other copy stays native.
- Only a window whose pairing names the connection of the request gets Deny,
  Allow, and the menu of the other ways to allow. A browser, the Mac app of
  another Mac, and a replaced connection show the state only. The pairing
  IDs name a connection, and the Worker checks the session of the window.
  The menu is a popover in the top layer, which CSS anchors to the actions
  of its request, so the region of the requests never cuts it.
- An answer goes to the address of the `requestKey` of its record, which
  the Worker gives. The chat keeps the raw `requestId` for its own maps and
  never builds an address from it.
- An answer stays marked, and every choice of its request stays blocked,
  until the request changes or the pairing changes. A 202 reply only says
  that the Worker passed the answer to the Mac. A failed answer names its
  cause above the composer, except when the request no longer waits.
- `ThisMacSection` and `AllowAllBar` show the settings that the Mac keeps.
  One read or change of the settings runs at a time, in the order of the
  user's actions, so the Mac gets them in that order and the last reply
  holds every change. A failed change reads the settings again. The
  countdowns read the clock and the Mac's end time.
- Each control, Remove of one command or Stop of the 15 minutes of one
  workspace, keeps the result of its last change: done, done but not saved,
  or failed, with the cause that the Mac gave. The result stays through
  every read, a Mac that goes away, and a new pairing, until the next change
  of that control. A change that waited while the pairing changed never goes
  to the new pairing: it fails with its cause, and the user acts again.
  `ThisMacSection` lists the results under its lists. The bar keeps the
  result of a Stop after the 15 minutes end, and while 15 minutes run it
  hides only a Stop that the Mac made and saved. When a change that the Mac
  did not save or did not make took its row or its 15 minutes away, Try
  again on its result repeats the same change through the current pairing,
  only when the user presses it.

## Tests

Run `npm run test -- src/chat/device`. The tests drive the settings
controller on a fake Mac, and mount the parts with `mount` from
`src/test-support/`.

The layout of the requests needs a real browser. The Electron check
[`approval-region.spec.ts`](../../../desktop/tests/approval-region.spec.ts)
builds the development page, opens it in the window of the Mac app, and
checks the bound of the region, the composer, keyboard scrolling, and the
menu of Allow over the region. Build the Mac app first, then run
`npm --prefix desktop run test:electron -- tests/approval-region.spec.ts`.

### Key code

- `device-api.ts`: the routes and the readers.
- `device-actions.ts`: the reads and the answers of the chat.
- `placement.ts`: the place of each card in its turn.
- `PendingCommands.tsx`, `CommandChoices.tsx`, and `CommandCard.tsx`: the
  requests, their region, and the menu of Allow.
- `LiteralText.tsx`: each command and folder, exactly.
- `mac-settings.ts`: the reads and the changes of the Mac's settings for
  `ThisMacSection.tsx`, `SavedChoices.tsx`, and `AllowAllBar.tsx`.
- `settings-results.ts`: the result of each control, and its words.

### Related docs

- [Mac app](../../../docs/protocol/desktop-app.md)
- [Chat and events](../../../docs/protocol/chat-and-events.md)
- [Mockups](../../../docs/mockups/README.md): the visual spec.
- [Shared contracts](../../shared/README.md) and
  [browser fakes](../../test-support/README.md).
