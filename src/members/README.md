# Members UI

This folder holds the members UI: the Members tab with
invites, role menus, and Remove, the owner picker that reassigns a
workspace, Delete org with its restore page, and the read-only Repositories
and Cloud computer tabs that a member who is not an admin sees. The
[orgs and members protocol](../../docs/protocol/orgs-and-members.md) states
the rules, and the [mockups](../../docs/mockups/README.md) draw the screens.

The app shell mounts these components over the transport of the app, as
[Composition](../app/README.md#composition) says. The production components
import no fixture, no fake, and no mockup
component. The dev page and the tests both use the fake API, from `dev/` and
the `*.test.*` files.

## Development

1. Run `npm run dev`. The [root README](../../README.md#get-started) gives
   the local setup.
2. Open `http://127.0.0.1:5173/src/members/dev`. The assets server
   redirects `dev.html` to that address.

The query string chooses the state:

| Option     | Values                                                                                                     |
| ---------- | ---------------------------------------------------------------------------------------------------------- |
| `view`     | `members` (default), `general`, `repositories`, `computer`, `deleted`, `workspace`, `menu-lab`             |
| `org`      | `acme` (default), `futex`. Futex has other members, which makes stale data easy to find                    |
| `role`     | `admin` (default, Cal), `member` (Priya)                                                                   |
| `viewport` | `desktop` (default), `mobile`                                                                              |
| `scheme`   | `dark` (default), `light`                                                                                  |
| `computer` | `history` (default), `running`, `failed`, `changed`, `live`                                                |
| `fail`     | `invite`, `role`, `remove`, `cancel`, `reassign`, `delete`, `restore`, `load`, for Acme                    |
| `delay`    | A delay in ms before each reply, to show the busy states                                                   |
| `once`     | `1`: the failure of `fail` happens only for the first matching request                                     |
| `slow`     | `acme` or `futex`: the replies of that org wait four times the delay                                       |
| `people`   | The number of Acme's members, up to 40, such as `40` for a long owner menu. `0` (default): the fixtures    |
| `top`      | For `menu-lab`: the space in px above the owner button, `96` by default                                    |

The `menu-lab` view shows the desktop owner menu on a page that scrolls. Its
owner button is in a box with `overflow: hidden`. Use it with `people=40` to
check a long menu in a real browser. A large `top`, such as `760`, puts the
button low in the window, so the menu opens above it.

The dev page keeps its state in the address. Back and Forward change the
scope without a reload, so the mounted parts get new props, as in the app
shell. The dev page draws blank stand-ins for the rail, the sidebar, the
settings header, and the workspace header, which the app shell draws. Use the
page at 1440 × 900 or 390 × 800 to compare it with the mockups.

## Mount the components

Create one client, and give it to each component:

```tsx
import { createMembersApi } from './members/api/client'

const api = createMembersApi((input, init) => fetch(input, init))
```

The host gives the components `SharedUiThemeProvider` from `@firna/ui/theme`
and the `--ui-*` design tokens, as `dev/main.tsx` does with `themeFor` and
`tokensCss` of the mockups. Each component takes `viewport: 'desktop' |
'mobile'`. The phone layout uses 44 px controls and opens menus and
questions as sheets. Each component shows its own loading and error states,
with the message of the API.

| Component               | Where it goes                                              | Props and callbacks                                                                                                    |
| ----------------------- | ---------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `MembersTab`            | The Members tab, in the page column of the org settings    | `api`, `org` (with the viewer's `role`), `viewerId`, `viewport`, `now`, optional `onMemberRemoved(member)` and `suspended` |
| `OwnerPicker`           | The workspace header, beside the state                     | `api`, `workspace`, `canReassign` (the viewer is an admin of an org that is not suspended), `viewport`, `onReassigned(workspace)` |
| `OwnerChoices`          | Reassign to in the menu of a workspace row, beside the menu or in its sheet | `choices` from `useOwnerChoices({ api, workspace, onReassigned, close })`, `layout: 'menu' \| 'sheet'`. The menu moves the focus. |
| `DeleteOrgSection`      | The General tab of an admin, under the org name            | `api`, `org`, `viewport`, `now`, optional `timeZone`, `onDeleted(org)`. It renders nothing for a member.               |
| `DeletedOrgPage`        | The main area of a deleted org, which it fills             | `api`, `org` (with `deletion`), `viewport`, optional `timeZone` and `suspended`, `onRestored(org)`. Only an admin gets Restore. |
| `MemberRepositoriesTab` | The Repositories tab of a member who is not an admin       | `api`, `org`, `viewport`, optional `suspended` and `builds`, the builds of the org for the repository notice           |
| `MemberComputerView`    | The Cloud computer tab of a member, with data from the caller | `org`, `settings`, `builds`, `log`, `viewport`, `now`, optional `timeZone` and `suspended`. It loads nothing and holds no state. |
| `MemberComputerTab`     | The same tab, with its data loaded once from the API       | `api`, `org`, `viewport`, `now`, optional `timeZone`                                                                   |

- `now` is the time in Unix milliseconds. It sets the age of each invite, the
  times of the builds, and the date in the Delete org question.
- `suspended` says that the operator suspended the org. Nothing in it
  changes, also for an admin, and the shell shows the notice of the org
  above the component. The component then shows no action, no invite, and
  no sentence that only an admin changes the value. The shell gives the
  read-only tabs to every person of a suspended org.
- `onDeleted` gets the org with `deletion.deletesAt`. The shell keeps the
  org faded in the rail of its admins and opens `DeletedOrgPage`.
- `onRestored` gets the active org of the API's answer, with its `initials`
  when the answer has them. The shell shows it as an active org again. Its
  workspaces start only when they open.
- `onReassigned` gets the workspace of the API's answer. The header shows its
  new owner. The cloud computer keeps running. One exception: a workspace
  whose stop for a suspended owner has not finished still stops.
- `onMemberRemoved` tells the shell that the member's workspaces now belong
  to the viewer, so it can load the workspace list again.
- On desktop, a menu opens as a popover in the top layer of the page. So a
  box with `overflow: hidden` around its button does not cut the menu. The
  menu opens below its button when it fits. Otherwise it opens on the side
  with more room, and it gets shorter to fit. It follows its button when the
  page scrolls or the window changes size. In a long menu, only the choices
  scroll. The heading, an error, and the note stay in view.
- A desktop menu closes when the window loses focus, including a press
  inside a preview frame. The menu stays open while its change runs.
- In the Mac app, an open menu stops the drag regions of the top bars, so
  a press on a top bar also closes it. The shell does this for each menu
  that it notes in the open layers, as
  [the window integration](../../desktop/README.md#window-integration)
  says.
- The menus and the questions note themselves in the open layers of the
  app shell, from `../shell/ui/layers.ts`. So the key of the command
  palette asks an open desktop menu to close, as Escape does. While its
  change runs, the menu refuses, and the key does nothing, as it does
  while a question or a sheet is open. Outside the app, nothing notes
  them.
- While a removal, owner change, org deletion, or restore runs, its question
  or menu stays open. Cancel, Escape, Tab,
  a press outside, on the dimmed page, or on the menu's button, and a close
  by the browser change nothing. A failed change shows its error in the open
  question or menu. After a change that worked, the component closes it and
  calls its callback.
- A role menu closes when the admin chooses a role. A failed role change or
  invite cancellation shows a notice above the members list.

### Live builds

`MemberComputerView` takes the shared types `OrgSettings`, `BuildsResponse`,
and `BuildLogEvent`. `log` is the log of the newest build of `builds` while
it runs or after it failed, oldest event first. `null` shows that the log did
not load. Each new value of a prop shows at once in the mounted view. So the
shell can give it the same live builds and log events as the admin Cloud
computer tab. This folder has no transport and no polling. The shell gives
the view the live builds, log, and settings of `ComputerModel`.
`MemberComputerTab` loads them once, and does not follow a running build.
The card counts the runs of the install script, as the tab of an admin
does: a refresh is neither the newest build nor a row of the history. The
line about where new workspaces start uses the current image, also when a
refresh made it. The view names the software of the base image from
`settings.baseImage`. An older reply without it names no software. The
notice of a changed install script shows only while
`builds.changes.installScript` is true. It takes its words from the builds
through `changedScriptNotice` in `../app/first-build.ts`, as the tab of an
admin does. The view shows no Build computer.

The repository notice shows under the intro of the view, and above the
list of `MemberRepositoriesTab` when its caller gives `builds`. It names
the repositories that the org image lacks or still holds, from
`repositoryChangesOf` in `../app/repository-changes.ts`, with the words of
the mockups, as
[The repository notice](../../docs/protocol/org-image.md#the-repository-notice)
says. It has no button. A member of an org in use reads who can act, and
in a suspended org it names no admin. The history of the card stays closed
while a change of the install script or of the repositories waits for a
build.

### Scope

Each component keys its local state to the scope that it shows:

| Component          | Scope                                        |
| ------------------ | -------------------------------------------- |
| `MembersTab`       | The org, the viewer's role, the viewer, and `suspended` |
| `OwnerPicker`      | The workspace, its org, and `canReassign`    |
| `DeleteOrgSection` | The org                                      |
| `DeletedOrgPage`   | The org, the viewer's role, and `suspended`  |

When the scope changes, an open menu or question closes, a typed email and
an error go, and the component loads the data of the new scope. The answer
of a request of the old scope changes nothing and calls no callback. So a
callback always belongs to the scope that shows. The owner picker also uses
only the newest load of its members. The read-only tabs load again when the
org changes, and drop the answers of an older load.

In one scope, the Members tab store in `membersStore.ts` holds the member
whose removal question is open. It keeps the error of each failed change
under the `pendingKey` of that change, such as `remove:priya`. So, in any
order of the answers, a removal can close only the question of its own
member. Each change can set or remove only the errors of its own member or
invite.

After each state change, the store keeps an error or the open removal
question only while its owner is in the loaded list. The owner of a role
change, a removal, or the removal question is its member. The owner of an
invite cancellation is its invite. So the errors and the question of a
member end when the member leaves. An error that arrives after the member
left does not show. A new invitation has no existing owner, so its error
stays.

When a removal question opens, only the last error of that removal goes. A
close request for one member never closes the question of another member. A
removal question still stays open while its removal runs, but the store does
not depend on that.

The invite field sends one invite at a time. While an invite runs, Enter and
Invite send nothing, and the field stays open for the next email. A sent
invite clears the field only when the field still holds the email that went
out.

## The fake API

The dev page and the tests use `FakeApiServer` from
[the browser fakes](../test-support/README.md). Its writes return recorded
replies and change no later reply. So `dev/devServer.ts` records, before each
write, the reply that the real API gives for the values of the request: the
invited email, the new role, and the new owner. A new invite also gets its
DELETE reply, so that the person can cancel it. With `people`, these replies
use the generated members. So each of them can become the owner, get a new
role, or be removed. `dev/devOrgs.ts` adds the
replies of Futex, which the fake does not have. A reload of the page shows
the fake's first state again. The dev page uses `FAKE_TIME` as its clock.
`dev/devComputer.ts` adds a build history, a running or failed build, and
the live scene, where two dev buttons give the mounted `MemberComputerView`
new props.

## Tests

`npm run test -- src/members` runs the tests of this folder. The
`*.dom.test.tsx` files mount the components in happy-dom with
[the mount helper](../test-support/README.md#mounted-tests). They use the
buttons, the fields, and the keys that a person uses, with the real
callbacks and `FakeApiServer`. The other test files run in Node.

- happy-dom has no Popover API. So the mounted owner picker tests use the
  phone sheet, which opens with `showModal()`. Check the desktop popover, its
  placement, and its scroll in a real browser, with the `menu-lab` view.
- The finders skip content that is not shown, such as the content of a
  closed dialog. A press needs a control that a person can use. So a test
  fails when a question or a sheet does not open.
- A busy test holds its reply with `deferred()` and the animation frames
  with `holdAnimationFrames()`. The spinner of `@firna/ui` runs a continuous
  animation, which otherwise keeps an async `act` from settling in
  happy-dom. With the frames held, the real spinner stays on its first
  frame.
- happy-dom sends no close requests of its own. `closeRequests.ts` lists
  each way to ask a question or a sheet to close, as a browser sends it.
- Check a busy desktop menu in a real browser, because happy-dom cannot open
  it. On the dev page, `delay` holds each reply and `fail` with `once=1`
  makes the first change fail.
- `desktop/tests/owner-menu.spec.ts` checks that a press inside a preview
  frame closes the desktop menu and keeps focus in the preview. Run it with
  `npm --prefix desktop run test:electron -- tests/owner-menu.spec.ts`.

## Limits

- The avatars show initials. The contracts give no initials, so they come
  from the display name or the GitHub login.

## Key code

- `api/client.ts`: `createMembersApi`, the calls, and `ApiRequestError`.
- `api/parseCore.ts` and `api/parseSettings.ts`: the parsers of the replies.
  The settings parser keeps only the names and the Secret marks of the env
  vars.
- `membersStore.ts`: the state of the Members tab and each change.
- `actionOwners.ts`: the owner of each action, and `keepExistingOwners`,
  the owner rule that the store applies after each state change.
- `MemberComputerView.tsx`: the controlled read-only Cloud computer tab.
- `OwnerChoices.tsx`: `useOwnerChoices`, the members as choices of a new
  owner with their load, change, and refusal states. `OwnerPicker` and the
  menu of a workspace row in the shell share it, so both show the same
  states.
- `software.ts`: `softwareSentence`, the base image as one sentence, which
  the admin tab of the shell also uses.
- `useMounted.ts`: the ref that drops the answers of an old scope.
- `ui/`: the local dense controls of the design, such as `ChoiceMenu`,
  `ConfirmDialog`, and `Sheet`, where `@firna/ui` has none. They copy the
  local parts of the mockups, because the app has no shared UI folder yet.
  [Shared UI lacks parts](../../plans/follow-ups/firna-ui-missing-parts.md)
  records the gap in `@firna/ui`.
- `dev/`: the dev page and its fake server.

Related docs: [Orgs and members](../../docs/protocol/orgs-and-members.md),
[Workspaces and sandboxes](../../docs/protocol/workspaces-and-sandboxes.md),
[Access and security](../../docs/protocol/access-and-security.md), and
[the shared contracts](../shared/README.md).
