import { describe, expect, test } from 'vitest'
import { themeFor } from '../../../docs/mockups/src/theme'
import { ACCOUNT_PATHS } from '../../shared/account'
import { API_PATHS, type OrgRole } from '../../shared/api'
import { GET_STARTED_PATH } from '../../shared/onboarding'
import {
  orgSettingsPaths,
  type BuildsResponse,
  type ImageBuild,
} from '../../shared/org-settings'
import { FakeApiServer } from '../../test-support/fake-api'
import {
  coreFixtures,
  FAKE_IDS,
  FAKE_TIME,
  fakeUser,
} from '../../test-support/fixtures/core'
import { buttonsOf } from '../account/test-markup'
import { renderScreen, startedApp, textOf } from '../test-render'
import { GetStartedScreen } from './GetStartedScreen'

/** A user who installed the GitHub App, and has no org and no agent yet. */
function installedServer(): FakeApiServer {
  const server = new FakeApiServer()
  server.json('GET', GET_STARTED_PATH, {
    orgId: null,
    steps: [
      { step: 'github-app', complete: true },
      { step: 'org', complete: false },
      { step: 'agent-login', complete: false },
    ],
  })
  server.json('GET', API_PATHS.orgs, { orgs: [] })
  server.json('GET', ACCOUNT_PATHS.account, {
    ...coreFixtures().account,
    agentLogins: [
      { agent: 'claude', connected: false },
      { agent: 'codex', connected: false },
    ],
  })
  return server
}

/** The titles of the steps, in their order. */
function titlesOf(html: string): string[] {
  return [...html.matchAll(/<h2[^>]*>([^<]*)<\/h2>/g)].map(([, title]) => title)
}

/** A build of Acme that started `ago` ms before the clock of the test. */
function buildOf(
  id: string,
  state: ImageBuild['state'],
  ago: number,
  durationMs: number | null = null,
  error: string | null = null,
): ImageBuild {
  const startedAt = FAKE_TIME - ago
  return {
    id,
    orgId: FAKE_IDS.org,
    kind: 'build',
    state,
    startedAt,
    completedAt: durationMs === null ? null : startedAt + durationMs,
    durationMs,
    error,
  }
}

const savedError =
  'The cloud computer image could not build. Check the log and try again.'

/** The builds of Acme in each state of its first build. */
const firstBuilds: Readonly<Record<string, BuildsResponse>> = {
  running: {
    builds: [buildOf('first', 'running', 134_000)],
    currentImageBuildId: null,
  },
  // A later build failed after the first good build.
  succeeded: {
    builds: [
      buildOf('later', 'failed', 600_000, 30_000, 'It failed.'),
      buildOf('first', 'succeeded', 3_600_000, 292_000),
    ],
    currentImageBuildId: 'first',
  },
  failed: {
    builds: [buildOf('first', 'failed', 720_000, 138_000, savedError)],
    currentImageBuildId: null,
  },
  none: { builds: [], currentImageBuildId: null },
}

/** Whether the button with this label has the fill of a primary button. */
function primary(html: string, label: string): boolean {
  const button = [
    ...html.matchAll(/<button([^>]*)>([\s\S]*?)<\/button>/g),
  ].find(([, , content]) => textOf(content) === label)
  if (!button) throw new Error(`The button ${label} is missing.`)
  return button[1].includes(
    `background-color:${themeFor('dark').colors.primary}`,
  )
}

/**
 * Get started with every step done for Acme, whose builds are `builds`, as
 * a person with `role` sees it: the text and the buttons of the org step,
 * and the text of the finish with the fill of Open Acme.
 */
async function finishedSteps(builds: BuildsResponse, role: OrgRole) {
  const server = new FakeApiServer({ role })
  server.json('GET', orgSettingsPaths.builds(FAKE_IDS.org), builds)
  const app = await startedApp(server)
  const org = app.org(FAKE_IDS.org)
  await Promise.all([org.reload('repositories'), org.reload('builds')])
  const html = renderScreen(app, <GetStartedScreen user={fakeUser} />)
  const steps = /<ol[^>]*>([\s\S]*?)<\/ol>/.exec(html)?.[1] ?? ''
  const orgStep = [...steps.matchAll(/<li>([\s\S]*?)<\/li>/g)][1]?.[1] ?? ''
  return {
    orgStep: textOf(orgStep),
    actions: buttonsOf(orgStep).map((button) => button.label),
    finish: textOf(html.split('</ol>')[1] ?? ''),
    openIsPrimary: primary(html, 'Open Acme'),
  }
}

describe('GetStartedScreen', () => {
  test('draws the three steps in order, and with the org next no later step opens its form', async () => {
    const app = await startedApp(installedServer())
    await app.account.loadInstallations()
    const html = renderScreen(app, <GetStartedScreen user={fakeUser} />)
    expect(titlesOf(html)).toEqual([
      '1. Install the GitHub App',
      '2. Create an org',
      '3. Connect Claude or Codex',
    ])
    expect(buttonsOf(html)).toEqual([
      { label: 'Add another account', disabled: false },
      { label: 'Create org', disabled: false },
      { label: 'Connect Claude', disabled: false },
      { label: 'Connect Codex', disabled: false },
    ])
    expect(html).not.toContain('<input')
  })

  test('ends after its three steps with the way into the org', async () => {
    const server = new FakeApiServer()
    server.json('GET', GET_STARTED_PATH, {
      orgId: 'acme',
      steps: [
        { step: 'github-app', complete: true },
        { step: 'org', complete: true },
        { step: 'agent-login', complete: true },
      ],
    })
    const app = await startedApp(server)
    // The words of the finish wait for the builds of the org.
    await app.org(FAKE_IDS.org).reload('builds')
    const text = textOf(renderScreen(app, <GetStartedScreen user={fakeUser} />))
    expect(text).toContain(
      'Welcome, Cal. Finish these steps to create a workspace.',
    )
    expect(text).toContain('Acme is ready for a new workspace. Open Acme')
  })

  test('the org step shows the first build with the actions of an admin, and the finish says ready only after a good build', async () => {
    // `textOf` puts a space after the bold name of the org.
    const created = '2. Create an org Created Acme , with 3 repositories.'
    const shown = {
      running: await finishedSteps(firstBuilds.running, 'admin'),
      succeeded: await finishedSteps(firstBuilds.succeeded, 'admin'),
      failed: await finishedSteps(firstBuilds.failed, 'admin'),
      none: await finishedSteps(firstBuilds.none, 'admin'),
    }
    expect(shown).toEqual({
      running: {
        orgStep: `${created} Cloud computer Preparing · 2m 14s`,
        actions: [],
        finish: "Acme's cloud computer is still being prepared. Open Acme",
        openIsPrimary: true,
      },
      succeeded: {
        orgStep: `${created} Cloud computer Ready`,
        actions: [],
        finish: 'Acme is ready for a new workspace. Open Acme',
        openIsPrimary: true,
      },
      failed: {
        orgStep: `${created} Cloud computer Failed after 2m 18s ${savedError} Try again Open the log`,
        actions: ['Try again', 'Open the log'],
        finish: "Acme's cloud computer didn't build. Open Acme",
        openIsPrimary: false,
      },
      none: {
        orgStep: `${created} Cloud computer No build yet Build computer`,
        actions: ['Build computer'],
        finish: "Acme's cloud computer needs a build. Open Acme",
        openIsPrimary: false,
      },
    })
  })

  test('a member who is not an admin sees the state of the first build with no action', async () => {
    const failed = await finishedSteps(firstBuilds.failed, 'member')
    const none = await finishedSteps(firstBuilds.none, 'member')
    expect({
      failed: [failed.orgStep, failed.actions],
      none: [none.orgStep, none.actions],
    }).toEqual({
      failed: [
        `2. Create an org Created Acme , with 3 repositories. Cloud computer Failed after 2m 18s ${savedError}`,
        [],
      ],
      none: [
        '2. Create an org Created Acme , with 3 repositories. Cloud computer No build yet',
        [],
      ],
    })
  })
})
