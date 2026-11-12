// @vitest-environment happy-dom

import { describe, expect, test, vi } from 'vitest'
import noticeStyles from '../../../docs/mockups/src/components/common/Notice.module.css'
import { memoryNavigation } from '../../app/navigation'
import { routes } from '../../app/router'
import type { OrgRole } from '../../shared/api'
import {
  orgSettingsPaths,
  type BuildsResponse,
  type ImageBuild,
} from '../../shared/org-settings'
import { workspacesPath } from '../../shared/workspaces'
import { byRole, queryByRole } from '../../test-support/dom-queries'
import { FakeApiServer } from '../../test-support/fake-api'
import { FAKE_IDS, FAKE_TIME } from '../../test-support/fixtures/core'
import {
  holdAnimationFrames,
  MOUNTED_TEST_TIMEOUT,
} from '../../test-support/mount'
import { click, mountScreen, settle } from '../test-mount'
import { startedApp, textOf } from '../test-render'
import { NewWorkspaceScreen } from './NewWorkspaceScreen'

vi.setConfig({ testTimeout: MOUNTED_TEST_TIMEOUT })

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

/** The builds of Acme in each state of its first build. */
const firstBuilds: Readonly<Record<string, BuildsResponse>> = {
  running: {
    builds: [buildOf('first', 'running', 134_000)],
    currentImageBuildId: null,
    changes: {
      installScript: false,
      addedRepositories: [],
      removedRepositories: [],
    },
  },
  failed: {
    builds: [buildOf('first', 'failed', 720_000)],
    currentImageBuildId: null,
    changes: {
      installScript: false,
      addedRepositories: [],
      removedRepositories: [],
    },
  },
  none: {
    builds: [],
    currentImageBuildId: null,
    changes: {
      installScript: false,
      addedRepositories: [],
      removedRepositories: [],
    },
  },
  // A later build runs after the first good build.
  later: {
    builds: [
      buildOf('later', 'running', 60_000),
      buildOf('first', 'succeeded', 3_600_000),
    ],
    currentImageBuildId: 'first',
    changes: {
      installScript: false,
      addedRepositories: [],
      removedRepositories: [],
    },
  },
}

/**
 * The notice of the build that runs, as a member sees it. A non-breaking
 * space keeps its time on one line on a narrow phone.
 */
const running =
  "Preparing the cloud computer · 2m&nbsp;14s You can send when it's ready."

/** The notice of the build that runs, with the link of an admin. */
const runningAdmin = `${running} Cloud computer settings`

/** The org of the page, as a person with `role` reaches it. */
const acme = (role: OrgRole) => ({ id: FAKE_IDS.org, name: 'Acme', role })

/** Whether a button with this name shows, and a press would act. */
function pressable(view: HTMLElement, name: string): boolean {
  const button = queryByRole('button', name, view)
  return (
    button !== null &&
    !button.hasAttribute('disabled') &&
    button.getAttribute('aria-disabled') !== 'true'
  )
}

/**
 * New workspace of Acme with `builds`, as a person with `role` sees it,
 * with a written draft. With `refusal`, a send of the draft got that
 * refusal of the Worker first. The result has the text of each notice over
 * the composer, whether a notice shows the spinner in place of its icon,
 * and whether Send and Try again can be pressed.
 */
async function newWorkspace(
  role: OrgRole,
  builds: BuildsResponse,
  refusal?: string,
) {
  const server = new FakeApiServer({ role })
  server.json('GET', orgSettingsPaths.builds(FAKE_IDS.org), builds)
  const app = await startedApp(server)
  const draft = app.org(FAKE_IDS.org).newWorkspace(null)
  draft.setText('Add a loading state to the Button component.')
  if (refusal !== undefined) {
    server.json(
      'POST',
      workspacesPath(FAKE_IDS.org),
      { error: { code: 'image_required', message: refusal } },
      409,
    )
    await draft.send({
      repositoryId: 'storefront',
      choice: { agent: 'claude', model: 'Opus 5.5', effort: 'high' },
    })
  }
  const view = mountScreen(
    app,
    <NewWorkspaceScreen org={acme(role)} sectionId={null} />,
  )
  await settle()
  return {
    notices: Array.from(
      view.querySelectorAll(`.${noticeStyles.notice}`),
      (notice) => textOf(notice.outerHTML),
    ),
    spinner: view.querySelector(`.${noticeStyles.busy}`) !== null,
    send: pressable(view, 'Send'),
    tryAgain: pressable(view, 'Try again'),
  }
}

describe('the notice of the first build in New workspace', () => {
  test('shows the state of the first build while the org has no good image, links only an admin to the Cloud computer tab, and keeps Send off', async () => {
    // The spinner of the running build stays on one frame.
    holdAnimationFrames()
    const shown = {
      running: await newWorkspace('admin', firstBuilds.running),
      runningMember: await newWorkspace('member', firstBuilds.running),
      failed: await newWorkspace('admin', firstBuilds.failed),
      failedMember: await newWorkspace('member', firstBuilds.failed),
      none: await newWorkspace('admin', firstBuilds.none),
      noneMember: await newWorkspace('member', firstBuilds.none),
      later: await newWorkspace('admin', firstBuilds.later),
    }
    const off = { spinner: false, send: false, tryAgain: false }
    expect(shown).toEqual({
      running: {
        notices: [runningAdmin],
        ...off,
        spinner: true,
      },
      runningMember: {
        notices: [running],
        ...off,
        spinner: true,
      },
      failed: {
        notices: [
          "The cloud computer didn't build Try the build again to send your message. Cloud computer settings",
        ],
        ...off,
      },
      failedMember: {
        notices: [
          "The cloud computer didn't build An admin can try the build again.",
        ],
        ...off,
      },
      none: {
        notices: [
          'The cloud computer needs a build Build it to send your message. Cloud computer settings',
        ],
        ...off,
      },
      noneMember: {
        notices: ['The cloud computer needs a build An admin can build it.'],
        ...off,
      },
      later: { notices: [], spinner: false, send: true, tryAgain: false },
    })
  })

  test('a create that the Worker refused during the first build keeps the message, and Try again waits for the build', async () => {
    holdAnimationFrames()
    const refused = await newWorkspace(
      'admin',
      firstBuilds.running,
      'The cloud computer is still being prepared.',
    )
    expect(refused).toEqual({
      notices: [
        "The workspace wasn't created The cloud computer is still being prepared. Your message is kept. Try again",
        runningAdmin,
      ],
      spinner: true,
      send: false,
      tryAgain: false,
    })
  })

  test('Cloud computer settings leads an admin to the Cloud computer tab of the org', async () => {
    const server = new FakeApiServer()
    server.json(
      'GET',
      orgSettingsPaths.builds(FAKE_IDS.org),
      firstBuilds.failed,
    )
    const app = await startedApp(server)
    const navigation = memoryNavigation(routes.newWorkspace(FAKE_IDS.org))
    const view = mountScreen(
      app,
      <NewWorkspaceScreen org={acme('admin')} sectionId={null} />,
      { navigation },
    )
    await settle()
    click(byRole('button', 'Cloud computer settings', view))
    expect(navigation.history.at(-1)).toBe(
      routes.settings(FAKE_IDS.org, 'cloud-computer'),
    )
  })
})
