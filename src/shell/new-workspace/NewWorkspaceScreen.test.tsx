import { describe, expect, test } from 'vitest'
import type { OrgRole } from '../../shared/api'
import { orgSettingsPaths } from '../../shared/org-settings'
import { FakeApiServer } from '../../test-support/fake-api'
import { FAKE_IDS, FAKE_TIME } from '../../test-support/fixtures/core'
import { renderScreen, startedApp, textOf } from '../test-render'
import { NewWorkspaceScreen } from './NewWorkspaceScreen'

const hour = 3_600_000

/** The screen as text. `builtAt` sets when the org image was built. */
async function screenText(role: OrgRole, builtAt?: number): Promise<string> {
  const server = new FakeApiServer({ role })
  if (builtAt !== undefined) {
    server.json('GET', orgSettingsPaths.builds(FAKE_IDS.org), {
      builds: [
        {
          id: 'image',
          orgId: FAKE_IDS.org,
          kind: 'build',
          state: 'succeeded',
          startedAt: builtAt - 401_000,
          completedAt: builtAt,
          durationMs: 401_000,
          error: null,
        },
      ],
      currentImageBuildId: 'image',
    })
  }
  const app = await startedApp(server)
  const org = app.org(FAKE_IDS.org)
  await Promise.all(
    (['list', 'repositories', 'builds'] as const).map((part) =>
      org.reload(part),
    ),
  )
  return textOf(
    renderScreen(
      app,
      <NewWorkspaceScreen
        org={{ id: FAKE_IDS.org, name: 'Acme', role }}
        sectionId={null}
      />,
    ),
  )
}

describe('NewWorkspaceScreen', () => {
  test('the start note says when the image was built, as a time or a date', async () => {
    const cases = [
      ['eight hours ago', FAKE_TIME - 8 * hour, 'built 8 hours ago.'],
      ['ten days ago', FAKE_TIME - 240 * hour, 'built on 5 Jan.'],
    ] as const
    for (const [name, builtAt, expected] of cases) {
      expect(await screenText('admin', builtAt), name).toContain(
        `Starts from the cloud computer of Acme, ${expected}`,
      )
    }
  })
})
