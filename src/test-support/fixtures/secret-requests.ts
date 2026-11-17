import type { WorkspaceEvent } from '../../shared/events'
import type {
  RequestedSecret,
  SecretRequest,
} from '../../shared/secret-requests'
import type { MessageSender } from '../../shared/generated/MessageSender'
import type { User } from '../../shared/api'
import { FAKE_IDS, fakeUsers } from './core'
import { secretFixtures } from './secrets'

// The sample secret requests and runs of the session of
// `checkout-autocomplete`, with the secrets of Acme in the fixtures. The dev
// fake and the tests share them.

/** A fake user as the sender record of a request names them. */
function senderOf(user: User): MessageSender {
  return {
    id: user.id,
    githubLogin: user.githubLogin,
    displayName: user.displayName,
    avatarUrl: user.avatarUrl,
  }
}

export const [cal, priya] = fakeUsers.map(senderOf)
export const second = 1_000

/** The time between two records of the results, inside the work of the turn. */
export const step = 100

/** The turn of the dev fake that holds the results and the late requests. */
export const SECRET_TURN = 'turn-secrets'

/** A secret of Acme in the fixtures, as a request names it. */
function stored(name: string): RequestedSecret {
  const secret = secretFixtures().secrets.find((item) => item.name === name)
  if (!secret) throw new Error(`The fixtures have no secret ${name}.`)
  return { name, secretId: secret.id, description: secret.description }
}

/** A name that Acme has no secret for. */
const mapbox: RequestedSecret = {
  name: 'MAPBOX_TOKEN',
  secretId: null,
  description: '',
}

export const asks = {
  database: {
    secrets: [stored('PROD_DATABASE_URL')],
    reason: 'Read the addresses that failed the postcode check.',
    command:
      'psql "$PROD_DATABASE_URL" -c "select id, postcode from addresses where postcode_valid = false limit 20"',
  },
  mapbox: {
    secrets: [mapbox],
    reason: 'Check the suggestions of the Mapbox geocoding API.',
    command:
      'curl -s "https://api.mapbox.com/search/geocode/v6/forward?q=221b+baker&access_token=$MAPBOX_TOKEN"',
  },
  preview: {
    secrets: [stored('VERCEL_TOKEN'), mapbox],
    reason: 'Deploy a preview with the address search.',
    command: 'npx vercel deploy --token "$VERCEL_TOKEN" --env MAPBOX_TOKEN',
  },
  vercel: {
    secrets: [stored('VERCEL_TOKEN')],
    reason: 'Deploy a preview of the checkout.',
    command: 'npx vercel deploy --token "$VERCEL_TOKEN"',
  },
} as const

/** A request of the first turn, made by Cal, the sender of that turn. */
export function request(
  id: string,
  ask: (typeof asks)[keyof typeof asks],
  at: number,
  change: Partial<SecretRequest> = {},
): SecretRequest {
  return {
    id,
    workspaceId: FAKE_IDS.workspace,
    sessionId: FAKE_IDS.session,
    turnId: 'turn-1',
    sender: cal,
    secrets: ask.secrets,
    reason: ask.reason,
    command: ask.command,
    state: 'waiting',
    late: false,
    createdAt: at,
    updatedAt: at,
    answeredBy: null,
    lifetime: null,
    endedBy: null,
    notice: null,
    ...change,
  }
}

export const late = (at: number): Partial<SecretRequest> => ({
  state: 'late',
  late: true,
  updatedAt: at,
})

/**
 * A run that Cal allowed in time, a run of a pre-approved secret, a request
 * that Priya denied in time, and a late request that Priya allowed later,
 * with the line of the app that told the agent.
 */
export function resultEvents(at: number): [WorkspaceEvent, number][] {
  const sessionId = FAKE_IDS.session
  const allowed = request('dev-allowed', asks.vercel, at, {
    turnId: SECRET_TURN,
    state: 'allowed',
    answeredBy: cal,
    updatedAt: at + step,
  })
  const denied = request('dev-denied', asks.database, at + 3 * step, {
    turnId: SECRET_TURN,
    state: 'denied',
    answeredBy: priya,
    updatedAt: at + 4 * step,
  })
  const given = request('dev-given', asks.mapbox, at + 4 * step, {
    turnId: SECRET_TURN,
    state: 'allowed',
    late: true,
    answeredBy: priya,
    lifetime: 'workspace',
    updatedAt: at + 90 * second,
    notice: { state: 'sent', turnId: 'turn-answer-dev-given' },
  })
  const run = (id: string, names: string[], command: string) => ({
    type: 'secrets.run' as const,
    sessionId,
    turnId: SECRET_TURN,
    id,
    names,
    command,
    reason: '',
  })
  return [
    [{ type: 'secrets.request.updated', sessionId, request: allowed }, at],
    [
      {
        ...run('dev-allowed', ['VERCEL_TOKEN'], asks.vercel.command),
        reason: asks.vercel.reason,
        grants: [{ name: 'VERCEL_TOKEN', grant: 'session' }],
      },
      at + step,
    ],
    [
      {
        ...run(
          'dev-preapproved',
          ['FIGMA_TOKEN'],
          'npx figma-export --token "$FIGMA_TOKEN"',
        ),
        grants: [{ name: 'FIGMA_TOKEN', grant: 'workspace' }],
      },
      at + 2 * step,
    ],
    [
      { type: 'secrets.request.updated', sessionId, request: denied },
      at + 3 * step,
    ],
    [
      { type: 'secrets.request.updated', sessionId, request: given },
      at + 90 * second,
    ],
    [
      {
        type: 'secrets.notice',
        sessionId,
        turnId: 'turn-answer-dev-given',
        requestId: given.id,
        text: 'App: Priya Raman made MAPBOX_TOKEN available in this workspace.',
      },
      at + 90 * second,
    ],
  ]
}
