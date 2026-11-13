/**
 * The runs of a command with secrets, and their requests (secrets
 * decisions 1, 4, and 7). An agent names one or more secrets and its
 * reason. When the session may not use a secret, a member answers a
 * request first. No request or chat item holds a value.
 */

import { nameLabel } from '../../../../src/shared/name-label'
import type { PersonKey } from './members'
import { figmaToken, replicaUrl, vercelToken } from './secrets'
import { workspaceSessions } from './sessions'

/**
 * A secret that a run names: a secret of the org, with its description,
 * or a name that the org does not have, which asks for a value.
 */
type RequestedSecret = { name: string; description?: string }

/** One command with secrets, and the reason that the agent gave. */
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
 * without an answer. `running` and `done` run the command, and `denied`
 * did not run it. `late-allowed` and `late-denied` answer a late request.
 * `not-answered` is an open request that ended when its workspace was
 * archived or its org was suspended (item 3 A of the mockups).
 */
type SecretRunState =
  | 'waiting'
  | 'late'
  | 'running'
  | 'done'
  | 'denied'
  | 'late-allowed'
  | 'late-denied'
  | 'not-answered'

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
  /** The end of a run: its time, and its output with each value hidden. */
  result?: { duration: string; output: string }
  /**
   * The answer of a temporary request as the card draws it: whether a
   * value is typed, and the chosen lifetime.
   */
  draft?: { typed: boolean; lifetime: ValueLifetime }
  /** What ended a request with no answer: an Archive or a suspension. */
  endedBy?: 'archive' | 'suspension'
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

/** The output of that count. The script prints the address of the replica. */
export const replicaOutput = [
  'Connecting to [redacted]',
  'Saved addresses: 41,902',
  'Without a postcode: 1,284 (3.1%)',
].join('\n')

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

/** The output of that comparison. The script prints the token it uses. */
export const mapboxOutput = [
  'Using Mapbox token [redacted]',
  'Compared 200 checkout addresses',
  'Same first suggestion: 182 (91%)',
].join('\n')

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
