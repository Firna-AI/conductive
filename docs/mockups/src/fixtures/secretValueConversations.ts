import type { ChatItem } from './conversations'
import {
  agent,
  answerLine,
  call,
  compareAsk,
  countAsk,
  givenForWorkspace,
  outlived,
  run,
  valueAsk,
  waitsForMapbox,
  working,
} from './secretChatParts'
import {
  mapboxRequest,
  mixedRequest,
  placesRequest,
  providersRequest,
  replicaRequest,
} from './secretRequests'

/** The keys of the chats of requests that ask for a value. */
export const secretValueConversationKeys = [
  'secret-temporary',
  'secret-temporary-value',
  'secret-temporary-workspace',
  'secret-temporary-saved',
  'secret-late-temporary',
  'secret-late-temporary-value',
  'secret-late-given',
  'secret-waiting-late',
  'secret-waiting-mixed',
  'secret-waiting-mixed-value',
  'secret-invalid-name',
  'secret-mixed-invalid-name',
] as const

type SecretValueConversationKey = (typeof secretValueConversationKeys)[number]

/** Cal asks for a comparison on real addresses, with a token Acme lacks. */
const mixedAsk: readonly ChatItem[] = [
  {
    kind: 'user',
    id: 'ask-sample',
    text: 'Compare the Mapbox suggestions with the places proxy on real addresses from production.',
  },
  agent(
    'plan-sample',
    "I'll sample 200 saved addresses from the production replica. Acme has no Mapbox token yet, so I asked for one too.",
  ),
]

/** Cal asks for a comparison with Google Places, and names its key. */
const placesAsk: readonly ChatItem[] = [
  {
    kind: 'user',
    id: 'ask-places',
    text: 'Compare the suggestions of the places proxy with Google Places. I can give you the Google Places key.',
  },
  agent(
    'plan-places',
    'Acme has no secret for the Google Places key, so I asked for it to run the comparison.',
  ),
]

/** Cal asks for both providers on real addresses from production. */
const providersAsk: readonly ChatItem[] = [
  {
    kind: 'user',
    id: 'ask-providers',
    text: 'Compare Mapbox and Google Places with the places proxy on real addresses from production.',
  },
  agent(
    'plan-providers',
    "I'll sample 200 saved addresses from the production replica. Acme has no Mapbox token or Google Places key yet, so I asked for both.",
  ),
]

/** The late request for MAPBOX_TOKEN, with its drawn answer. */
function lateValue(typed: boolean, lifetime: 'minutes' | 'workspace') {
  return outlived(
    compareAsk,
    run(mapboxRequest, 'late', { draft: { typed, lifetime } }),
    waitsForMapbox,
  )
}

/**
 * The chats of requests that ask for a value, after the finished turn of
 * `history`: a temporary request with no value yet, with a typed value and
 * each lifetime, late, and answered later. The late request also waits
 * after a request of a later turn whose call waits. A mixed request names
 * a secret of Acme and a name that Acme does not have. The last two name
 * Google Places key, which cannot become a secret.
 */
export function secretValueConversations(
  history: readonly ChatItem[],
): Record<SecretValueConversationKey, readonly ChatItem[]> {
  const ask = (typed: boolean, lifetime: 'minutes' | 'workspace' | 'saved') =>
    valueAsk(compareAsk, mapboxRequest, { typed, lifetime })
  return {
    'secret-temporary': [...history, ...ask(false, 'minutes')],
    'secret-temporary-value': [...history, ...ask(true, 'minutes')],
    'secret-temporary-workspace': [...history, ...ask(true, 'workspace')],
    'secret-temporary-saved': [...history, ...ask(true, 'saved')],
    'secret-late-temporary': [...history, ...lateValue(false, 'minutes')],
    'secret-late-temporary-value': [
      ...history,
      ...lateValue(true, 'workspace'),
    ],
    'secret-late-given': [
      ...history,
      ...outlived(
        compareAsk,
        run(mapboxRequest, 'late-allowed', {
          grant: givenForWorkspace,
          delivery: { kind: 'turn' },
        }),
        waitsForMapbox,
      ),
      answerLine(mapboxRequest, givenForWorkspace),
      working('5s'),
    ],
    // Nobody gave the Mapbox token in time. Then Cal asked for the count,
    // and its tool call waits for PROD_DATABASE_URL. The region shows that
    // request first, then the late one (needs-input decision 1 A).
    'secret-waiting-late': [
      ...history,
      ...lateValue(false, 'minutes'),
      ...countAsk,
      call(replicaRequest, 'running', 'secret-call-count'),
      { ...run(replicaRequest, 'waiting'), id: 'secret-run-count' },
      working('24s'),
    ],
    'secret-waiting-mixed': [
      ...history,
      ...valueAsk(mixedAsk, mixedRequest, {
        typed: false,
        lifetime: 'minutes',
      }),
    ],
    'secret-waiting-mixed-value': [
      ...history,
      ...valueAsk(mixedAsk, mixedRequest, { typed: true, lifetime: 'minutes' }),
    ],
    'secret-invalid-name': [
      ...history,
      ...valueAsk(placesAsk, placesRequest, {
        typed: true,
        lifetime: 'minutes',
      }),
    ],
    'secret-mixed-invalid-name': [
      ...history,
      ...valueAsk(providersAsk, providersRequest, {
        typed: true,
        lifetime: 'workspace',
      }),
    ],
  }
}
