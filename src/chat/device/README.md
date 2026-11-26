# Mac commands

The Mac commands of the chat: the requests that an agent sends to the Mac
of the person who sent the turn, their answers in the Mac app, and the
settings that the Mac keeps. The chat shows the requests of each session.
The Mac app adds `ThisMacSection` to the account and `AllowAllBar` to the
top of the workspace. The switch of Mac access of the Capabilities
control, in `src/shell/capabilities/`, reads and changes the same
settings. See [the chat](../README.md) for the whole chat.

## Use it in the app

`ThisMacSection` goes in the account, and `AllowAllBar` goes at the top of
the workspace. Mount them only in the Mac app, because a browser has no Mac.
The This Mac tab of the account mounts `ThisMacSection`, and only the Mac
app shows that tab. It reads the Mac's settings through
`useMacSettings(client)`. Give it a stable `ApiClient`, such as
`AppServices.api`, because a new client makes a new settings controller.

`WorkspaceMacBar` in `src/shell/workspace/` mounts `AllowAllBar` at the top
of the workspace. It shares one settings controller with the switch of
the Capabilities control and with the notice of a new workspace: `ThisMac`
of [`this-mac.ts`](../../shell/mac/this-mac.ts), one for each Mac app
window and person, which `useThisMac` gives. So a start from the switch or
from a create shows on the bar at once. In a browser, `useThisMac` gives
`null`, so the bar and the notice draw nothing, the control shows no Mac
access part, and none of them sends a request.
`WorkspaceMacBar` opens this controller for its first read of the
settings. That read also gives the current grant after a seeded workspace
stream opens at its cutoff.
`WorkspaceMacBar` calls `refresh` after the `workspace.updated` events of
the workspace stream, which follow each change of a Mac command, so the bar
shows the grant that an answer started. One burst of events, such as
the stored history, gives one read.

```tsx
<ThisMacSection client={services.api} viewport="desktop" />
const mac = useThisMac() // null in a browser, which draws no bar
const state = useThisMacState(mac)
<AllowAllBar controller={mac.controller} state={state} workspaceId={workspaceId} />
```

## Rules for this code

- The Mac commands load after the stream starts, and again after each
  `workspace.updated` event, because the Worker records one with each change
  of a request. Only the reply of the latest read applies. A failed read
  keeps the requests that show, takes away the choices, and shows Try again.
- A request that waits leaves its place in the chat and stays just above the
  composer, as a compact message in the stack of the open requests, with
  the secret requests, as [the chat README](../README.md#the-request-stack)
  says. The stack shows one card at a time and takes at most 40% of the
  window, so the transcript and the composer stay in view. A long command
  scrolls inside the outline of the card, an edge that cuts it fades, and
  the keyboard scrolls it from any control in it. A window that cannot
  answer a command puts it after the requests that it can answer. Once a
  request has its answer, it is a card in its turn:
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
  Command cards and approval requests use shell syntax colours from the file viewer.
  Folder paths stay plain.
- Only a window whose pairing names the connection of the request gets Deny,
  Allow, and the menu of the other ways to allow. A browser, the Mac app of
  another Mac, and a replaced connection show the state only. The pairing
  IDs name a connection, and the Worker checks the session of the window.
- The menu of the other ways to allow opens in the top layer, on
  `PopoverSurface` in `src/shell/ui/`, beside the actions of its request.
  So the stack of the requests never cuts it. It opens above the actions
  when it fits there, else on the side with more room, and it follows them
  when the card scrolls. A narrow request puts its actions under the
  command. The menu then starts at the actions and keeps inside their width.
- An answer goes to the address of the `requestKey` of its record, which
  the Worker gives. The chat keeps the raw `requestId` for its own maps and
  never builds an address from it.
- An answer stays marked, and every choice of its request stays blocked,
  until the request changes or the pairing changes. A 202 reply only says
  that the Worker passed the answer to the Mac. A failed answer names its
  cause above the composer, except when the request no longer waits.
- `ThisMacSection` lists each always-allowed command through
  `AllowedCommand`. A long command shows its first three lines, and its
  last shown line fades out. Show all shows the whole command, and Show
  less makes it short again. A command that fits shows no button. The
  whole text stays in the page, so a screen reader and a copy get all of
  it. A change of the width measures the command again.
- `CommandCard` shows the output of a finished run through
  `CommandOutput`, with the same rules: long output shows its first ten
  lines, its last lines fade out, and Show all and Show less open and close
  it. Output that fits shows no button. `useClipped` in `use-clipped.ts`
  measures both.
- `ThisMacSection` and `AllowAllBar` show the settings that the Mac keeps.
  One read or change of the settings runs at a time, in the order of the
  user's actions, so the Mac gets them in that order and the last reply
  holds every change. A failed change reads the settings again. A read
  again that fails, for another cause than a Mac that is not available,
  keeps the settings that show as kept settings, the state `kept`, which
  are not current. `ThisMacSection` and the bar still show kept settings,
  with Remove and Stop, because a grant that they list may still run. The
  countdowns read the clock and the Mac's end time. A grant whose end time
  is `null` runs until Stop, and shows Until you stop.
- Each control, Remove of one command or the grant of one workspace, keeps
  the result of its last change: done, done but not saved, or failed, with
  the cause that the Mac gave. Stop and Keep until I stop share the control
  of the grant, so only one of them waits at a time. The result stays through
  every read, a Mac that goes away, and a new pairing, until the next change
  of that control. A change that waited while the pairing changed never goes
  to the new pairing: it fails with its cause, and the user acts again.
  Only the change that holds its control ends it and keeps its result. So
  a change that the page took back never frees the control from a later
  change of that control, and keeps no result.
  `ThisMacSection` lists the results under its lists. The bar keeps the
  result of a Stop after the grant ends, and while a grant runs it hides
  only a change that the Mac made and saved. A Stop that the Mac made and
  saved shows on the bar for 5 seconds from the time that the controller
  stamps on its result, so a new mount of the bar does not show it again. When a Stop that the Mac did
  not save or did not make took its row or its grant away, Try again on
  its result repeats the same change through the current pairing, only
  when the user presses it. A failed Keep shows only while its 15 minutes
  run, so the bar never repeats a Keep.
- The switch of Mac access of the Capabilities control reads the same
  settings, and only the Mac app shows it (Mac access decision 7). It is
  on only while the current settings list a grant until Stop of the
  workspace, so it is off while the 15 minutes run. Its switch-on sends the
  settings action `start-workspace-until-stop` with the workspace ID. That
  action is not the approval answer `allow-workspace-until-stop`, which
  answers one request. Its switch-off sends Stop. A start is done or
  failed, never done but not saved, because the Mac keeps a grant until
  Stop only in memory. With kept settings, or with no settings, the switch
  shows off and disabled, with This Mac is not available, because a grant
  that kept settings list may have ended.
- While a change of the grant waits, the switch shows the grant that the
  change ends with. A waiting start or Keep shows it on, so a switch-off
  can take that change back. A waiting Stop or Extend shows it off, and
  the switch takes no switch-on, because a start does not go while
  another change of the grant waits.
- The page starts a grant from the switch, and after a create of New
  workspace whose switch was on. Each start goes through `changeOnCurrent`,
  which reads the pairing and the settings of this Mac first, so the start
  reaches the connection of now. When the read finds no Mac or fails, the
  start fails as not reached, and nothing goes.
- A switch-off, `ThisMac.stop`, never waits. It takes back each change of
  the grant that waits and increases the grant: a start, a Keep, or an
  Extend. It uses `cancel`. Such a change never goes, also after the read
  that it waits for. It keeps no result, also when it already went to the
  Mac, and its control is free at once. Then the Stop goes through the
  settings that show, current or kept, also when they list no grant,
  because a change that the page took back may already be on its way to
  the Mac. The Stop then reaches the Mac after it.
- `countedOutcome` counts a start as done only when the returned settings
  list its grant with no end. Otherwise the start fails with a cause.
- A start shares the control of the grant of its workspace with Stop and
  Keep, so each keeps the result of the last of them. The switch shows a
  start that failed, and the result of a Stop. The bar never shows the
  result of a start. A start that failed after a create also shows as a
  notice over the composer of the new workspace, with Try again, until the
  next start from the switch or the next Stop.
- The Worker checks that a start names an existing workspace that is not
  archived and belongs to an active org of the member. The stored Mac
  access field does not gate starts or Mac command requests.

## Tests

Run `npm run test -- src/chat/device src/shared/transcript/command-placement.test.ts`. The tests drive the settings
controller on a fake Mac, and mount the parts with `mount` from
`src/test-support/`. The tests of the switch, of a switch-off while a
change waits, of a Mac that the page cannot read, and of the start after a
create mount the whole app in the Mac app: run `npm run test --
src/shell/capabilities/MacAccessSwitch.test.tsx
src/shell/capabilities/MacAccessSwitchOff.test.tsx
src/shell/capabilities/MacAccessWithoutMac.test.tsx
src/shell/new-workspace/NewWorkspaceMacGrant.test.tsx`.

The layout of the requests needs a real browser. The Electron check
[`approval-region.spec.ts`](../../../desktop/tests/approval-region.spec.ts)
builds the development page, opens it in the window of the Mac app, and
checks the bound of the stack, the composer, keyboard scrolling of a long
command in its card, Next, and the menu of Allow over the stack. Build the Mac app first, then run
`npm --prefix desktop run test:electron -- tests/approval-region.spec.ts`.

### Key code

- `device-api.ts`: the routes, through the app's `ApiClient`, and the
  readers.
- `device-actions.ts`: the reads and the answers of the chat.
- [`command-placement.ts`](../../shared/transcript/command-placement.ts):
  the place of each card in its turn.
- `PendingCommands.tsx`, `CommandChoices.tsx`, and `CommandCard.tsx`: the
  requests as cards of the stack, the menu of Allow, and the results.
- [`command-words.ts`](../../shared/transcript/command-words.ts): the pure
  command names, state labels, notes, time limits, and output text.
  `command-text.ts` adds the icons and colours of each state.
- `LiteralText.tsx`: each command and folder, exactly.
- `mac-settings.ts`: the reads and the changes of the Mac's settings for
  `ThisMacSection.tsx`, `SavedChoices.tsx`, `AllowAllBar.tsx`, and the
  shared `ThisMac` of the window.
- `settings-controls.ts`: the change that holds each control, and the
  result of the last change of each control, for `mac-settings.ts`.
- `done-stop-time.ts`: whether the bar still shows a Stop that the Mac
  made and saved.
- `settings-view.ts`: the states of the settings that the reads give,
  current or kept, and `shownSettings`, which gives either.
- `AllowedCommand.tsx`: one always-allowed command, short with Show all
  when it is long. `CommandOutput.tsx` does the same for the output of a
  card, and `use-clipped.ts` measures whether a text is cut.
- `settings-results.ts`: the result of each control, and its words, with
  `countedOutcome` for a start.

### Related docs

- [Mac app](../../../docs/protocol/desktop-app.md)
- [Capabilities](../../../docs/protocol/capabilities.md): the control,
  with the switch of Mac access.
- [Chat and events](../../../docs/protocol/chat-and-events.md)
- [Mockups](../../../docs/mockups/README.md): the visual spec.
- [Shared contracts](../../shared/README.md) and
  [browser fakes](../../test-support/README.md).
