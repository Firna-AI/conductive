import { describe, expect, test } from 'vitest'
import { routes } from '../../app/router'
import { Store } from '../../app/store'
import { ACCOUNT_PATHS } from '../../shared/account'
import { FakeApiServer } from '../../test-support/fake-api'
import { coreFixtures } from '../../test-support/fixtures/core'
import { installStartScreen } from '../../test-support/github-install'
import { MacApp, type MacWindow, type MacWindowState } from '../mac/mac-app'
import { renderScreen, startedApp, textOf } from '../test-render'
import { CreateOrgScreen } from './CreateOrgScreen'

const macWindow: MacWindow = {
  state: new Store<MacWindowState>({
    mode: 'window',
    canGoBack: false,
    canGoForward: false,
  }),
  back: () => undefined,
  forward: () => undefined,
}

/**
 * The screen as HTML at `href`, in a browser or in the Mac app, after the
 * list of repositories loads.
 */
async function screenHtml(
  reply?: (server: FakeApiServer) => void,
  options: { href?: string; mac?: boolean } = {},
) {
  const server = new FakeApiServer()
  reply?.(server)
  const app = await startedApp(server)
  await app.account.loadRepositories()
  const screen = <CreateOrgScreen first={false} />
  return renderScreen(
    app,
    options.mac ? <MacApp window={macWindow}>{screen}</MacApp> : screen,
    { href: options.href },
  )
}

/** The screen as text, after the list of repositories loads. */
async function screenText(reply?: (server: FakeApiServer) => void) {
  return textOf(await screenHtml(reply))
}

/** The address of each Manage access link in the HTML. */
function manageAccessLinks(html: string): string[] {
  return Array.from(
    html.matchAll(/<a [^>]*href="([^"]*)"[^>]*>Manage access/g),
    (match) => match[1],
  )
}

const noRepositories = (server: FakeApiServer) =>
  server.json('GET', ACCOUNT_PATHS.githubRepositories, {
    repositories: [],
  })

describe('CreateOrgScreen', () => {
  test('asks for the name and the initials, and lists the repositories that the person and the GitHub App reach, or says why it cannot', async () => {
    const listed = await screenText()
    const empty = await screenText(noRepositories)
    const failed = await screenText((server) =>
      server.json(
        'GET',
        ACCOUNT_PATHS.githubRepositories,
        { error: { code: 'server_error', message: 'The request failed.' } },
        500,
      ),
    )
    const intro =
      'Create an org Name Initials Shown in the rail. Repositories The cloud computer of the org holds these repositories, and its workspaces start in them. Add at least one.'
    expect({ listed, empty, failed }).toEqual({
      listed: `${intro} acme/storefront The online shop Add acme/billing-service Invoices, payments, and webhooks Add acme/marketing-site The public website Add acme/admin-dashboard Internal tools for orders and refunds Add acme/mobile-app The iOS and Android shop app Add acme/data-pipeline Nightly stock and price imports Add firna/components Shared React components Add firna/docs The documentation site Add firna/icons The icon set Add The list shows the repositories that the GitHub App can reach. Manage access Cancel Create org`,
      empty: `${intro} Give the GitHub App access to a repository The repositories that the GitHub App can reach show here. Manage access Cancel Create org`,
      failed: `${intro} The repositories didn't load The request failed. Try again Cancel Create org`,
    })
  })

  test('Manage access names the screen of the list in a browser, and opens the page of the GitHub App that the account gives in the Mac app, which lists org accounts too', async () => {
    const githubAppUrl =
      'https://github.com/apps/conductive-staging/installations/new'
    const account = (server: FakeApiServer) =>
      server.json('GET', ACCOUNT_PATHS.account, {
        ...coreFixtures().account,
        githubAppUrl,
      })
    const href = routes.createOrg()
    const listed = await screenHtml(account, { href })
    const empty = await screenHtml(
      (server) => {
        account(server)
        noRepositories(server)
      },
      { href },
    )
    const mac = await screenHtml(account, { href, mac: true })
    expect({
      listed: manageAccessLinks(listed).map(installStartScreen),
      empty: manageAccessLinks(empty).map(installStartScreen),
      mac: manageAccessLinks(mac),
    }).toEqual({
      listed: [href],
      empty: [href],
      mac: [`${githubAppUrl}?state=mac`],
    })
  })
})
