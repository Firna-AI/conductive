# Mockups

The mockups are the visual spec of the app: a browser-only tool where each
workspace is a cloud sandbox with its own branch, a chat with coding agents,
files, a terminal, port previews, a live desktop, and a pull request bar. They
also draw the marketing site, which shows the app to visitors.
[Mokly](https://www.npmjs.com/package/@mokly/mokly) renders every screen at
mobile and desktop sizes, in light and dark, from React components that use
[`@firna/ui`](https://www.npmjs.com/package/@firna/ui).

## Commands

Run these from the repository root. Mokly needs Node 22.15 or newer, and it
refuses Node 23 and Node 24.14 to 24.18; `.nvmrc` asks for Node 24. The
build reads Git and `origin/main` to find what changed. The root `.npmrc`
sets `legacy-peer-deps`, because npm cannot meet the optional React Native
peer range of `@firna/ui`.

| Command                     | What it does                                                    |
| --------------------------- | --------------------------------------------------------------- |
| `npm run mockups:serve`     | Serve the catalogue at `http://127.0.0.1:4173`, and watch edits |
| `npm run mockups:build`     | Validate every view in strict mode, and write `mokly-static/`   |
| `npm run mockups:typecheck` | Type-check the catalogue sources                                |
| `npm run mockups:check`     | Run the type check, then the strict build                       |
| `npm run lint`              | Run ESLint                                                      |
| `npm run format:check`      | Check the formatting with Prettier                              |

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

The design is Graphite: dark-first, with near-black surfaces, cool greys, and
one bright sky accent for what is active, such as the selected rail item, a
working agent, and the main action. It is dense, with small radii, and its
labels (tabs, section names, times) use the monospace font in capitals. The
light scheme uses the same cool greys and a darker accent.

The desktop layout has four columns. The org rail holds the mark, the orgs
as squares with their initials, Create org, and the account at the bottom.
The sidebar shows the org name with its Settings link, New workspace, and
the sections that the user made. Each workspace is one line: a dot-matrix
status mark, the name, and the time, and it moves to another section by
drag and drop. The centre column has a slim header that names the
repository, the branch, and the owner of the workspace, and ends with
Archive. Then come a tab for each agent session and each open file or diff,
+ for a new session, and a clock that opens the session history. The right
column has the pull request bar on top, the All files, Changes, and Checks
lists below it, and the Terminal, Preview, and Desktop tabs at the bottom.
It shows no file content. A phone shows an org switcher at the top of the list, and the
workspace with a compact pull request row, the sessions as tabs above the
chat, and five tabs at the bottom.

- The tokens live in `src/design/`: the colours of each scheme in
  `palette.ts`, and the type, density, sizes, radii, and fonts in
  `metrics.ts`. The renderer writes them as `--ui-*` CSS variables, and gives
  `@firna/ui` the same colours through its theme.
- The logo comes from the masters in `docs/brand/`, which
  `src/components/brand/Logo.module.css` reads and only scales. The tile
  of the app icon stands alone at the top of the org rail. The lockup,
  with dark or light text for the scheme, names the product on the
  marketing site and the sign-in page. The macOS app icon shows in the
  notifications of the Mac app.
- `ActionButton` and `IconButton` in `src/components/common/actions.tsx` give
  the Firna button the dense size and a lighter label.
- On a phone every touch target is at least 44 px high. `MobileFrame` gives
  the Firna controls the touch sizes through `useControlSizes` in
  `src/components/common/touch.tsx`, and local controls read the
  `--ui-touch-min` variable, which is 0 on desktop.
- One `ModelPicker` in `src/components/chat/` sets the model and the effort
  in every composer, such as "Opus 5.5 High". It names no agent brand. In a
  session with messages, each model of the other agent says "New session",
  because it opens a new session with the draft, from decision 51.
- A view runs no script, so a screen draws an open menu in place: `Menu` in
  `src/components/common/` beside its button, or in a `Sheet` on a phone.
  Firna's own menu rows are taller than the dense design. A row can lead with
  a mark, such as an avatar, and end with a muted detail and an icon.
- `ConfirmDialog` in `src/components/common/` asks before an action that a
  user cannot simply undo: a dialog over the dimmed app on desktop, and a
  sheet on a phone. The desktop dialog lies in the `overlay` of `AppFrame`.
- `AgentMark` in `src/components/chat/` marks the agent of a session with two
  letters on a small tile, CL or CX, because the app draws no brand logo.
- `StatusGlyph` in `src/components/workspaces/` draws the state of a
  workspace as a 3 × 3 dot-matrix square. Each state has its own shape, and
  working and starting move with CSS. A finished turn is a full bright green
  square, and ready is one bright cell on a faint green grid. A workspace
  whose agent waits for the user, such as for the approval of a command,
  shows Needs input: a middle column in the accent colour that pulses.
- Copy says cloud computer or sandbox. Only the Boat key tab, the marketing
  site, and Get started name Boat, from decision 47.
- On desktop the sidebar and the right column resize from `ResizeHandle` in
  `src/components/layout/`, a hairline on their inner edge. On hover and
  during a drag a short grip in the accent colour shows in its middle, so no
  panel gets an accent edge.
- A state tints a whole bar or box, and its edges stay neutral. No box has
  an accent strip on any edge.
- The app frame is a size container (`app-frame`), so the layout follows the
  width of the frame, not of the window. In the app the two are the same. A
  screen is as high as `--ui-screen-height`, which is the window, or the
  frame of a picture on the marketing site.
- On a phone the org settings put their five tabs in three columns, so every
  tab shows. The session tabs all shrink, and the current one keeps the start
  of its title beside its rename and close buttons.

## The catalogue

| Path                | What it shows                                                                 |
| ------------------- | ----------------------------------------------------------------------------- |
| `marketing`         | The home page of the site: the app, its features, and sign-up                 |
| `app`               | A ready workspace: two sessions and a file tab, and a pull request to merge   |
| `app/sign-in`       | The GitHub sign-in, and Get started, the only first run, in four steps        |
| `app/shell`         | The workspace list, and the sandbox starting, stopped, and with an error      |
| `app/sections`      | The menu of a section, and a workspace dragged to another section             |
| `app/orgs`          | The org switcher of a phone, Create org, the first org, new orgs, deleted     |
| `app/account`       | The GitHub sign-in, the GitHub App, the agent logins, and the default model   |
| `app/banner`        | The pull request bar and Checks: no pull request, then its other states       |
| `app/new-workspace` | An empty chat, its error, the workspace while it starts, the first turn       |
| `app/org-settings`  | General with Delete org, then Repositories, Cloud computer, Boat key, Members |
| `app/chat`          | Messages and tool calls, a running turn, steer, interrupt, a failure          |
| `app/mac-commands`  | A command that an agent runs on the Mac of the sender, in the chat            |
| `app/sessions`      | A new session, the session history, and closing a session while it works      |
| `app/reassign`      | The owner of a workspace and the menu that reassigns it, and a member's view  |
| `app/archive`       | Archive with its check for unpushed work, and the Archived group              |
| `app/composer`      | Attached files, the model and effort picker, and a missing agent or key       |
| `app/files`         | All files, Changes with its summary, and a file, Markdown, and diff tab       |
| `app/tools`         | The terminal, a port preview, no preview, and the desktop                     |
| `app/panels`        | The right column, widened by the handle on its inner edge                     |
| `mac-app`           | The Mac app: its window, its device commands, and This Mac                    |
| `user-flows`        | Sign up, create a workspace, reopen it, create an org, run a Mac command      |

A folder page shows at most five screens, saved states included. A folder
with child folders shows only its canonical screen, as `app`, `app/sign-in`,
`app/orgs`, `app/org-settings`, and `app/banner` do. `app/org-settings/cloud-computer` and its building
and build-failed states moved from `app/repository-settings` and its updating
and update-failed states, and declare `movedFrom`. `app/sign-in/get-started`
moved into its own folder and kept its path. Get started is the only first
run, so the first run of `app/shell` and the not-connected state of
`app/orgs/new` are gone, and their links lead to Get started. Its second
step opens `app/orgs/new/first`, whose Create org and Cancel return to Get
started. The entries
of `app/orgs/new`, `app/orgs/empty`, and `app/orgs/deleted` moved into their
own folders and kept their paths, so `app/orgs` shows only its canonical
screen. `app/orgs/empty/another` moved from `app/orgs/empty/team` when the
paid plan went away, and declares `movedFrom`.

`app/banner` shows a branch with commits and no pull request. Its child
pages show the other states of decision 18: `app/banner/checks` has the
running, failed, and passed checks and the merge, which moved from
`app/banner/checks-running`, `checks-failed`, `ready-to-merge`, and `merged`
and declare `movedFrom`. `app/banner/blocked` has a merge conflict, requested
changes, a draft, and a pull request closed without a merge. A conflict and
requested changes tint the bar amber. `app/banner/no-commits` has a branch
without commits, whose bar offers no Create pull request, as in
`app/new-workspace/creating` and `first-turn`.

## Folder layout

| Folder or file            | Contents                                                            |
| ------------------------- | ------------------------------------------------------------------- |
| `src/entries/`            | The Mokly root: entry modules, folder records, and the flows        |
| `src/screens/`            | One React component for each app screen, for both viewports         |
| `src/components/`         | Layout and parts that the screens share, where `@firna/ui` has none |
| `src/fixtures/`           | The sample orgs, members, workspaces, agents, chats, and files      |
| `src/design/`             | The design tokens: colours, type, density, sizes, radii, and fonts  |
| `src/render.tsx`          | The renderer: the Firna theme and the tokens of the colour scheme   |
| `src/theme.ts`            | The Firna theme of each scheme, and the tokens as CSS variables     |
| `src/paths.ts`            | The catalogue paths that screens link to                            |
| `src/brand.ts`            | The name of the product, "Conducting", and its domains              |
| `src/fonts/`              | Inter, which the Firna theme names first, with its licence          |
| `../../mokly.config.json` | The Mokly configuration: the root, the renderer, and the schemes    |

## How a screen is built

- A screen component in `src/screens/` takes the viewport and its state, and
  draws a real mobile layout, not a squeezed desktop one.
- An entry module in `src/entries/` exports one `defineScreen` with a named
  export. Its props and saved states (`variants`) choose the state. The
  workspace screen declares its states in `src/screens/workspaceState.ts`, so
  `mockups:serve` offers a control for each part of the state.
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

The product is free for now, as the user decided on 5 November 2026 in
decision 45. So the screens show no plans, no billing, no seats, and no
plan limits.

- An admin invites members by their GitHub login. The roles are admin and
  member, from decision 54. Only an admin manages the members, adds the
  Boat key, deletes the org, and reassigns a workspace. A member who is not
  an admin sees the members and each workspace's owner without actions, and
  no Boat key tab. "Owner" names only the person who owns a workspace.
- Only an admin renames the org, and changes the repositories, the scripts,
  and the env vars, from decisions 54 and 57. A member sees the General,
  Repositories, and Cloud computer tabs read-only: the values, without edit
  fields, Save, or Build computer. The General tab of a member is the child
  page `app/org-settings/member`, because `app/org-settings` has child
  pages. `DetailList` in `src/components/settings/` shows such values.
- Each message runs on the agent login of the person who sends it, from
  decision 49. So a reassign changes no login, and the cloud computer keeps
  running.
- Each branch starts with the GitHub login of the owner of its workspace,
  such as `calummoore/lisbon-7k2q`, from decision 53.
- Archive, from decision 16, deletes the cloud computer and keeps the chat
  read-only in the Archived group at the end of the list. It checks first
  for work that is not committed or not pushed. The pull request bar offers
  it after a merge. Only the workspace's owner and the org's admins see
  Archive, from decision 42. An archived workspace has no file lists and no
  tools, so a phone shows only its chat.
- No workspace shows as expiring. Near day 14 of a stop, the app starts the
  cloud computer briefly and stops it again, from decision 43.
- Any user creates orgs. Create org of the first run returns to Get started.
- Delete org asks for the org name. The deleted org stays faded in the rail
  of its admins until the date when everything is deleted, and its page
  offers Restore.
- Three orgs show: Acme, Firna, the first org of the sign-up, and Acme Labs,
  which Create org makes. The parts live in `src/components/members/`.

## Keys and logins

- Each org has one Boat key, which runs all its cloud computers, from
  decision 46. The Boat key tab of the org settings names Boat, links to the
  Boat sign-up and dashboard, and asks for a key with custom actions,
  limited to one environment. It lists the actions in one block to copy,
  because Boat's `ci` preset deletes only the sandboxes of its own key. It shows only the last four characters of a
  saved key. It draws a key that failed its test, and a key of another Boat
  account, which it refuses while it keeps the saved key, from decision 56.
  The tab label also names Boat on the other settings pages, because it
  leads to the key screen, and a move to another provider renames both.
  The parts live in `src/components/settings/BoatKey.tsx` and
  `BoatKeyTab.tsx`.
- The account connects Claude with a subscription token from
  `claude setup-token` or an API key, and Codex with an OpenAI API key.
  `AgentConnectForm` opens under the row of the agent. A connected login
  shows its kind and Remove.
- Get started has four steps: install the GitHub App, create the first
  org, add its Boat key, and connect Claude or Codex, from decision 33. The
  next step opens its form. Get started and the marketing site say that
  users need their own Boat account.
- The composer shows a notice when the agent of the chosen model is not
  connected, or when the org has no key. The key notice says "cloud
  computers" and names no provider. Only an admin gets its Add key.

## The Mac app

The Mac app is the web app in a window of macOS, from decision 62. Its
screens live under `mac-app`, and their parts in `src/components/mac/`.

- `MacScreen` lays the screen of a Mac out at 1440 × 900 and scales it to
  the view in steps of `--mac-scale`, because a view runs no script. The
  app has no phone layout, so a phone view shows the same screen, smaller.
- The window has no title bar. The red, yellow, and green window buttons
  sit inset at the top left of the left panel, above every layer of the
  app, as macOS draws them. `WindowControls` keeps their space, then shows
  the sidebar toggle, and back and forward at the right. In full screen
  the buttons are gone, and the toggle takes their space.
- `MacApp` marks the screens inside it as the Mac app, so that `AppFrame`
  draws the window controls and a banner of the Mac app. The account of
  the Mac app keeps the sidebar of the org and adds the This Mac section.
- An agent can ask to run a command on the Mac of the person who sent the
  turn. The request waits as a compact message just above the composer,
  from `PendingCommand` in `src/components/chat/`: the exact command, the
  time limit, Deny, and Allow. A longer time limit shows its reason.
  Details opens the folder, the reason, the workspace, and the sender. The
  arrow beside Allow opens Always allow and Allow all commands for 15
  minutes. A view runs no script, so both are native disclosures, and each
  choice is a link. The header and the workspace list mark the workspace
  with Needs input, so the request shows from every page. A notification
  of macOS opens the workspace when the app is in the background. The 15
  minutes show as an amber bar with the time left and Stop.
- The web app shows a waiting request without the choices, because only
  the Mac app can allow a command on the Mac. Once answered, the command
  shows as a card at its place in the chat: denied, done with its output,
  or Mac not available.

## The marketing site

The home page follows the calm structure of a Conductor-style home page: a
header, a hero with a short headline, one sentence, and a large picture of
the app, then one section for each feature, the smaller features, a last
call to action, and a footer. Both actions, "Start free with GitHub"
and "Sign in", lead to `app/sign-in`. The parts live in
`src/components/marketing/`.

- Every picture is a real screen of the catalogue, not a drawing of one.
  `ScreenFrame` lays the screen out at its own size, 1440 × 900 on desktop
  and 390 × 800 on a phone, then scales it and crops it to one part.
  `src/screens/marketingPictures.tsx` chooses the screen, its state, and the
  part, in px of the screen. When a layout of the app changes, look at the
  pictures again.
- A picture is `inert`, so a visitor cannot focus or press anything in it.
  It also sets `StillLinks`: a `ScreenLink` in it is plain content, and an
  outside link has no address. So a picture never links into the catalogue.
- The hero picture follows the width of the page in steps of
  `--frame-scale`, because a view runs no script. The other pictures keep
  one scale.
- Each claim on the page is one that the plan decides. The page shows no
  customer logos, testimonials, user counts, certifications, desktop or
  native mobile app, API, other agents, or changelog.
- The page shows no plans, because the product is free for now. A line
  under each "Start free with GitHub" says that users need their own Boat
  account, which runs their cloud computers, from decision 47.
- The product is "Conducting", on `conducting.build`, from decision 32.
  `src/brand.ts` holds the name and the domains, so that one change renames
  the product.
- The footer and the sign-in page link to Terms and Privacy, from
  `LegalLinks` and decision 35. The pages are not drawn yet, so the links
  have no address.
