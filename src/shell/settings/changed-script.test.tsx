import { describe, expect, test } from 'vitest'
import { ComputerModel } from '../../app/computer-model'
import { ManualDelay } from '../../app/test-kit'
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
} from '../../test-support/fixtures/core'
import { buttonsOf } from '../account/test-markup'
import { renderScreen, startedApp, textOf } from '../test-render'
import { ComputerSettings } from './ComputerTab'

/** A build of Acme that started `ago` ms before the clock of the test. */
function buildOf(
  id: string,
  state: ImageBuild['state'],
  ago: number,
): ImageBuild {
  const ended = state !== 'running'
  return {
    id,
    orgId: FAKE_IDS.org,
    kind: 'build',
    state,
    startedAt: FAKE_TIME - ago,
    completedAt: ended ? FAKE_TIME - ago + 60_000 : null,
    durationMs: ended ? 60_000 : null,
    error: state === 'failed' ? 'The install script failed.' : null,
  }
}

/**
 * The Install software card of the Cloud computer tab of an admin, when the
 * org has `builds`: the words from its notice on, and its buttons. The
 * settings say `needsBuild`, which the Worker also sets after a change of
 * the repositories.
 */
async function changedScript(builds: BuildsResponse, needsBuild = false) {
  const server = new FakeApiServer()
  server.json('GET', orgSettingsPaths.builds(FAKE_IDS.org), builds)
  server.json('GET', orgSettingsPaths.settings(FAKE_IDS.org), {
    settings: { ...coreFixtures().settings.settings, needsBuild },
  })
  const app = await startedApp(server)
  const org = app.orgs.get().find((item) => item.id === FAKE_IDS.org)
  if (!org) throw new Error('The fake org is missing.')
  const model = app.org(org.id)
  await model.reload('builds')
  const computer = new ComputerModel(model, new ManualDelay().delay)
  await computer.load()
  const html = renderScreen(
    app,
    <ComputerSettings computer={computer} org={org} />,
  )
  const card =
    html
      .split('<section')
      .find((part) => part.includes('>Install software</h2>'))
      ?.split('</section>')[0] ?? ''
  const text = textOf(card)
  const at = text.indexOf('The install script changed')
  return {
    notice: at === -1 ? null : text.slice(at),
    buttons: buttonsOf(card).map((button) => button.label),
  }
}

describe('the notice of a changed install script', () => {
  test('asks for no build until the org has a good build, and names the build that runs the script', async () => {
    const shown = {
      firstBuild: await changedScript({
        builds: [buildOf('first', 'running', 134_000)],
        currentImageBuildId: null,
        changes: {
          installScript: true,
          addedRepositories: [],
          removedRepositories: [],
        },
      }),
      noGoodBuild: await changedScript({
        builds: [buildOf('first', 'failed', 720_000)],
        currentImageBuildId: null,
        changes: {
          installScript: true,
          addedRepositories: [],
          removedRepositories: [],
        },
      }),
      goodBuild: await changedScript({
        builds: [buildOf('first', 'succeeded', 3_600_000)],
        currentImageBuildId: 'first',
        changes: {
          installScript: true,
          addedRepositories: [],
          removedRepositories: [],
        },
      }),
    }
    expect(shown).toEqual({
      firstBuild: {
        notice:
          'The install script changed One more build runs it when this build succeeds. Save script',
        buttons: ['Save script'],
      },
      noGoodBuild: {
        notice:
          'The install script changed It runs at the next build. Save script',
        buttons: ['Save script'],
      },
      goodBuild: {
        notice:
          'The install script changed It runs at the next build. Workspaces keep the current build until then. Build computer Save script',
        buttons: ['Build computer', 'Save script'],
      },
    })
  })

  test('does not show for a change of the repositories alone', async () => {
    const repositoryChange = await changedScript(
      {
        builds: [buildOf('first', 'succeeded', 3_600_000)],
        currentImageBuildId: 'first',
        changes: {
          installScript: false,
          addedRepositories: [
            { id: 'admin-dashboard', fullName: 'acme/admin-dashboard' },
          ],
          removedRepositories: [],
        },
      },
      true,
    )
    expect(repositoryChange).toEqual({ notice: null, buttons: ['Save script'] })
  })
})
