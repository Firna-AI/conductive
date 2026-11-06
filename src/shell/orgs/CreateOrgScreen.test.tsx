import { describe, expect, test } from 'vitest'
import { ACCOUNT_PATHS } from '../../shared/account'
import { FakeApiServer } from '../../test-support/fake-api'
import { renderScreen, startedApp, textOf } from '../test-render'
import { CreateOrgScreen } from './CreateOrgScreen'

/** The screen as text, after the list of repositories loads. */
async function screenText(reply?: (server: FakeApiServer) => void) {
  const server = new FakeApiServer()
  reply?.(server)
  const app = await startedApp(server)
  await app.account.loadRepositories()
  return textOf(renderScreen(app, <CreateOrgScreen first={false} />))
}

describe('CreateOrgScreen', () => {
  test('asks for the name and the initials, and lists the repositories that the person and the GitHub App reach, or says why it cannot', async () => {
    const listed = await screenText()
    const empty = await screenText((server) =>
      server.json('GET', ACCOUNT_PATHS.githubRepositories, {
        repositories: [],
      }),
    )
    const failed = await screenText((server) =>
      server.json(
        'GET',
        ACCOUNT_PATHS.githubRepositories,
        { error: { code: 'server_error', message: 'The request failed.' } },
        500,
      ),
    )
    const intro =
      'Create an org Name Initials Shown in the rail. Repositories The cloud computer of the org holds these repositories, and its workspaces start in them.'
    expect({ listed, empty, failed }).toEqual({
      listed: `${intro} acme/storefront The online shop Add acme/billing-service Invoices, payments, and webhooks Add acme/marketing-site The public website Add acme/admin-dashboard Internal tools for orders and refunds Add acme/mobile-app The iOS and Android shop app Add acme/data-pipeline Nightly stock and price imports Add firna/components Shared React components Add firna/docs The documentation site Add firna/icons The icon set Add The list shows the repositories that the GitHub App can reach. Manage access Cancel Create org`,
      empty: `${intro} Give the GitHub App access to a repository The repositories that the GitHub App can reach show here. Manage access Cancel Create org`,
      failed: `${intro} The repositories didn't load The request failed. Try again Cancel Create org`,
    })
  })
})
