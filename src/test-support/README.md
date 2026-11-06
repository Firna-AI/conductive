# Browser fakes

Use these modules only in development and tests.
The production Worker does not import them.
They use the same contracts as the real API.
The fixtures reuse the mockup data and keep all dates deterministic.
Use `FAKE_TIME` as the screen's clock when it shows relative times.

```ts
import { workspacesPath } from '../shared/workspaces'
import { FakeApiServer } from './fake-api'

const server = new FakeApiServer({ conversation: 'running' })
const response = await server.fetch(workspacesPath('acme'))
```

Inject `server.fetch` where the screen's API client takes `fetch`.
Inject `server.events.subscribe` through a callback for the screen's event adapter.
For example, use `server.events.subscribe(0, onMessage)`.
The first message contains stored history. Later `emit` calls send live events.
Use the last event number instead of zero to exercise a reconnect.

Writes return recorded replies. They do not change backend state.
Set the next reply with `server.json(method, path, body, status)`.
Use `server.empty` for a 204 response.
Use `server.response` for a download or a custom error response.
Each response is cloned, so a caller can read it once without changing later replies.
Unknown routes return `fake_route_missing`. They never reach the real network.

The default org is `acme`. The default workspace is `checkout-autocomplete`.
`FAKE_IDS` in `fixtures/core.ts` names the shared sample IDs.
Options select the org role, workspace state, conversation, and GitHub banner state.
Replace a reply to draw a missing login, a missing key, a first run, or a deleted org.
Preview and desktop URLs are recorded placeholders. Tests can replace them with local fixture URLs.

## Mounted tests

`mount.ts` mounts React components in a DOM test and acts as a person does. Use it only in tests, because it imports Vitest.
`dom-queries.ts` finds elements by their role and accessible name, or by their `aria-label`.
The global test environment stays Node.
Start each DOM test file with the line `// @vitest-environment happy-dom`.
Give the file the test timeout `MOUNTED_TEST_TIMEOUT`, 15 seconds, with `vi.setConfig`.
It is a hang guard that is longer than the deadline of `waitFor`, so a failed wait shows its own error first.

```tsx
// @vitest-environment happy-dom
import { vi } from 'vitest'
import { byRole, queryByRole } from '../test-support/dom-queries'
import { mount, MOUNTED_TEST_TIMEOUT, press, waitFor } from '../test-support/mount'

vi.setConfig({ testTimeout: MOUNTED_TEST_TIMEOUT })

const view = await mount(<OwnerPicker {...props} />)
await press(byRole('button', 'Owner: Cal'))
await waitFor(() => queryByRole('menuitemradio', 'Priya Raman'), 'the choice of Priya Raman')
await view.rerender(<OwnerPicker {...props} workspace={next} />)
```

- `mount(element)` renders the element inside `act` into a new container on `document.body`.
  It returns `container`, `rerender(element)`, and `unmount()`. Each mounted tree unmounts after its test.
- `press(element)` clicks the element. `typeText(field, text)` types into an input or a text area, so React sees the change.
  `pressKey(key)` sends a keydown and a keyup to the focused element. Each runs inside `act`.
- `byRole(role, name)` gives the one element with the role and exactly the accessible name.
  It fails when it finds none or more than one. `queryByRole` gives null for none. `queryAllByRole` gives all.
- `byLabel(label)` and `queryByLabel(label)` match an exact `aria-label`. `accessibleName(element)` gives the name.
  Each finder takes an optional root.
- `waitFor(find, what)` gives the first value of `find` that is not null, undefined, or false.
  Between tries, the event loop takes one turn inside `act`. After 10 seconds it fails with `what` in the error.
  It needs real timers.
- `deferred()` gives a promise with its `resolve` and `reject`. Use it to hold a fake reply until the test lets it go.

happy-dom 21 has `showModal()` for `<dialog>`, but it has no Popover API. Check a popover in a real browser.
The spinner of `@firna/ui` runs a continuous animation, which keeps an async `act` from settling in happy-dom.
An animated state needs a controlled animation clock or a real browser.

## Key code

- `fake-api.ts` handles requests and records them.
- `mount.ts` mounts React components in DOM tests, acts as a person does, and waits for a state.
- `dom-queries.ts` finds elements in DOM tests by role and accessible name, or by `aria-label`.
- `fake-core-routes.ts` records account, org, settings, section, and member replies.
- `fake-workspace-routes.ts` records workspace, session, message, and view replies.
- `fake-tool-routes.ts` records file, terminal, preview, desktop, and GitHub replies.
- `fake-api-routes.ts` defines the reply registration interface.
- `fake-events.ts` supplies history and live event messages.
- `fake-terminal.ts` supplies decoded terminal output and records input and resize calls.
- `recorded-chat.ts` supplies partial text, tools, queued messages, steer, stop, and failure.
- `recorded-files.ts` supplies full trees, file updates, branch summaries, reads, diffs, and a size error.
- `fixtures/core.ts` maps account and org samples to the shared contracts.
- `fixtures/workspaces.ts` maps workspace and session samples.
- `fixtures/tools.ts` maps file, GitHub, and tool samples.

See [the shared contracts](../shared/README.md) and
[the backend fakes](../../worker/test-support/README.md).
