/**
 * The chats with the note of a change of the capabilities of Checkout
 * address autocomplete (capability prompts decisions 1, 3, and 4). The
 * open session is Address autocomplete. Its facts are FIGMA_TOKEN, which
 * the workspace pre-approves, SENTRY_AUTH_TOKEN, which is for all agents,
 * its approval of PROD_DATABASE_URL, and the value of MAPBOX_TOKEN for the
 * workspace. Unlike the control of `app/capabilities`, it has no approval
 * of FIGMA_TOKEN of its own, so a removed pre-approval of FIGMA_TOKEN
 * changes its facts. Each note names only changes of those facts.
 */

import type { CapabilityChange } from '../../../../src/ui/components/chat/capabilityChangeCopy'
import type { ChatItem } from './conversations'
import type { PersonKey } from './members'
import { agent, call, run, working } from './secretChatParts'
import { autocompleteGrants, type SecretRequest } from './secretRequests'
import { figmaToken, replicaUrl, vercelToken } from './secrets'

/**
 * The note of a change of the capabilities of the workspace in a session:
 * the member who made it, and each change of the facts of the session. It
 * belongs to no turn. All members see the same chat, so the item records
 * `by`.
 */
export type CapabilitiesChangedItem = {
  kind: 'capabilities-changed'
  id: string
  by: PersonKey
  changes: readonly CapabilityChange[]
}

/** The keys of the chats with the note of a change of the capabilities. */
export const capabilityConversationKeys = [
  'capabilities-changed',
  'capabilities-changed-idle',
  'capabilities-changed-removed',
  'capabilities-changed-several',
] as const

type CapabilityConversationKey = (typeof capabilityConversationKeys)[number]

/** The note of one write of a member. */
function changed(
  by: PersonKey,
  changes: readonly CapabilityChange[],
  id = 'capabilities-changed',
): CapabilitiesChangedItem {
  return { kind: 'capabilities-changed', id, by, changes }
}

/** Priya pre-approves VERCEL_TOKEN in the Capabilities of the workspace. */
const preApproved = changed('priya', [
  { kind: 'pre-approved', names: [vercelToken.name] },
])

/** A preview deploy that needs only VERCEL_TOKEN. */
const previewDeploy: SecretRequest = {
  secrets: [{ name: vercelToken.name, description: vercelToken.description }],
  reason: 'Deploy a preview of the checkout to try the address suggestions.',
  command: 'vercel deploy --token "$VERCEL_TOKEN"',
}

/**
 * The deploy after the agent read the note: it uses VERCEL_TOKEN with no
 * request, because the workspace pre-approves it now.
 */
function deploy(lead: string, elapsed: string): ChatItem[] {
  return [
    agent('deploy-preview', lead),
    call(previewDeploy, 'running'),
    run(previewDeploy, 'allowed', { grant: { kind: 'pre-approved' } }),
    working(elapsed),
  ]
}

/** The tests that the agent runs before the deploy, while the note comes. */
const testsAgain: readonly ChatItem[] = [
  {
    kind: 'user',
    id: 'ask-preview',
    text: 'Run the address tests again, then deploy a preview of the checkout so I can try the suggestions.',
  },
  agent('plan-preview', "I'll run the address tests first."),
  {
    kind: 'tool',
    id: 'unit-preview',
    tool: 'run',
    target: 'npm test -- checkout',
    detail: '14 passed',
    status: 'done',
  },
  {
    kind: 'tool',
    id: 'e2e-preview',
    tool: 'run',
    target: 'npx playwright test checkout.spec.ts',
    detail: '3 passed',
    status: 'done',
  },
]

/**
 * The chats of a change, after the finished turn of `history`: in a
 * running turn, in an idle session before the next message, two removals,
 * and one edit with three changes.
 */
export function capabilityConversations(
  history: readonly ChatItem[],
): Record<CapabilityConversationKey, readonly ChatItem[]> {
  return {
    'capabilities-changed': [
      ...history,
      ...testsAgain,
      preApproved,
      ...deploy(
        "The tests pass. `VERCEL_TOKEN` is pre-approved now, so I'll deploy the preview with it.",
        '1m 52s',
      ),
    ],
    'capabilities-changed-idle': [
      ...history,
      preApproved,
      {
        kind: 'user',
        id: 'ask-preview',
        text: 'Deploy a preview of the checkout so I can try the suggestions.',
      },
      ...deploy(
        "`VERCEL_TOKEN` is pre-approved now, so I'll deploy the preview with it.",
        '9s',
      ),
    ],
    // Two writes, so two notes, each with its own member.
    'capabilities-changed-removed': [
      ...history,
      changed(
        'jonas',
        [{ kind: 'pre-approval-removed', names: [figmaToken.name] }],
        'pre-approval-removed',
      ),
      changed(
        'priya',
        [{ kind: 'value-removed', names: [autocompleteGrants.values[0].name] }],
        'value-removed',
      ),
    ],
    'capabilities-changed-several': [
      ...history,
      changed('priya', [
        { kind: 'pre-approved', names: [vercelToken.name] },
        { kind: 'pre-approval-removed', names: [figmaToken.name] },
        { kind: 'session-approval-removed', names: [replicaUrl.name] },
      ]),
    ],
  }
}
