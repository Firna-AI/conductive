// @vitest-environment happy-dom

import { act } from 'react'
import { expect, test, vi } from 'vitest'
import { routes } from '../../../app/router'
import { ManualDelay } from '../../../app/test-kit'
import { pendingJobWait } from '../../../github/barRuns'
import { githubPaths } from '../../../shared/github'
import { workspacePaths } from '../../../shared/workspaces'
import { byLabel, byRole } from '../../../test-support/dom-queries'
import { FakeApiServer } from '../../../test-support/fake-api'
import {
  CONTINUE_ID,
  continueQuestionReply,
  serveContinue,
  serveWork,
} from '../../../test-support/fake-bar'
import { FAKE_IDS, FAKE_TIME } from '../../../test-support/fixtures/core'
import { MASKED_BASE } from '../../../test-support/fixtures/masked-paths'
import { toolFixtures } from '../../../test-support/fixtures/tools'
import {
  holdAnimationFrames,
  MOUNTED_TEST_TIMEOUT,
} from '../../../test-support/mount'
import { openPaletteTab } from '../../palette/palette-test-kit'
import { click, settle } from '../../test-mount'
import { socketsOf } from '../wiring-test-kit'

vi.setConfig({ testTimeout: MOUNTED_TEST_TIMEOUT })

const { org, workspace: id } = FAKE_IDS
const question = 'Continue with work that is not pushed?'

/** The target of the merged pull request: its real name, and its label. */
type Target = { baseBranch: string; displayBaseBranch?: string }

/**
 * Presses Continue on the merged bar of a pull request into `target`. The
 * check of Continue finds local work, and its question names `base`, the
 * default branch of the repository, which Continue starts from.
 */
async function askedQuestion(target: Target, base: string) {
  const server = new FakeApiServer({ banner: 'merged' })
  const { banner } = toolFixtures('merged').banner
  server.json('GET', githubPaths.banner(org, id), {
    banner: { ...banner, ...target },
  })
  serveContinue(server, 'question')
  server.json('GET', workspacePaths.continueResult(org, id, CONTINUE_ID), {
    ...continueQuestionReply,
    baseBranch: base,
  })
  serveWork(server, 'none')
  const delay = new ManualDelay()
  const tab = await openPaletteTab(routes.workspace(org, id), {
    server,
    events: socketsOf(server).events,
    clock: { now: () => FAKE_TIME, delay: delay.delay },
  })
  click(byRole('button', 'Continue', byLabel('Files and tools', tab.view)))
  await settle()
  await act(() => delay.run(pendingJobWait))
  await settle()
  return byLabel(question, tab.view)
}

test.each([
  {
    names:
      'the label of a target that holds a secret value, while the merged pull request has the same target',
    target: MASKED_BASE,
    base: MASKED_BASE.baseBranch,
    intro:
      'Continue starts a new branch from the latest release/[redacted]. This work is not on GitHub:',
  },
  {
    names:
      'its own target, and never the label of the other target of the merged pull request',
    target: MASKED_BASE,
    base: 'main',
    intro:
      'Continue starts a new branch from the latest main. This work is not on GitHub:',
  },
  {
    names: 'its target, while the GitHub state of the same target has no label',
    target: { baseBranch: 'main' },
    base: 'main',
    intro:
      'Continue starts a new branch from the latest main. This work is not on GitHub:',
  },
])('the question of Continue names $names', async ({ target, base, intro }) => {
  holdAnimationFrames()
  const dialog = await askedQuestion(target, base)

  expect({
    intro: dialog.querySelector('p')?.textContent,
    secret: (dialog.textContent ?? '').includes('acme-7f3k'),
  }).toEqual({ intro, secret: false })
})
