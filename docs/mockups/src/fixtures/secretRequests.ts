/**
 * The runs of a command with secrets, and their requests (secrets
 * decisions 1, 4, and 7). An agent names one or more secrets and its
 * reason. When the session may not use a secret, a member answers a
 * request first. No request or chat item holds a value.
 */

import { nameLabel } from '../../../../src/shared/name-label'
import type { AgentKey } from './agents'
import type {
  MemberGrant as AnyMemberGrant,
  SecretGrant as AnySecretGrant,
  ValueLifetime,
} from '../../../../src/ui/components/chat/secretGrant'
import type { PersonKey } from './members'
import { figmaToken, replicaUrl, vercelToken } from './secrets'
import { workspaceSessions } from './sessions'

/**
 * A secret that a run names: a secret of the org, with its description,
 * or a name that the org does not have, which asks for a value.
 * `invalidName` marks a name that the org does not have and that holds
 * characters other than letters, digits, and underscores, so Save as
 * secret cannot add it.
 */
type RequestedSecret = {
  name: string
  description?: string
  invalidName?: true
}

/**
 * One command with secrets, and the reason that the agent gave. The run
 * call sends the command too (secrets decision 11 D), so the cards show
 * it as the command that the agent says it will run.
 */
export type SecretRequest = {
  secrets: readonly RequestedSecret[]
  reason: string
  /** The command, which names each secret as an environment variable. */
  command: string
}

/** A grant of the sample runs, by a sample member. */
type SecretGrant = AnySecretGrant<PersonKey>

/**
 * A run as the chat shows it. `waiting` waits above the composer, while
 * the tool call waits. `late` waits there too after the call ended
 * without an answer, after the requests whose calls wait, until a member
 * answers it or it ends. `allowed` gave the values to the command, and
 * `denied` gave none. The tool call of the agent beside the card shows
 * whether the command runs or ran. `late-allowed` and `late-denied`
 * answer a late request. `not-answered` is an open request that ended
 * when its workspace was archived or its org was suspended (item 3 A of
 * the mockups).
 */
type SecretRunState =
  | 'waiting'
  | 'late'
  | 'allowed'
  | 'denied'
  | 'late-allowed'
  | 'late-denied'
  | 'not-answered'

/** A grant that a sample member gave. */
export type MemberGrant = AnyMemberGrant<PersonKey>

/**
 * The login that a session keeps: the personal login of its starter, or
 * the org login of Acme.
 */
export type KeptLogin =
  { type: 'personal'; starter: PersonKey } | { type: 'org' }

/**
 * How a late Allow reached the agent (secrets decision 10 B): a turn for
 * the sender of the turn that asked, or nothing when that turn cannot run.
 * When the starter only stopped sharing the login, the agent learns of it
 * at the next message. When the login of the session is gone, it learns of
 * it when that login is connected again: by the starter for a personal
 * login, and by an admin for the org login (item 12 C of the mockups).
 */
type LateDelivery =
  | { kind: 'turn' }
  | { kind: 'next-message' }
  | { kind: 'reconnect'; login: KeptLogin; agent: AgentKey }

/** A run of a command with secrets, at its place in the chat. */
export type SecretRunItem = {
  kind: 'secret-run'
  id: string
  request: SecretRequest
  state: SecretRunState
  /** What let the run use its secrets, once it may. */
  grant?: SecretGrant
  /** The member who denied the request. */
  deniedBy?: PersonKey
  /** How a late Allow reached the agent, as `LateDelivery` says. */
  delivery?: LateDelivery
  /**
   * The answer of a temporary request as the card draws it: whether a
   * value is typed, and the chosen lifetime.
   */
  draft?: { typed: boolean; lifetime: ValueLifetime }
  /** What ended a request with no answer: an Archive or a suspension. */
  endedBy?: 'archive' | 'suspension'
}

/**
 * The line in the chat of a late Allow, which starts a turn for the
 * sender of the turn that asked (secrets decision 10 B). It names the
 * member who answered and each secret, never a value.
 */
export type LateAnswerItem = {
  kind: 'late-answer'
  id: string
  names: readonly string[]
  grant: MemberGrant
}

/**
 * The call of the workspace tools that the agent makes, as its own tool
 * call line shows it: `conductive secrets run`, each secret, the reason,
 * and the command.
 */
export function cliCall(request: SecretRequest): string {
  const secrets = request.secrets.map(
    (secret) => `--secret ${shellWord(secret.name)}`,
  )
  return `conductive secrets run ${secrets.join(' ')} --reason "${request.reason}" -- ${request.command}`
}

/** A name as one word of the shell: quoted when it holds other characters. */
function shellWord(name: string): string {
  return /^\w+$/.test(name) ? name : `"${name}"`
}

/** A secret of the org as a run names it, with its description. */
function stored(secret: { name: string; description: string }) {
  return { name: secret.name, description: secret.description }
}

/** The count of the addresses without a postcode, on the replica. */
export const replicaRequest: SecretRequest = {
  secrets: [stored(replicaUrl)],
  reason:
    'Count the saved addresses in production that have no postcode, to size the manual fallback.',
  command: 'node scripts/count-addresses.mjs',
}

/** A preview deploy that needs two secrets of Acme. */
export const previewRequest: SecretRequest = {
  secrets: [stored(replicaUrl), stored(vercelToken)],
  reason:
    'Deploy a preview of the checkout that reads the production replica, to try the suggestions on real addresses.',
  command:
    'vercel deploy --token "$VERCEL_TOKEN" --env DATABASE_URL="$PROD_DATABASE_URL"',
}

/** An export of icons, which the creator of the workspace pre-approved. */
export const iconsRequest: SecretRequest = {
  secrets: [stored(figmaToken)],
  reason: 'Export the address icons of the checkout designs.',
  command: 'node scripts/export-icons.mjs --page "Checkout / Address"',
}

/** A name that Acme does not have, so the card asks for a value. */
export const mapboxRequest: SecretRequest = {
  secrets: [{ name: 'MAPBOX_TOKEN' }],
  reason:
    'Compare the address suggestions of the places proxy with the Mapbox search API.',
  command: 'node scripts/compare-suggestions.mjs --provider mapbox',
}

/**
 * A secret of Acme and a name that Acme does not have, in one request.
 * One answer covers both (item 7 A of the mockups): the secret gets the
 * approval of the session, and the name gets a value and a lifetime.
 */
export const mixedRequest: SecretRequest = {
  secrets: [stored(replicaUrl), { name: 'MAPBOX_TOKEN' }],
  reason:
    'Compare the Mapbox suggestions with the places proxy on 200 saved addresses from production.',
  command:
    'node scripts/compare-suggestions.mjs --provider mapbox --sample production',
}

/** The value that a member types for that name, which shows as dots. */
export const typedValue = 'pk.demo.Lm4f8Kq2nWx7'

/**
 * A name with spaces that Acme does not have. The card asks for a value,
 * and Save as secret is off, because a new secret name cannot hold spaces.
 */
const placesKey: RequestedSecret = {
  name: 'Google Places key',
  invalidName: true,
}

/** A comparison with Google Places, which names only that key. */
export const placesRequest: SecretRequest = {
  secrets: [placesKey],
  reason:
    'Compare the address suggestions of the places proxy with the Google Places API.',
  command: 'node scripts/compare-suggestions.mjs --provider google',
}

/**
 * A secret of Acme, a name that Acme does not have, and the name with
 * spaces, in one request. One choice covers both values, so Save as
 * secret is off for the whole answer.
 */
export const providersRequest: SecretRequest = {
  secrets: [stored(replicaUrl), { name: 'MAPBOX_TOKEN' }, placesKey],
  reason:
    'Compare the Mapbox and Google Places suggestions with the places proxy on 200 saved addresses from production.',
  command:
    'node scripts/compare-suggestions.mjs --provider mapbox --provider google --sample production',
}

/** An approval of one secret in one session of the workspace. */
type SessionApproval = {
  secret: string
  session: string
  by: PersonKey
  when: string
}

/** A value that a member gave for each session of the workspace. */
type WorkspaceValue = { name: string; by: PersonKey; when: string }

/** The approvals and the values of one workspace, which members remove. */
export type WorkspaceGrants = {
  approvals: readonly SessionApproval[]
  values: readonly WorkspaceValue[]
}

/** The secrets that the creator of a workspace pre-approved. */
export const preApproved: readonly string[] = [figmaToken.name]

/**
 * The approvals and the values of Checkout address autocomplete. The control
 * of its first session shows only the approval of PROD_DATABASE_URL: the
 * workspace pre-approves FIGMA_TOKEN, and VERCEL_TOKEN belongs to the second
 * session.
 */
export const autocompleteGrants: WorkspaceGrants = {
  approvals: [
    {
      secret: replicaUrl.name,
      session: nameLabel(workspaceSessions[0].title),
      by: 'cal',
      when: '1h ago',
    },
    {
      secret: figmaToken.name,
      session: nameLabel(workspaceSessions[0].title),
      by: 'priya',
      when: '2d ago',
    },
    {
      secret: vercelToken.name,
      session: nameLabel(workspaceSessions[1].title),
      by: 'priya',
      when: 'yesterday',
    },
  ],
  values: [{ name: 'MAPBOX_TOKEN', by: 'priya', when: '3h ago' }],
}
