/**
 * The runs of a command with secrets, and their requests (secrets
 * decisions 1, 4, and 7). An agent names one or more secrets and its
 * reason. When the session may not use a secret, a member answers a
 * request first. No request or chat item holds a value.
 */

import { nameLabel } from '../../../../src/shared/name-label'
import type { AgentKey } from './agents'
import type { PersonKey } from './members'
import { figmaToken, replicaUrl, vercelToken } from './secrets'
import { workspaceSessions } from './sessions'

/**
 * A secret that a run names: a secret of the org, with its description,
 * or a name that the org does not have, which asks for a value.
 */
type RequestedSecret = { name: string; description?: string }

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

/**
 * How long the value of a temporary request lasts: 15 minutes in the
 * session that asked, each session of the workspace until Archive, or as
 * a new secret of the org.
 */
export type ValueLifetime = 'minutes' | 'workspace' | 'saved'

/**
 * What lets a run use its secrets: the mark for all agents, a
 * pre-approval of the workspace, an approval of the session, or a value
 * that a member gave.
 */
export type SecretGrant =
  | { kind: 'all-agents' }
  | { kind: 'pre-approved' }
  | { kind: 'session'; by: PersonKey }
  | { kind: 'value'; lifetime: ValueLifetime; by: PersonKey }

/**
 * A run as the chat shows it. `waiting` waits above the composer, while
 * the tool call waits. `late` stays in the chat after the call ended
 * without an answer. `allowed` gave the values to the command, and
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

/** A grant that a member gave: an approval of the session, or a value. */
export type MemberGrant = Extract<SecretGrant, { by: PersonKey }>

/**
 * How a late Allow reached the agent (secrets decision 10 B): a turn for
 * the sender of the turn that asked, or nothing when that turn cannot run.
 * When the starter only stopped sharing the login, the agent learns of it
 * at the next message. When the login of the starter is gone, it learns of
 * it when the starter connects that agent again (item 12 C of the mockups).
 */
type LateDelivery =
  | { kind: 'turn' }
  | { kind: 'next-message' }
  | { kind: 'reconnect'; starter: PersonKey; agent: AgentKey }

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
  const secrets = request.secrets.map((secret) => `--secret ${secret.name}`)
  return `conductive secrets run ${secrets.join(' ')} --reason "${request.reason}" -- ${request.command}`
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

/** The approvals and the values of Checkout address autocomplete. */
export const autocompleteGrants: WorkspaceGrants = {
  approvals: [
    {
      secret: replicaUrl.name,
      session: nameLabel(workspaceSessions[0].title),
      by: 'cal',
      when: '1h ago',
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
