# Mockups

The mockups are the visual spec of the app: a browser-only tool where each
workspace is a cloud sandbox with its own branch, a chat with coding agents,
files, a terminal, port previews, a live desktop, and a GitHub banner.
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
than a laptop screen. The desktop layout narrows with its window: below
1280 px the sidebar and the chat get narrower, and below 900 px the sidebar
hides and the workspace list moves to its own page. Use the expand control of
the frame to see the full desktop layout.

## The catalogue

| Path                      | What it shows                                                           |
| ------------------------- | ----------------------------------------------------------------------- |
| `app`                     | A ready workspace: chat, changed files, and a pull request to merge     |
| `app/shell`               | The workspace list, first run, and the sandbox starting, stopped, error |
| `app/banner`              | The GitHub banner: no pull request, checks running or failed, merge     |
| `app/new-workspace`       | The form, its error, the workspace while it starts, the first turn      |
| `app/repository-settings` | The base and its updates, install software, and add a repository        |
| `app/chat`                | Messages and tool calls, a running turn, steer, interrupt, a failure    |
| `app/files`               | All files, Changes, and the Markdown, code, and diff previews           |
| `app/tools`               | The terminal, a port preview, no preview, and the desktop               |
| `user-flows`              | Create a workspace, and reopen a stopped workspace                      |

A folder page shows at most five screens, saved states included. A folder
with child folders shows one canonical screen first.

## Folder layout

| Folder or file                      | Contents                                                            |
| ----------------------------------- | ------------------------------------------------------------------- |
| `src/entries/`                      | The Mokly root: entry modules, folder records, and the flows        |
| `src/screens/`                      | One React component for each app screen, for both viewports         |
| `src/components/`                   | Layout and parts that the screens share, where `@firna/ui` has none |
| `src/fixtures/`                     | The sample repositories, workspaces, chats, files, and output       |
| `src/render.tsx`                    | The renderer: the Firna theme for the colour scheme, and its CSS    |
| `src/theme.ts`                      | The Firna theme of each scheme, as CSS variables for the layout     |
| `src/paths.ts`                      | The catalogue paths that screens link to                            |
| `src/fonts/`                        | Inter, which the Firna theme names first, with its licence          |
| `../../mokly.config.json`           | The Mokly configuration: the root, the renderer, and the schemes    |

## How a screen is built

- A screen component in `src/screens/` takes the viewport and its state, and
  draws a real mobile layout, not a squeezed desktop one.
- An entry module in `src/entries/` exports one `defineScreen` with a named
  export. Its props and saved states (`variants`) choose the state. The
  workspace screen declares its states in `src/screens/workspaceState.ts`, so
  `mockups:serve` offers a control for each part of the state.
- A flow (`defineUseCase`) lists the paths of existing screens. Each screen
  that a flow uses names the flow in `useCasePaths`.
- Screens link to each other with `MockLink`. A Firna control becomes a link
  through `MockLink asChild`.
- Layout styles are CSS Modules beside their component. They read the Firna
  theme through the `--ui-*` variables that the renderer writes.
- Controls come from `@firna/ui`. A control without a handler renders as
  disabled, so the screens pass `noop` from `src/noop.ts`.
