import { code, type Inline } from './agentText'
import type { ChatItem } from './conversations'
import { onMac } from './macConversations'
import {
  agent,
  allowedByCal,
  answerLine,
  call,
  compareAsk,
  countAsk,
  outlived,
  previewAsk,
  run,
  waitsForMapbox,
  waitsForReplica,
  working,
} from './secretChatParts'
import {
  mapboxRequest,
  previewRequest,
  replicaRequest,
  type SecretRequest,
  type SecretRunItem,
} from './secretRequests'

/** The keys of the chats of the stack of requests above the composer. */
export const secretStackConversationKeys = [
  'secret-waiting-late',
  'secret-stack-answered',
  'secret-asked-again',
  'secret-asked-again-denied',
  'secret-asked-again-allowed',
  'mac-waiting-secret',
] as const

type SecretStackConversationKey = (typeof secretStackConversationKeys)[number]

/** The count by country, which needs the production replica again. */
const byCountryRequest: SecretRequest = {
  ...replicaRequest,
  reason:
    'Split the count of the saved addresses without a postcode by country.',
  command: 'node scripts/count-addresses.mjs --by country',
}

/** The cities with the most of them, from the production replica again. */
const byCityRequest: SecretRequest = {
  ...replicaRequest,
  reason:
    'List the 20 cities with the most saved addresses without a postcode.',
  command: 'node scripts/count-addresses.mjs --by city --top 20',
}

const byCountryAsk: readonly ChatItem[] = [
  { kind: 'user', id: 'ask-country', text: 'Split that count by country too.' },
  agent('plan-country', "I'll split the count by country on the same replica."),
]

const byCityAsk: readonly ChatItem[] = [
  {
    kind: 'user',
    id: 'ask-city',
    text: 'And which cities have the most of them?',
  },
  agent('plan-city', "I'll list the top 20 cities from the same replica."),
]

const waitsForPreview: readonly Inline[] = [
  'I asked for ',
  code('PROD_DATABASE_URL'),
  ' and ',
  code('VERCEL_TOKEN'),
  ', and no one has answered yet. I will deploy the preview when a member allows them.',
]

const waitsByCountry: readonly Inline[] = [
  'I asked for ',
  code('PROD_DATABASE_URL'),
  ' again, and no one has answered yet. I will split the count when a member allows it.',
]

const waitsByCity: readonly Inline[] = [
  'I asked for ',
  code('PROD_DATABASE_URL'),
  ' again, and no one has answered yet. I will list the cities when a member allows it.',
]

/**
 * The turn of a request that nobody answered in time, as `outlived` draws
 * it, with ids of its own, so that one chat holds several such turns.
 */
function lateTurn(
  key: string,
  ask: readonly ChatItem[],
  widget: SecretRunItem,
  waits: readonly Inline[],
): ChatItem[] {
  return outlived(ask, widget, waits).map((item) => ({
    ...item,
    id: `${item.id}-${key}`,
  }))
}

/**
 * The three turns in which the agent asked for PROD_DATABASE_URL: the
 * count, the count by country, and the cities. Each request is in `state`.
 */
function askedThreeTimes(
  state: SecretRunItem['state'],
  extra: Partial<SecretRunItem> = {},
): ChatItem[] {
  return [
    ...lateTurn(
      'first',
      countAsk,
      run(replicaRequest, state, extra),
      waitsForReplica,
    ),
    ...lateTurn(
      'second',
      byCountryAsk,
      run(byCountryRequest, state, extra),
      waitsByCountry,
    ),
    ...lateTurn(
      'third',
      byCityAsk,
      run(byCityRequest, state, extra),
      waitsByCity,
    ),
  ]
}

/**
 * The preview deploy and the Mapbox comparison, whose requests nobody
 * answered in time, then the count, whose request is in `state`.
 */
function twoLateThenCount(
  state: SecretRunItem['state'],
  extra: Partial<SecretRunItem> = {},
): ChatItem[] {
  return [
    ...lateTurn(
      'preview',
      previewAsk,
      run(previewRequest, 'late'),
      waitsForPreview,
    ),
    ...lateTurn(
      'mapbox',
      compareAsk,
      run(mapboxRequest, 'late', {
        draft: { typed: false, lifetime: 'minutes' },
      }),
      waitsForMapbox,
    ),
    ...countAsk,
    call(replicaRequest, 'running', 'secret-call-count'),
    { ...run(replicaRequest, state, extra), id: 'secret-run-count' },
  ]
}

/**
 * The chats of the stack of requests above the composer, after the
 * finished turn of `history`. Three requests wait: a request whose tool
 * call waits, and two older late requests, then the two late requests
 * after an Allow of the first. The agent asked three times for
 * PROD_DATABASE_URL, and each request is late, then denied, or allowed
 * with one answer. A command on the Mac waits with an older late request.
 */
export function secretStackConversations(
  history: readonly ChatItem[],
): Record<SecretStackConversationKey, readonly ChatItem[]> {
  const lateCount = lateTurn(
    'count',
    countAsk,
    run(replicaRequest, 'late'),
    waitsForReplica,
  )
  return {
    // Nobody answered the preview deploy or the Mapbox token in time. Then
    // Cal asked for the count, and its tool call waits for
    // PROD_DATABASE_URL, so its request comes first in the stack.
    'secret-waiting-late': [
      ...history,
      ...twoLateThenCount('waiting'),
      working('24s'),
    ],
    // Cal allowed the count, so its command runs, and the two late
    // requests stay in the stack.
    'secret-stack-answered': [
      ...history,
      ...twoLateThenCount('allowed', { grant: allowedByCal }),
      working('31s'),
    ],
    'secret-asked-again': [...history, ...askedThreeTimes('late')],
    'secret-asked-again-denied': [
      ...history,
      ...askedThreeTimes('late-denied', { deniedBy: 'cal' }),
    ],
    // One Allow settles the three requests and sends one line, which
    // starts one turn.
    'secret-asked-again-allowed': [
      ...history,
      ...askedThreeTimes('late-allowed', {
        grant: allowedByCal,
        delivery: { kind: 'turn' },
      }),
      answerLine(replicaRequest, allowedByCal),
      working('6s'),
    ],
    'mac-waiting-secret': onMac([...history, ...lateCount], 'waiting', [
      working('12s'),
    ]),
  }
}
