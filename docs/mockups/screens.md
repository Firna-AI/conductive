# How a screen is built

This page belongs to the [mockups README](README.md), which gives the
commands, the folder layout, and links to the other pages. It gives the
screen components, the entry modules and their states, the flows, and the
links and the walks between screens. It also gives where the shared parts,
the styles, and the controls of a screen come from.

- A screen component in `src/screens/` takes the viewport and its state, and
  draws a real mobile layout, not a squeezed desktop one.
- An entry module in `src/entries/` exports one `defineScreen` with a named
  export. Its props and saved states (`variants`) choose the state. The
  workspace screen declares its states in `src/screens/workspaceState.ts`, so
  `mockups:serve` offers a control for each part of the state. The automation
  screen declares its states in `src/screens/automationState.ts` in the same
  way, and the Mac app screen in `src/screens/macAppState.ts`. The pages of
  the Mac app take the composer of a workspace and the Capabilities control
  of New workspace from the states of those two screens. The tab and
  composer states of the workspace screen live in
  `src/screens/chatStates.ts`. `tabStates` covers the session, file,
  image, HTML, and Preview tabs of the centre column. `temporaryTabStates` covers the
  temporary tab, which `src/screens/workspaceTemporaryTab.ts` draws in the
  row. `composerStates` covers the composer, with its links, mentions,
  skills, attached files, drops, the chip of Add to chat, and the
  Capabilities control.
  `src/screens/composerState.ts` adds that composer to the workspace state,
  with the login of the open session, the model of the next message, and
  the favourites and All models of an open model menu.
  `src/screens/rowMenuState.ts` holds the open menu of a row of All files
  or Changes, which `src/screens/workspaceRowMenu.ts` draws, and the toast
  after Copy path. `src/screens/listsState.ts` holds the lists of All files
  and Changes, complete or limited. Each page of the large branch spreads
  `largeBranchState` of `src/screens/workspaceState.ts`, the one place that
  sets limited lists, so its pages also show the same checks.
  `src/fixtures/limitedFiles.ts` fills the lists of a large branch, and All
  files draws its rows from one list of kept entries there. The list of `@`
  searches the same list while the lists are limited, as
  `src/screens/mentionComposer.ts` chooses.
  `src/screens/explainState.ts` holds the marks of
  explanations, the state of the explanation of Cal, and what lies open
  by the text or over the chat, which `src/screens/explainModel.ts`
  reads. `src/screens/layoutState.ts` holds the layout of the
  desktop columns: a drag of a handle, the right column, and the sidebar.
  It also gives the sizes of the columns during a drag.
  `src/screens/serviceState.ts` holds the services of the Preview tool and
  what lies open over them, which `src/screens/workspaceServices.tsx`
  draws. The pages of the services start from `servicesWorkspace` in
  `src/screens/servicesWorkspace.ts`. `src/screens/queueBarStates.ts`
  holds the merge queue of the open workspace, and
  `src/screens/queueStates.tsx` the merge queues of the list, from the
  queues of `src/screens/queueSpecs.ts`.
- A turn runs on a screen while its sandbox is ready and the last item of
  its chat is the Working line, as `isRunning` of
  `src/screens/composerFor.ts` says. The composer then shows Stop and the
  text that steers the turn, the tab of the session shows its spinner, and
  the header says that the agent works. So the chat and the composer
  cannot disagree, and no list of chats can leave one out.
- A flow (`defineUseCase`) lists the paths of existing screens. Each screen
  that a flow uses names the flow in `useCasePaths`.
- Screens link to each other with `ScreenLink` from
  `src/components/common/`, which renders Mokly's `MockLink`. A Firna control
  becomes a link through `ScreenLink asChild`. Tabs are links, so each view
  has its own path. A link to a page outside the app reads its address from
  `useOutsideHref`.
- A walk ties the screens of one example together, so that each link keeps
  the open requests of the example. `Walk` in `src/screens/walks.ts` gives
  the states of an example, the page of each, and where its controls lead.
  `src/screens/stackWalks.ts` holds the walks of the stacks of requests
  above the composer, and `src/screens/tabWalks.ts` the examples whose tabs
  keep an open request. A screen draws the state whose props its state
  holds, in its view: a browser or the Mac app.
  - Previous and Next of a stack open the page of each place of the stack
    of the state, one for each card of its chat, in the order of the shared
    stack. The `shownRequest` state picks the card on top, and
    `src/screens/walkPages.ts` makes the saved state of each place, so a
    page and a link exist for each card.
  - An answer of a card opens the state that the walk names. In a walk
    that names the answers of its stack, each other answer draws no link,
    so no answer drops the other requests. Without such names, each card
    keeps the links of its own results, as the commands of
    `mac-app/requests` do.
  - In a walk that names tabs, each tab opens the state that it names, and
    each other tab draws no link. Outside such a walk, while a session tab
    shows the needs-input mark, no tab links, because its page would drop
    the open request.
  - `src/screens/walkLinks.ts` gives these links to the chat, the value
    sheet, and the tab row.
- While the lists of a workspace are limited, `WorkspaceScreen` gives
  `ScreenLink` the table of `src/limitedListPaths.ts` through `LinkPages`,
  from `src/screens/workspaceLinks.tsx`. The table maps All files, Changes,
  and the pages of the diff, the code file, and the Markdown file to their
  limited pages. So each file link of a limited screen keeps the lists of
  the large branch: the rows and the tabs of the lists, the back links and
  the Files tab of a phone, the file tabs, and the file chips of the chat.
  Each other link keeps its page, such as the Checks tab and the tools.
  The page of the registered files panel gives the same table while its
  `lists` prop is limited. Inside an enclosing table, such as the table of
  a workspace screen, `LinkPages` keeps the enclosing table.
- A screen takes a part that the app uses too from
  [`src/ui/`](../../src/ui/README.md). A part that only the mockups use
  lives in `src/components/`. When the app starts to use such a part, the
  part moves to `src/ui/`, into the folder of the same name.
- Layout styles are CSS Modules beside their component. They read the design
  tokens through the `--ui-*` variables that the renderer writes.
- `ConfirmDialog` and `NewWorkspaceDialog` lay out their cards with the
  parts of [ModalCard.module.css](../../src/ui/components/common/ModalCard.module.css).
  A card taller than the window keeps its head and its foot, and only its
  body scrolls. The dialogs of the app import the same parts.
- Controls come from `@firna/ui`. A control without a handler renders as
  disabled, so the screens pass `noop` from
  [`src/ui/noop.ts`](../../src/ui/noop.ts).
- A shared part, in
  [`src/ui/components/`](../../src/ui/components/) or in
  `src/components/`, can have a Mokly registration under
  `src/entries/components/`, so that the Changes view lists an edit to the
  part under the part, not under each screen. The `components` folder of the catalogue lists each
  registered part. A screen renders its wrapper, and a file that the app
  reaches renders the plain part.
  [Registered parts](registered-parts.md) gives the rules.
- A switch at the end of a menu row, such as Fast in the model menu, is a
  picture, not a control. `SwitchPicture` in
  [`src/ui/components/common/`](../../src/ui/components/common/) draws
  it with the switch styles of `@firna/ui`, and the row owns the
  `menuitemcheckbox` role.
