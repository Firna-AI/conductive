// @vitest-environment happy-dom

import { expect, test, vi } from 'vitest'
import { routes } from '../../../app/router'
import { githubPaths } from '../../../shared/github'
import { sessionPaths } from '../../../shared/sessions'
import { byRole } from '../../../test-support/dom-queries'
import { FakeApiServer } from '../../../test-support/fake-api'
import { serveWork } from '../../../test-support/fake-bar'
import { FAKE_IDS } from '../../../test-support/fixtures/core'
import {
  holdAnimationFrames,
  MOUNTED_TEST_TIMEOUT,
} from '../../../test-support/mount'
import { openPaletteTab } from '../../palette/palette-test-kit'
import { click, settle } from '../../test-mount'
import { bodiesOf } from '../kept-test-kit'
import { socketsOf } from '../wiring-test-kit'

vi.setConfig({ testTimeout: MOUNTED_TEST_TIMEOUT })

const { org, workspace, session } = FAKE_IDS
const storedPath = githubPaths.stored(org, workspace)
const messagePath = sessionPaths.messages(org, workspace, session)

test.each(['queued', 'read fails'])(
  'checks stored state when Resolve conflicts is clicked and %s',
  async (state) => {
    holdAnimationFrames()
    const server = new FakeApiServer({ banner: 'conflict' })
    serveWork(server, 'none')
    await openPaletteTab(routes.workspace(org, workspace), {
      server,
      events: socketsOf(server).events,
    })
    if (state === 'queued') {
      server.json('GET', storedPath, {
        state: null,
        queue: {
          place: 2,
          count: 2,
          belowPullNumber: 479,
          trunk: 'main',
          state: 'waiting',
          wait: 'rebase',
        },
      })
    } else {
      server.json(
        'GET',
        storedPath,
        { error: { code: 'unavailable', message: 'State unavailable.' } },
        503,
      )
    }
    click(byRole('button', 'Resolve conflicts'))
    await settle()
    const sent = (await bodiesOf(server, 'POST', messagePath, 0)).map(
      (body) => Object(body).text,
    )
    expect(sent).toEqual(
      state === 'queued'
        ? [expect.stringContaining('git fetch origin refs/pull/479/head')]
        : [],
    )
  },
)
