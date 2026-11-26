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
| `npm run marketing:preview` | Capture only the public share card                              |
| `npm run lint`               | Run ESLint                                                      |
| `npm run format:check`       | Check the formatting with Prettier                              |

A change to a screen that a picture of the marketing site shows needs a
new capture with `npm run marketing:pictures`.
That command also rebuilds the [share card](../../src/marketing/link-previews.md)
from the current workspace screen and the approved blue design.
[Pictures](../../src/marketing/README.md#pictures) gives the steps.

Git ignores the build output, `mokly-static/` and
`.mokly-export-reservations/`. Each built view is at
`mokly-static/static/mokly-generated/<path>/index.{mobile,desktop}[.dark].html`.

The catalogue shows the desktop view beside the phone, in a frame narrower
than a laptop screen. The desktop layout narrows with its app frame, which
fills the window: below 1280 px the sidebar and the right column get
narrower, and below 900 px the sidebar hides. The org rail stays. The tile
of the current org opens the workspace list as a popover on each page that
has a sidebar and shows no list, as `app/panels/list-popover` shows. The
list page of an org shows the list in its main area. The number of a pull request in the bar opens it on GitHub, with
an arrow. A narrow right column hides the detail of the pull request bar.
When the bar shows an action, a column narrower than 520 px does the same.
Use the expand control of the frame to see the full desktop layout.

## The design

[The design](design.md) gives the style of the app, the layouts of the
desktop and the phone, the design tokens, and the parts that the screens
share. Its linked pages give the parts of
[the workspace](design-workspace.md), of [the chat](design-chat.md),
of [the model menu](design-model-menu.md),
of [the operator section](design-operator.md), of
[the pull request bar](design-bar.md), and of
[New workspace](design-new-workspace.md). They also give [the marks](design-marks.md),
[secrets and Capabilities](design-secrets.md),
[the requests and results of secrets](design-secret-requests.md),
[the links in text](design-links.md),
[the Markdown of replies](design-markdown.md), and
[the end of a turn](design-turn-ends.md).

## The catalogue

[The catalogue](catalogue.md) lists each path of the catalogue and what it
shows. It also gives the rules of the folder pages and the entries that
moved. It gives the child pages of `marketing/docs` and the New workspace
dialog. Its linked page,
[the waitlist, suspensions, and the operator](catalogue-operator.md), gives
the pages of the waitlist, the child pages of `app/orgs/suspended`, and the
operator section. Its linked page
[the pull request bar](catalogue-bar.md) gives `app/banner` and its child
pages. Its linked page [New workspace](catalogue-new-workspace.md) gives
`app/new-workspace/start-branch` and its child pages. The [chat and automations](catalogue-chat-and-automations.md) page gives
the child pages and flows of `app/chat` and `app/automations`. The
[workspace links, file and skill mentions, and tools](catalogue-workspace-tools.md)
page gives the child pages and flows of `app/workspace-links`,
`app/file-mentions`, `app/skill-mentions`, and `app/tools`.
The [command palette and feedback](catalogue-palette.md) page gives the child
pages of `app/command-palette` and `app/feedback`, the Feedback dialog,
and the flow that sends feedback.
The [keyboard shortcuts](catalogue-shortcuts.md) page gives the Keyboard
shortcuts tab in a browser and in the Mac app, and the palette of the Mac
app with its keys.
The [attachments and files](catalogue-attachments-and-files.md) page
gives the child pages of `app/attachments` and `app/files`, and the flow
`user-flows/drop-a-file`. The [org logins](catalogue-org-logins.md) page
gives the child pages of `app/org-settings/agents`, and the states of the
other pages that name the org login of an org. The
[secrets and Capabilities](catalogue-secrets.md) page gives the Secrets tab
of the org settings, the Capabilities pages, the child pages of
`app/secret-requests`, and the flow `user-flows/secret-request`.
The [account](catalogue-account.md) page gives the child pages of
`app/account`. The
[workspace menu, sub-workspaces, and the merge queue](catalogue-workspace-list.md)
page gives the child pages of `app/workspace-menu`, `app/sub-workspaces`,
and `app/merge-queue`. The
[first build and waiting repositories](catalogue-org-builds.md) page gives
the first build of a new org and the repositories that wait for a build.

`app/attachments` shows each attached file as a chip at its place in the
text of the message box. `app/attachments/drop` shows a drop of files into
the text, a dropped folder that attaches as its zip, and a folder that the
browser cannot read, which the box does not attach.
`app/attachments/open` shows the temporary tab that a press on a sent chip
opens, with the picture of the screenshot. The other child pages show a
failed upload, a file over 1 GB, the sent message, and the files of a
queued first message. `app/attachments/missing` shows a Try again that
failed, because a file of its message is no longer in the cloud computer.
`app/files/image` shows the picture of an image file in its tab, and an
image that the browser cannot draw. The flow `user-flows/drop-a-file` goes
from the drop of a screenshot, through Send, to its file tab.
`app/file-mentions/answers` shows a screenshot of the agent as a small
picture in its answer, and its child pages show the picture while it
loads, the link while the cloud computer is stopped, and the pictures in
the work of a turn.

`app/new-workspace/files` shows the same chips in the first message of a
new workspace, before the workspace exists. `app/new-workspace/dialog/files`
shows them in the New workspace dialog.

`DraftFileChip` in [`src/ui/components/chat/`](../../src/ui/components/chat/)
draws the chip of an attached file in the text of a message box, in each
state of its upload.
`SentFileChip` beside it draws the chip of an attached file at its place in
a sent message. `AnswerPicture` beside them draws a Markdown image of an
answer to a picture file: its picture, the box of its label while it
loads, or its link. `ImageView` in
[`src/ui/components/files/`](../../src/ui/components/files/) draws the
picture of an image file in its tab. The app draws these four parts too,
so they live in the shared UI. [attachmentCopy.ts](../../src/ui/components/chat/attachmentCopy.ts)
holds the words of the chips, and of the notices for a file over 1 GB and
a dropped folder that the browser cannot read. The app shares these words.
[The chat](design-chat.md) gives the design of each part.

## Folder layout

The app owns the UI that it shares with the mockups, in
[`src/ui/`](../../src/ui/README.md) at the repository root. The mockups
import it from there. The paths in this table start at `docs/mockups/`.
The other docs of this folder write mockup paths in the same way, such as
`src/components/chat/`. They name each file of the app with a link, such
as [`src/ui/components/chat/`](../../src/ui/components/chat/).

| Folder or file            | Contents                                                            |
| ------------------------- | ------------------------------------------------------------------- |
| `src/entries/`            | The Mokly root: entry modules, folder records, the flows, and Markdown documents, which Mokly shows as pages of notes. `src/entries/components/` holds the registrations of shared parts |
| `src/screens/`            | One React component for each app screen, for both viewports         |
| `src/components/`         | Layout and parts that only the mockups use, where `@firna/ui` has none |
| `src/fixtures/`           | The sample orgs, members, workspaces, agents, chats, and files, and the drawn screenshots of the image files |
| `src/render.tsx`          | The renderer: the Firna theme and the tokens of the colour scheme   |
| `src/paths.ts`            | The catalogue paths that screens link to, with `src/bannerPaths.ts` for the pull request bar, `src/branchPaths.ts` for a start from another branch, `src/servicePaths.ts` for the services of the Preview tool, `src/queuePaths.ts` for the merge queue, and `src/limitedListPaths.ts` for the limited page of each file page |
| `src/defined.ts`, `src/instanceKey.ts` | Helpers for the wrappers of registered parts: props without undefined values, and instance names |
| `../../src/ui/`           | The shared UI: the parts that the app uses too, with the screen styles and words, the design tokens in `design/`, the theme in `theme.ts`, the global stylesheet `render.css`, and Inter with its licence in `fonts/`. Its [README](../../src/ui/README.md) gives the folders |
| `../../src/shared/brand.ts` | The name "Conductive", its domains, its repository, and DMG names |
| `../../mokly.config.json` | The Mokly configuration: the root, the renderer, and the schemes    |

## How a screen is built

[How a screen is built](screens.md) gives the screen components, the
entry modules and their states, the flows, and the links and the walks
between screens. It also gives where the shared parts, the styles, and
the controls of a screen come from.

## Orgs and members

[Orgs and members](orgs-and-logins.md#orgs-and-members) gives what the
screens show of orgs and members: the roles, the logins of the sessions,
the owners of the workspaces, the menu of a workspace row, Archive and
Restore, and Delete org. It also gives the env vars and the Skills section
of the Cloud computer tab, the secrets of an org, and the file paths that
hold a secret value.

## Logins

[Logins](logins.md) gives the agent logins of the account,
the org logins of the Agents tab of the org settings, the steps of Get
started, and the notice for an agent that is not connected.

## The waitlist

[The waitlist](orgs-and-logins.md#the-waitlist) gives the screen of a
person without app access, the invite codes and invite links, the invite
code in Account › General, and open sign-up.

## The Mac app

[The Mac app](mac-app.md) gives the screens of the Mac app: its window, the
waitlist, the commands that an agent runs on the Mac, and This Mac.

## The marketing site

[The marketing site](marketing-site.md) gives the home page and its
pictures, the header and the footer, [the docs pages](marketing-site.md#the-docs),
and [the pricing page](marketing-site.md#the-pricing-page).
It also gives the Terms, Privacy, and not-found pages, and the page before
GitHub. The pricing page reads its plans, its prices, and its words from
[`src/marketing/pricing.ts`](../../src/marketing/pricing.ts), the module
that the site also reads. The
pictures are captures of
real screens, such as the workspace
screen with its chat and composer. A change to a screen or a shared part
that a picture shows needs a new capture, with the
[capture steps](../../src/marketing/README.md#pictures).
