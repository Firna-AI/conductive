import type { MessageSender } from '../../shared/generated/MessageSender'
import {
  acmeSecrets,
  figmaToken,
  replicaUrl,
  revealedValue,
  vercelToken,
} from '../../../docs/mockups/src/fixtures/secrets'
import type {
  OrgSecret,
  WorkspaceCapabilitiesResponse,
} from '../../shared/secrets'
import { FAKE_TIME, fakeUsers } from './core'

const DAY = 86_400_000

function personOf(key: string): MessageSender {
  const user = fakeUsers.find((item) => item.id === key) ?? fakeUsers[0]
  return {
    id: user.id,
    githubLogin: user.githubLogin,
    displayName: user.displayName,
    avatarUrl: user.avatarUrl,
  }
}

/** The ID of a secret of the fixtures, such as `figma-token`. */
function secretIdOf(name: string): string {
  return name.toLowerCase().replaceAll('_', '-')
}

/**
 * The secrets of Acme in the mockups, as the Worker lists them: FIGMA_TOKEN
 * and VERCEL_TOKEN of Priya, PROD_DATABASE_URL of Cal, which Cal revealed
 * 2 days ago, and SENTRY_AUTH_TOKEN of Jonas for all agents. `values` holds
 * the made-up value of each, by ID, which only a reveal gives. `grants` are
 * the capabilities of `checkout-autocomplete`: FIGMA_TOKEN pre-approved,
 * PROD_DATABASE_URL allowed in its first session by Cal an hour ago, and
 * VERCEL_TOKEN in its second session by Priya a day ago.
 */
export function secretFixtures() {
  const secrets = acmeSecrets.map((item, index): OrgSecret => {
    const creator = personOf(item.creator)
    const at = FAKE_TIME - (index + 3) * DAY
    const days = item.name === replicaUrl.name ? 2 : 11
    return {
      id: secretIdOf(item.name),
      name: item.name,
      description: item.description,
      createdByUserId: creator.id,
      createdBy: creator,
      allAgents: item.allAgents,
      createdAt: at,
      updatedAt: at,
      lastReveal: item.revealed
        ? {
            revealedByUserId: personOf(item.revealed.by).id,
            revealedBy: personOf(item.revealed.by),
            revealedAt: FAKE_TIME - days * DAY,
          }
        : null,
    }
  })
  const values: Readonly<Record<string, string>> = Object.fromEntries(
    secrets.map((secret) => [
      secret.id,
      secret.name === replicaUrl.name
        ? revealedValue
        : `${secret.id}-development-value`,
    ]),
  )
  const approval = (
    name: string,
    sessionId: string,
    by: string,
    at: number,
  ) => ({
    secretId: secretIdOf(name),
    sessionId,
    approvedByUserId: personOf(by).id,
    approvedBy: personOf(by),
    approvedAt: at,
  })
  const grants: WorkspaceCapabilitiesResponse['capabilities'] = {
    preapprovedSecretIds: [secretIdOf(figmaToken.name)],
    macAccess: true,
    sessionApprovals: [
      approval(replicaUrl.name, 'autocomplete', 'cal', FAKE_TIME - 3_600_000),
      approval(vercelToken.name, 'debounce', 'priya', FAKE_TIME - DAY),
    ],
  }
  return { secrets, values, grants }
}
