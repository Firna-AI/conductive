# Mockups

The mockups are the visual spec of the app, in the browser and in a Mac app.
Each workspace is a cloud sandbox with its own branch. It has a chat with
coding agents, files, a terminal, port previews, and a pull request bar.
The mockups also draw the marketing site, which shows the app to visitors.
[Mokly](https://www.npmjs.com/package/@mokly/mokly) renders every screen at
mobile and desktop sizes, in light and dark, from React components that use
[`@firna/ui`](https://www.npmjs.com/package/@firna/ui).

## Commands

Run these from the repository root. Mokly needs Node 22.15 or newer, and it
refuses Node 23 and Node 24.14 to 24.18; `.nvmrc` asks for Node 24. The
build reads Git and `origin/main` to find what changed. The root `.npmrc`
sets `legacy-peer-deps`, because npm cannot meet the optional React Native
peer range of `@firna/ui`.

| Command                      | What it does                                                    |
| ---------------------------- | --------------------------------------------------------------- |
| `npm run mockups:serve`      | Serve the catalogue at `http://127.0.0.1:4173`, and watch edits |
| `npm run mockups:build`      | Validate every view in strict mode, and write `mokly-static/`   |
| `npm run mockups:typecheck`  | Type-check the catalogue sources                                |
| `npm run mockups:check`      | Run the type check, then the strict build                       |
| `npm run marketing:pictures` | Capture the pictures of the marketing site again                |
| `npm run lint`               | Run ESLint                                                      |
| `npm run format:check`       | Check the formatting with Prettier                              |

A change to a screen that a picture of the marketing site shows needs a
new capture with `npm run marketing:pictures`.
[Pictures](../../src/marketing/README.md#pictures) gives the steps.

Git ignores the build output, `mokly-static/` and
`.mokly-export-reservations/`. Each built view is at
`mokly-static/static/mokly-generated/<path>/index.{mobile,desktop}[.dark].html`.

The catalogue shows the desktop view beside the phone, in a frame narrower
than a laptop screen. The desktop layout narrows with its app frame, which
fills the window: below 1280 px the sidebar and the right column get
narrower, and below 900 px the sidebar hides. The org rail stays, and the current org opens its list as its
own page. A narrow right column hides the detail of the pull request bar and
the label of its GitHub link. Use the expand control of the frame to see the
full desktop layout.

## The design

[The design](design.md) gives the style of the app, the layouts of the
desktop and the phone, the design tokens, and the parts that the screens
share. Its linked pages give the parts of
[the workspace](design-workspace.md), of [the chat](design-chat.md), and
of [the operator section](design-operator.md).

## The catalogue

[The catalogue](catalogue.md) lists each path of the catalogue and what it
shows. It also gives the rules of the folder pages and the entries that
moved. It gives the child pages of `app/command-palette`, `marketing/docs`,
`app/account`, `app/banner`, `app/chat`, `app/routines`, `app/workspace-menu`,
`app/workspace-links`, and `app/tools`,
the New workspace dialog, and the repositories that wait for a build. Its
linked page,
[the waitlist, suspensions, and the operator](catalogue-operator.md), gives
the pages of the waitlist, the child pages of `app/orgs/suspended`, and the
operator section.
The [workspace links, file mentions, and tools](catalogue-workspace-tools.md)
page gives their child pages and flows. The
[command palette and feedback](catalogue-palette.md) page gives the child
pages of `app/command-palette` and `app/feedback`, the Feedback dialog,
and the flow that sends feedback.
The [chat and routines](catalogue-chat-and-routines.md) page gives their
child pages and flows.

`app/attachments` shows uploads, failed uploads with Try again, files over
25 MB, sent files, and the files of a queued first message. Its shared
words live in [attachmentCopy.ts](src/components/chat/attachmentCopy.ts).
`app/new-workspace/files` shows the same chips on the first message of a new
workspace, before the workspace exists, and `app/new-workspace/dialog/files`
shows them in the New workspace dialog.

## Folder layout

| Folder or file            | Contents                                                            |
| ------------------------- | ------------------------------------------------------------------- |
| `src/entries/`            | The Mokly root: entry modules, folder records, the flows, and Markdown documents, which Mokly shows as pages of notes |
| `src/screens/`            | One React component for each app screen, for both viewports         |
| `src/components/`         | Layout and parts that the screens share, where `@firna/ui` has none |
| `src/fixtures/`           | The sample orgs, members, workspaces, agents, chats, and files      |
| `src/design/`             | The design tokens: colours, type, density, sizes, radii, and fonts  |
| `src/render.tsx`          | The renderer: the Firna theme and the tokens of the colour scheme   |
| `src/theme.ts`            | The Firna theme of each scheme, and the tokens as CSS variables     |
| `src/paths.ts`            | The catalogue paths that screens link to                            |
| `src/brand.ts`            | The product name "Conductive", its domains, and the Mac DMG names   |
| `src/fonts/`              | Inter, which the Firna theme names first, with its licence          |
| `../../mokly.config.json` | The Mokly configuration: the root, the renderer, and the schemes    |

## How a screen is built

- A screen component in `src/screens/` takes the viewport and its state, and
  draws a real mobile layout, not a squeezed desktop one.
- An entry module in `src/entries/` exports one `defineScreen` with a named
  export. Its props and saved states (`variants`) choose the state. The
  workspace screen declares its states in `src/screens/workspaceState.ts`, so
  `mockups:serve` offers a control for each part of the state. The routine
  screen declares its states in `src/screens/routineState.ts` in the same
  way.
- A flow (`defineUseCase`) lists the paths of existing screens. Each screen
  that a flow uses names the flow in `useCasePaths`.
- Screens link to each other with `ScreenLink` from
  `src/components/common/`, which renders Mokly's `MockLink`. A Firna control
  becomes a link through `ScreenLink asChild`. Tabs are links, so each view
  has its own path. A link to a page outside the app reads its address from
  `useOutsideHref`.
- Layout styles are CSS Modules beside their component. They read the design
  tokens through the `--ui-*` variables that the renderer writes.
- Controls come from `@firna/ui`. A control without a handler renders as
  disabled, so the screens pass `noop` from `src/noop.ts`.

## Orgs and members

[Orgs and members](orgs-and-logins.md#orgs-and-members) gives what the
screens show of orgs and members: the roles, the logins of the sessions,
the owners of the workspaces, the menu of a workspace row, Archive and
Restore, and Delete org.

No screen shows the value of an env var. Each env var of an org has a
Secret mark: an admin switches it in the row, and a new variable starts
secret. A member sees the mark as a word, without a control.
`src/components/settings/EnvVarParts.tsx` gives the switch and the mark,
and `envVarCopy.ts` beside it gives the note under the list. The app shares
both.
`app/org-settings/cloud-computer`, its `add-variable` and `change-value`
pages, and its `member` page show them.

A file path can hold a secret value. The lists, the tabs, the page
headers, and the files of a finished turn then show "[redacted]" in place
of the value, and each file still opens by its real path. A tab whose file
name the app does not know shows "File". The `paths` state of the
workspace screen draws them, as `app/chat/masked-paths` shows.

## Logins

[Logins](orgs-and-logins.md#logins) gives the agent logins of the account,
the steps of Get started, and the notice for an agent that is not
connected.

## The waitlist

[The waitlist](orgs-and-logins.md#the-waitlist) gives the screen of a
person without app access, the invite codes and invite links, the invite
code on the Account page, and open sign-up.

## The Mac app

[The Mac app](mac-app.md) gives the screens of the Mac app: its window, the
waitlist, the commands that an agent runs on the Mac, and This Mac.

## The marketing site

[The marketing site](marketing-site.md) gives the home page and its
pictures, the header and the footer, [the docs pages](marketing-site.md#the-docs),
and [the pricing page](marketing-site.md#the-pricing-page).
It also gives the Terms, Privacy, and not-found pages, the comparison page,
and the page before GitHub. The comparison page is the chosen design at
`marketing/from-conductor/one-table`.
[Conductor comparison](../protocol/conductor-comparison.md)
states its requirements. It draws the real rows: its rows, statuses, dates,
and words come from `src/marketing/from-conductor/`, the modules that the
site also reads, as
[the marketing site README](../../src/marketing/README.md#the-comparison-page)
says. The pricing page reads its plans, its prices, and its words from
`src/marketing/pricing.ts` in the same way. The pictures are captures of
real screens, such as the workspace
screen with its chat and composer. A change to a screen or a shared part
that a picture shows needs a new capture, with the
[capture steps](../../src/marketing/README.md#pictures).
