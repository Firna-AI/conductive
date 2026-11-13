import type { ChatItem } from './conversations'
import {
  agent,
  answerMessage,
  compareAsk,
  givenForWorkspace,
  outlived,
  run,
  valueAsk,
  waitsForMapbox,
  working,
} from './secretChatParts'
import { mapboxRequest, mixedRequest } from './secretRequests'

/** The keys of the chats of requests that ask for a value. */
export const secretValueConversationKeys = [
  'secret-temporary',
  'secret-temporary-value',
  'secret-temporary-workspace',
  'secret-temporary-saved',
  'secret-late-temporary',
  'secret-late-temporary-value',
  'secret-late-given',
  'secret-waiting-mixed',
  'secret-waiting-mixed-value',
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

/** The late request for MAPBOX_TOKEN, with its drawn answer. */
function lateValue(typed: boolean, lifetime: 'minutes' | 'workspace') {
  return outlived(
    compareAsk,
    run(mapboxRequest, 'late', { draft: { typed, lifetime } }),
    waitsForMapbox,
  )
}

/**
 * The chats of requests that ask for a value (secrets decision 7), after
 * the finished turn of `history`: a temporary request with no value yet,
 * with a typed value and each lifetime, late, and answered later. A mixed
 * request names a secret of Acme and a name that Acme does not have.
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
        run(mapboxRequest, 'late-allowed', { grant: givenForWorkspace }),
        waitsForMapbox,
      ),
      answerMessage(mapboxRequest, givenForWorkspace),
      working('5s'),
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
  }
}
