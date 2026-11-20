import { describe, expect, test } from 'vitest'
import { automationModel } from '../../app/automation-model'
import type { AutomationTab } from '../../app/router'
import type { User } from '../../shared/api'
import { automationPath, type Automation } from '../../shared/automations'
import { secretsPath } from '../../shared/secrets'
import { FakeApiServer } from '../../test-support/fake-api'
import { FAKE_IDS, fakeUsers } from '../../test-support/fixtures/core'
import { automationFixtures } from '../../test-support/fixtures/automations'
import { secretFixtures } from '../../test-support/fixtures/secrets'
import { serveSuspendedAcme } from '../../test-support/suspended-org'
import { renderScreen, startedApp, textOf } from '../test-render'
import type { Viewport } from '../ui/viewport'
import { AutomationScreen } from './AutomationScreen'

const { org } = FAKE_IDS
const [cal, priya] = fakeUsers
const id = 'review-prs'

function fixture(automationId: string): Automation {
  const automation = automationFixtures().automations.find(
    (item) => item.id === automationId,
  )
  if (!automation)
    throw new Error(`The fixtures have no automation ${automationId}.`)
  return automation
}

/**
 * The automation that reviews pull requests, in the repository
 * `repositoryId`, after the app turned it off because its repository
 * stopped being a chosen repository of Acme.
 */
function removed(repositoryId: string): Automation {
  return {
    ...fixture(id),
    repositoryId,
    active: false,
    inactiveReason: 'repository_removed',
  }
}

/** A server whose automation page shows the automation `automation`. */
function serving(automation: Automation, options?: { role: 'member' }) {
  const server = new FakeApiServer(options)
  server.json('GET', automationPath(org, automation.id), { automation })
  return server
}

/**
 * The words of the page of an automation, after its data loaded, on the tab
 * and the viewport that it names, or on the Automation tab of a desktop.
 */
async function pageOf(
  server: FakeApiServer,
  automationId: string,
  user: User,
  shown: { tab?: AutomationTab; viewport?: Viewport } = {},
) {
  const app = await startedApp(server)
  const orgModel = app.org(org)
  const model = automationModel(orgModel, automationId)
  await Promise.all([
    model.reload(),
    model.runs.reload(),
    orgModel.reload('repositories'),
    orgModel.reload('list'),
    orgModel.secrets.read(),
  ])
  const summary = app.orgs.get().find((item) => item.id === org)
  if (!summary) throw new Error('The fake org is missing.')
  return textOf(
    renderScreen(
      app,
      <AutomationScreen
        org={summary}
        automationId={automationId}
        tab={shown.tab ?? 'automation'}
        user={user}
      />,
      { viewport: shown.viewport },
    ),
  )
}

/** The notice of the suspended Acme. */
const suspension =
  'Acme is suspended Its workspaces and settings are read-only. For questions, write to abuse@conductive.build.'

describe('the notes of the automation page', () => {
  test('the page says why an automation is off, and who can turn it on', async () => {
    const pages = {
      moved: await pageOf(new FakeApiServer(), 'copy-review', cal),
      failed: await pageOf(new FakeApiServer(), 'error-triage', cal),
      failedForMember: await pageOf(
        new FakeApiServer({ role: 'member' }),
        'error-triage',
        priya,
      ),
      removed: await pageOf(serving(removed('admin-dashboard')), id, cal),
    }
    expect({
      moved: pages.moved.includes(
        'This automation moved to you Lena Park left Acme. It stays off until you turn it on.',
      ),
      failed: pages.failed.includes(
        'This automation turned off Three runs in a row failed. Fix the cause, then turn it on.',
      ),
      failedForMember: pages.failedForMember.includes(
        'This automation turned off Three runs in a row failed. Only Cal can turn it on again.',
      ),
      memberLine: pages.failedForMember.includes('Only Cal can change'),
      removed: pages.removed.includes(
        'This automation turned off acme/admin-dashboard is no longer a chosen repository of Acme. Choose another repository, then turn it on.',
      ),
    }).toEqual({
      moved: true,
      failed: true,
      failedForMember: true,
      memberLine: false,
      removed: true,
    })
  })

  test('once the automation has a chosen repository, the note of a removed repository names none, says that it stays off, and says who can turn it on', async () => {
    const chosen = removed('storefront')
    const pages = {
      owner: await pageOf(serving(chosen), id, cal),
      member: await pageOf(serving(chosen, { role: 'member' }), id, priya),
      // A repository that the org does not list has no name to show.
      unlisted: await pageOf(serving(removed('gone-repository')), id, cal),
    }
    const past =
      'This automation turned off Its repository stopped being a chosen repository of Acme.'
    expect({
      owner: pages.owner.includes(`${past} It stays off until you turn it on.`),
      member: pages.member.includes(`${past} Only Cal can turn it on again.`),
      unlisted: pages.unlisted.includes(
        `${past} It stays off until you turn it on.`,
      ),
    }).toEqual({ owner: true, member: true, unlisted: true })
  })

  test('a suspended org shows its notice above the automation, with no action, no line about logins, and the chosen secrets without the pull request hint', async () => {
    const server = new FakeApiServer()
    serveSuspendedAcme(server)
    server.json('GET', secretsPath(org), { secrets: secretFixtures().secrets })
    const page = await pageOf(server, id, cal)
    expect({
      notice: page.includes(
        'Acme is suspended Its workspaces and settings are read-only.',
      ),
      owner: page.includes('Only Cal can change'),
      logins: page.includes('Runs use'),
      secrets: page.includes(
        'Runs can use FIGMA_TOKEN and VERCEL_TOKEN with no question.',
      ),
      hint: page.includes('Text in a pull request'),
      actions: ['Add trigger', 'Delete', 'Save', 'Turn off'].filter((name) =>
        page.includes(name),
      ),
    }).toEqual({
      notice: true,
      owner: false,
      logins: false,
      secrets: true,
      hint: false,
      actions: [],
    })
  })

  test('a suspended org shows its notice above the Runs tab of a phone, and above an automation that the org no longer has', async () => {
    const runs = new FakeApiServer()
    serveSuspendedAcme(runs)
    const gone = new FakeApiServer()
    serveSuspendedAcme(gone)
    gone.json(
      'GET',
      automationPath(org, id),
      {
        error: {
          code: 'automation_not_found',
          message: 'The automation is not available.',
        },
      },
      404,
    )
    const pages = {
      runs: await pageOf(runs, id, cal, { tab: 'runs', viewport: 'phone' }),
      unavailable: await pageOf(gone, id, cal),
    }
    expect({
      runs: {
        notice: pages.runs.includes(suspension),
        prompt: pages.runs.includes(fixture(id).prompt),
      },
      unavailable: pages.unavailable.includes(
        `${suspension} This automation is not available Open Automations`,
      ),
    }).toEqual({
      runs: { notice: true, prompt: false },
      unavailable: true,
    })
  })
})
