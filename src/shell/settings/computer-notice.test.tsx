// @vitest-environment happy-dom

import { describe, expect, test, vi } from 'vitest'
import { ManualDelay } from '../../app/test-kit'
import {
  buildPath,
  orgSettingsPaths,
  type BuildsResponse,
} from '../../shared/org-settings'
import { FakeApiServer } from '../../test-support/fake-api'
import { FAKE_IDS } from '../../test-support/fixtures/core'
import { MOUNTED_TEST_TIMEOUT } from '../../test-support/mount'
import { mountScreen, settle } from '../test-mount'
import { startedApp } from '../test-render'
import { OrgSettingsScreen } from './OrgSettingsScreen'
import { buildOf, changed, imageBuilds, noticesOf } from './test-builds'

vi.setConfig({ testTimeout: MOUNTED_TEST_TIMEOUT })

const { org } = FAKE_IDS

const failed = buildOf('add', 'failed', 600_000)
const added = { addedRepositories: [changed('admin-dashboard')] }

/**
 * The Cloud computer tab of an admin of Acme with `builds`: its notices, in
 * their order, and whether the build history is open.
 */
async function computerTab(builds: BuildsResponse) {
  const server = new FakeApiServer()
  server.json('GET', orgSettingsPaths.builds(org), builds)
  server.json('GET', buildPath(org, failed.id), { build: failed, log: [] })
  const app = await startedApp(server, { delay: new ManualDelay().delay })
  const boot = app.boot.get()
  const acme = app.orgs.get().find((item) => item.id === org)
  if (boot.state !== 'ready' || !acme) throw new Error('The app did not start.')
  const view = mountScreen(
    app,
    <OrgSettingsScreen org={acme} tab="cloud-computer" user={boot.user} />,
  )
  await settle()
  const history = view.querySelector('section[aria-label="Builds"] details')
  return { notices: noticesOf(view), history: history?.hasAttribute('open') }
}

describe('the notices of the Cloud computer tab of an admin', () => {
  test('the repository notice shows under the intro without a button, the install script notice shows only for a script change, and the history stays closed while a change waits', async () => {
    const script = {
      text: 'The install script changed It runs at the next build. Workspaces keep the current build until then. Build computer',
      danger: false,
      spinner: false,
      buttons: ['Build computer'],
    }
    expect({
      failed: await computerTab(imageBuilds([failed], added)),
      waiting: await computerTab(imageBuilds([], added)),
      withScript: await computerTab(
        imageBuilds([], {
          installScript: true,
          removedRepositories: [changed('marketing-site')],
        }),
      ),
      scriptOnly: await computerTab(imageBuilds([], { installScript: true })),
      none: await computerTab(imageBuilds([])),
    }).toEqual({
      failed: {
        notices: [
          {
            text: 'acme/admin-dashboard is ready after a build succeeds The last build failed.',
            danger: true,
            spinner: false,
            buttons: [],
          },
        ],
        history: false,
      },
      waiting: {
        notices: [
          {
            text: 'acme/admin-dashboard is ready after the next build',
            danger: false,
            spinner: false,
            buttons: [],
          },
        ],
        history: false,
      },
      withScript: {
        notices: [
          {
            text: 'acme/marketing-site leaves at the next build',
            danger: false,
            spinner: false,
            buttons: [],
          },
          script,
        ],
        history: false,
      },
      scriptOnly: { notices: [script], history: false },
      none: { notices: [], history: true },
    })
  })
})
