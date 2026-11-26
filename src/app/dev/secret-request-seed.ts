import type { WorkspaceEvent } from '../../shared/events'
import type { SecretRequest } from '../../shared/secret-requests'
import type { FakeWorkspaceEvents } from '../../test-support/fake-events'
import { FAKE_IDS, FAKE_TIME } from '../../test-support/fixtures/core'
import {
  asks,
  late,
  priya,
  request,
  resultEvents,
  second,
  SECRET_TURN,
} from '../../test-support/fixtures/secret-requests'
import { secretTurn } from '../../test-support/fixtures/secret-turn'
import { requireOrg, type DevBackend } from './backend'
import { followOpenRequests, orgSecretsOf } from './secret-store'

/**
 * The states of secret requests that `secrets=` shows in the session of
 * `checkout-autocomplete`. `waiting`, `value`, `mixed`, `invalid-name`, and
 * `mixed-invalid-name` wait for an answer just above the composer, so they
 * need `conversation=running`. `invalid-name` asks for the value of a name
 * that a new secret cannot take, and `mixed-invalid-name` adds that name to
 * a mixed request. `waiting-and-late` adds two late requests of the running
 * turn to the waiting one, so it needs `conversation=running` too. `late`,
 * `late-value`, `results`, and `ended` sit in the ended turn of the default
 * conversation, and so does `asked-again`: three late requests for the same
 * secret.
 */
export const SECRET_SCENARIOS = [
  'waiting',
  'value',
  'mixed',
  'invalid-name',
  'mixed-invalid-name',
  'waiting-and-late',
  'late',
  'late-value',
  'asked-again',
  'results',
  'ended',
] as const

export type SecretScenario = (typeof SECRET_SCENARIOS)[number]

/**
 * A request of the running turn of `conversation=running`, made `seconds`
 * after the start of that turn, whose call ended a second later.
 */
function lateInTurn(
  id: string,
  ask: (typeof asks)[keyof typeof asks],
  seconds: number,
): SecretRequest {
  const at = FAKE_TIME + seconds * second
  return request(id, ask, at, late(at + second))
}

/**
 * Three asks of the agent for PROD_DATABASE_URL, each with its own reason
 * and command, as the mockups draw them at
 * `app/secret-requests/several/asked-again`.
 */
const askedAgain = [
  {
    reason: 'Count the saved addresses that have no postcode.',
    command:
      'psql "$PROD_DATABASE_URL" -c "select count(*) from addresses where postcode is null"',
  },
  {
    reason: 'Count the addresses without a postcode by country.',
    command:
      'psql "$PROD_DATABASE_URL" -c "select country, count(*) from addresses where postcode is null group by country"',
  },
  {
    reason: 'Find the cities with the most addresses without a postcode.',
    command:
      'psql "$PROD_DATABASE_URL" -c "select city, count(*) from addresses where postcode is null group by city order by 2 desc limit 10"',
  },
]

/** The events of each state, each with the time of its event. */
function eventsOf(scenario: SecretScenario): [WorkspaceEvent, number][] {
  const sessionId = FAKE_IDS.session
  const updated = (item: SecretRequest): [WorkspaceEvent, number] => [
    { type: 'secrets.request.updated', sessionId, request: item },
    item.updatedAt,
  ]
  // The records sit in the work of the turn of `secretTurn`, which starts here.
  const start = FAKE_TIME + 20 * second
  const ended = start + (3 * second) / 10
  const asked = { turnId: SECRET_TURN }
  switch (scenario) {
    case 'waiting':
      return [
        updated(request('dev-waiting', asks.database, FAKE_TIME + 8 * second)),
      ]
    case 'value':
      return [
        updated(request('dev-value', asks.mapbox, FAKE_TIME + 8 * second)),
      ]
    case 'mixed':
      return [
        updated(request('dev-mixed', asks.preview, FAKE_TIME + 8 * second)),
      ]
    case 'invalid-name':
      return [
        updated(request('dev-places', asks.places, FAKE_TIME + 8 * second)),
      ]
    case 'mixed-invalid-name':
      return [
        updated(
          request('dev-providers', asks.providers, FAKE_TIME + 8 * second),
        ),
      ]
    case 'waiting-and-late':
      // The waiting request comes first, so it gets the tool call line.
      return [
        updated(request('dev-count', asks.database, FAKE_TIME + 8 * second)),
        updated(lateInTurn('dev-preview', asks.preview, 2)),
        updated(lateInTurn('dev-mapbox', asks.mapbox, 4)),
      ]
    case 'asked-again':
      return secretTurn(
        start,
        askedAgain.map((ask, index) => {
          const at = ended + (index * second) / 10
          return updated(
            request(`dev-asked-${index + 1}`, asks.database, at, {
              ...late(at),
              ...asked,
              ...ask,
            }),
          )
        }),
      )
    case 'late':
      return secretTurn(start, [
        updated(
          request('dev-late', asks.database, ended, {
            ...late(ended),
            ...asked,
          }),
        ),
      ])
    case 'late-value':
      return secretTurn(start, [
        updated(
          request('dev-late-value', asks.mapbox, ended, {
            ...late(ended),
            ...asked,
          }),
        ),
      ])
    case 'ended':
      return secretTurn(start, [
        updated(
          request('dev-ended', asks.database, ended, {
            ...late(ended),
            ...asked,
            state: 'not-answered',
            endedBy: 'archived',
          }),
        ),
      ])
    case 'results':
      return secretTurn(start, resultEvents(ended))
  }
}

/**
 * Puts the events of a state of `secrets=` into the history of the fake, and
 * keeps its requests for the answers. A request in a running turn also gets
 * the tool call line of the agent beside it. An open request gives the
 * workspace the state `input`, as the Worker does. The results keep the
 * value of MAPBOX_TOKEN for the workspace, which Capabilities lists.
 */
export function seedSecretRequests(
  backend: DevBackend,
  events: FakeWorkspaceEvents,
  scenario: SecretScenario | null,
): void {
  if (scenario === null) return
  const store = orgSecretsOf(backend.state, FAKE_IDS.org)
  const emit = (event: WorkspaceEvent, occurredAt: number) =>
    events.emit({
      workspaceId: FAKE_IDS.workspace,
      eventNumber: events.last(FAKE_IDS.workspace) + 1,
      occurredAt,
      event,
    })
  const list = eventsOf(scenario)
  const first = list[0]
  if (
    first &&
    first[0].type === 'secrets.request.updated' &&
    first[0].request.state === 'waiting'
  ) {
    emit(
      {
        type: 'tool.updated',
        sessionId: FAKE_IDS.session,
        turnId: 'turn-1',
        tool: {
          id: 'secrets-run',
          kind: 'run',
          target: `conductive secrets run -- ${first[0].request.command}`,
          detail: null,
          omittedDetailBytes: 0,
          state: 'running',
        },
      },
      first[1] - second / 2,
    )
  }
  for (const [event, at] of list) {
    if (event.type === 'secrets.request.updated') {
      store.requests.set(event.request.id, event.request)
    }
    emit(event, at)
  }
  followOpenRequests(
    backend,
    requireOrg(backend.state, FAKE_IDS.org),
    FAKE_IDS.workspace,
  )
  if (scenario === 'results') {
    store.values.set(FAKE_IDS.workspace, [
      {
        id: 'dev-value',
        name: 'MAPBOX_TOKEN',
        suppliedBy: priya,
        createdAt: FAKE_TIME,
      },
    ])
  }
}
