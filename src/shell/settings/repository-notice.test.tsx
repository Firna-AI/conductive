// @vitest-environment happy-dom

import { describe, expect, test, vi } from 'vitest'
import { ManualDelay } from '../../app/test-kit'
import {
  orgSettingsPaths,
  repositoryPath,
  type BuildsResponse,
} from '../../shared/org-settings'
import { byRole } from '../../test-support/dom-queries'
import { FakeApiServer } from '../../test-support/fake-api'
import { FAKE_IDS } from '../../test-support/fixtures/core'
import { repositoryFixtures } from '../../test-support/fixtures/repositories'
import {
  holdAnimationFrames,
  MOUNTED_TEST_TIMEOUT,
} from '../../test-support/mount'
import { click, mountScreen, settle } from '../test-mount'
import { startedApp, textOf } from '../test-render'
import { OrgSettingsScreen } from './OrgSettingsScreen'
import { buildOf, changed, imageBuilds, noticesOf } from './test-builds'

vi.setConfig({ testTimeout: MOUNTED_TEST_TIMEOUT })

const { org } = FAKE_IDS

const running = buildOf('add', 'running', 60_000)
const added = { addedRepositories: [changed('admin-dashboard')] }
const removed = { removedRepositories: [changed('marketing-site')] }

/** The started app over `server`, with Acme and the person signed in. */
async function signedIn(server: FakeApiServer, delay = new ManualDelay()) {
  const app = await startedApp(server, { delay: delay.delay })
  const boot = app.boot.get()
  const acme = app.orgs.get().find((item) => item.id === org)
  if (boot.state !== 'ready' || !acme) throw new Error('The app did not start.')
  const tab = (
    <OrgSettingsScreen org={acme} tab="repositories" user={boot.user} />
  )
  return { app, tab }
}

/**
 * The notices of the Repositories tab of an admin, when Acme has `builds`.
 * The tab reads the builds itself as it shows.
 */
async function adminNotices(builds: BuildsResponse) {
  const server = new FakeApiServer()
  server.json('GET', orgSettingsPaths.builds(org), builds)
  const { app, tab } = await signedIn(server)
  const view = mountScreen(app, tab)
  await settle()
  return noticesOf(view)
}

describe('the repository notice on the Repositories tab of an admin', () => {
  test('shows each state: a spinner while a build runs, Try again after a failed build, and else Build computer, which waits while a build runs', async () => {
    // The spinner of the running build stays on one frame.
    holdAnimationFrames()
    const refresh = buildOf('refresh', 'running', 30_000, 'refresh')
    const shown = {
      building: await adminNotices(imageBuilds([running], added)),
      failed: await adminNotices(
        imageBuilds([buildOf('add', 'failed', 600_000)], added),
      ),
      removed: await adminNotices(imageBuilds([], removed)),
      removedDuringBuild: await adminNotices(imageBuilds([running], removed)),
      // A refresh never counts as a build that runs.
      refresh: await adminNotices(
        imageBuilds([refresh], { ...added, ...removed }),
      ),
      none: await adminNotices(imageBuilds([running])),
    }
    const notice = { danger: false, spinner: false }
    expect(shown).toEqual({
      building: [
        {
          text: 'acme/admin-dashboard is ready after the build',
          ...notice,
          spinner: true,
          buttons: [],
        },
      ],
      failed: [
        {
          text: 'acme/admin-dashboard is ready after a build succeeds The last build failed. Try again',
          ...notice,
          danger: true,
          buttons: ['Try again'],
        },
      ],
      removed: [
        {
          text: 'acme/marketing-site leaves at the next build Build computer',
          ...notice,
          buttons: ['Build computer'],
        },
      ],
      removedDuringBuild: [
        {
          text: 'acme/marketing-site leaves at the next build Build computer',
          ...notice,
          buttons: ['Build computer (off)'],
        },
      ],
      refresh: [
        {
          text: 'acme/admin-dashboard is ready after the next build acme/marketing-site leaves at the same build. Build computer',
          ...notice,
          buttons: ['Build computer'],
        },
      ],
      none: [],
    })
  })

  test('an add reads the builds again, so the notice shows the build that the add started at once', async () => {
    holdAnimationFrames()
    const server = new FakeApiServer()
    // No timer and no return to the page reads the builds in this test.
    const { app, tab } = await signedIn(server)
    const view = mountScreen(app, tab)
    await settle()
    const before = noticesOf(view)
    const { repositories } = repositoryFixtures(org).repositories
    server.json('PUT', repositoryPath(org, 'admin-dashboard'), {
      repositories: repositories.map((item) =>
        item.id === 'admin-dashboard' ? { ...item, selected: true } : item,
      ),
    })
    server.json(
      'GET',
      orgSettingsPaths.builds(org),
      imageBuilds([running], added),
    )
    click(byRole('button', 'Add acme/admin-dashboard', view))
    await settle()
    expect({ before, after: noticesOf(view) }).toEqual({
      before: [],
      after: [
        {
          text: 'acme/admin-dashboard is ready after the build',
          danger: false,
          spinner: true,
          buttons: [],
        },
      ],
    })
  })

  test('a member reads the notice of the builds above the read-only list, without a button', async () => {
    holdAnimationFrames()
    const server = new FakeApiServer({ role: 'member' })
    const failed = buildOf('add', 'failed', 600_000)
    server.json(
      'GET',
      orgSettingsPaths.builds(org),
      imageBuilds([failed], added),
    )
    const { app, tab } = await signedIn(server)
    const view = mountScreen(app, tab)
    await settle()
    expect({
      text: textOf(view.innerHTML),
      buttons: view.querySelectorAll('button').length,
    }).toEqual({
      text: expect.stringContaining(
        'Only an admin can change them. acme/admin-dashboard is ready after a build succeeds The last build failed. An admin can try it again.',
      ) as unknown,
      buttons: 0,
    })
  })
})
