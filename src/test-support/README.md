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
Repository PUT and DELETE replies change only the named repository in the
recorded choices. Stateful client tests use the dev routes in `../app/dev/`.
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

## Key code

- `fake-api.ts` handles requests and records them.
- `fake-core-routes.ts` records account, org, settings, section, and member replies.
- `fake-workspace-routes.ts` records workspace, session, message, and view replies.
- `fake-tool-routes.ts` records file, terminal, preview, desktop, and GitHub replies.
- `fake-api-routes.ts` defines the reply registration interface.
- `fake-events.ts` supplies history and live event messages.
- `fake-terminal.ts` supplies decoded terminal output and records input and resize calls.
- `recorded-chat.ts` supplies partial text, tools, queued messages, steer, stop, and failure.
- `recorded-files.ts` supplies full trees, file updates, branch summaries, reads, diffs, and a size error.
- `fixtures/core.ts` maps account and org samples to the shared contracts.
- `fixtures/repositories.ts` supplies GitHub repository choices before org creation and the org's repository records.
- `fixtures/workspaces.ts` maps workspace and session samples.
- `fixtures/tools.ts` maps file, GitHub, and tool samples.

See [the shared contracts](../shared/README.md) and
[the backend fakes](../../worker/test-support/README.md).
