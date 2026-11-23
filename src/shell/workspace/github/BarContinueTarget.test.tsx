// @vitest-environment happy-dom

import { act } from 'react'
import { expect, test, vi } from 'vitest'
import {
  readOrderedWorkspaceResponse,
  readWorkspaces,
} from '../../../app/api/read-workspaces'
import { routes } from '../../../app/router'
import { ManualDelay } from '../../../app/test-kit'
import { pendingJobWait } from '../../../github/barRuns'
import { githubPaths } from '../../../shared/github'
import {
  workspacePath,
  workspacePaths,
  workspacesPath,
  type ContinueWorkspaceResponse,
} from '../../../shared/workspaces'
import { byLabel, byRole } from '../../../test-support/dom-queries'
import { FakeApiServer } from '../../../test-support/fake-api'
import {
  CONTINUE_ID,
  continueQuestionReply,
  serveContinue,
  serveWork,
} from '../../../test-support/fake-bar'
import { read } from '../../../test-support/fake-bar-dev'
import { maskedQuestionReply } from '../../../test-support/fake-branch-names'
import { FAKE_IDS, FAKE_TIME } from '../../../test-support/fixtures/core'
import {
  MASKED_BASE,
  MASKED_HEAD,
} from '../../../test-support/fixtures/masked-paths'
import { toolFixtures } from '../../../test-support/fixtures/tools'
import {
  holdAnimationFrames,
  MOUNTED_TEST_TIMEOUT,
} from '../../../test-support/mount'
import { openPaletteTab } from '../../palette/palette-test-kit'
import { click, settle } from '../../test-mount'
import { bodiesOf } from '../kept-test-kit'
import { socketsOf } from '../wiring-test-kit'

vi.setConfig({ testTimeout: MOUNTED_TEST_TIMEOUT })

const { org, workspace: id } = FAKE_IDS
const question = 'Continue with work that is not pushed?'

/** The target of the merged pull request: its real name, and its label. */
type Target = { baseBranch: string; displayBaseBranch?: string }

/** The parts of the question of Continue that a case changes. */
type Reply = Partial<
  Extract<ContinueWorkspaceResponse, { state: 'confirmation-required' }>
>

/** The workspace branch: its real name, and its label. */
type Head = { branch: string; displayBranch?: string }

/** Puts the workspace record of the fake on `branch`, in its read and its list. */
async function recordOn(server: FakeApiServer, branch: string) {
  const detail = await read(
    server,
    workspacePath(org, id),
    readOrderedWorkspaceResponse,
  )
  server.json('GET', workspacePath(org, id), {
    ...detail,
    workspace: { ...detail.workspace, branch },
  })
  const listed = await read(server, workspacesPath(org), readWorkspaces)
  server.json('GET', workspacesPath(org), {
    workspaces: listed.map((item) =>
      item.id === id ? { ...item, branch } : item,
    ),
  })
}

/**
 * Presses Continue on the merged bar of a pull request into `target`, on the
 * workspace branch `head` when a case gives one. The check of Continue finds
 * local work, and its question names the default branch of the repository,
 * which Continue starts from, as `reply` gives it.
 */
async function askedQuestion(target: Target, reply: Reply, head?: Head) {
  const server = new FakeApiServer({ banner: 'merged' })
  if (head) await recordOn(server, head.branch)
  const { banner } = toolFixtures('merged').banner
  server.json('GET', githubPaths.banner(org, id), {
    banner: { ...banner, ...head, ...target },
  })
  serveContinue(server, 'question')
  server.json('GET', workspacePaths.continueResult(org, id, CONTINUE_ID), {
    ...continueQuestionReply,
    ...reply,
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
  return { server, dialog: byLabel(question, tab.view) }
}

test.each<{
  names: string
  target: Target
  base: string
  label?: string
  intro: string
}>([
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
  {
    names:
      'its own label, also while the GitHub state of the same target has none',
    target: { baseBranch: MASKED_BASE.baseBranch },
    base: MASKED_BASE.baseBranch,
    label: MASKED_BASE.displayBaseBranch,
    intro:
      'Continue starts a new branch from the latest release/[redacted]. This work is not on GitHub:',
  },
])(
  'the question of Continue names $names',
  async ({ target, base, label, intro }) => {
    holdAnimationFrames()
    const { dialog } = await askedQuestion(target, {
      baseBranch: base,
      ...(label === undefined ? {} : { displayBaseBranch: label }),
    })

    expect({
      intro: dialog.querySelector('p')?.textContent,
      secret: (dialog.textContent ?? '').includes('acme-7f3k'),
    }).toEqual({ intro, secret: false })
  },
)

test('a question from another default branch names it and each changed file by their labels, and Continue anyway sends the real branch', async () => {
  holdAnimationFrames()
  const { server, dialog } = await askedQuestion(
    MASKED_BASE,
    { ...maskedQuestionReply, branch: MASKED_HEAD.branch },
    MASKED_HEAD,
  )
  const shown = {
    intro: dialog.querySelector('p')?.textContent,
    items: Array.from(
      byLabel('Work that is not pushed', dialog).children,
      (item) => item.textContent,
    ),
    secret: (dialog.textContent ?? '').includes('acme-7f3k'),
  }
  click(byRole('button', 'Continue anyway', dialog))
  await settle()

  expect({
    ...shown,
    starts: await bodiesOf(server, 'POST', workspacePaths.continue(org, id), 0),
  }).toEqual({
    intro:
      'Continue starts a new branch from the latest develop/[redacted]. This work is not on GitHub:',
    items: [
      'src/app/checkout/AddressForm.tsxnot committed',
      'scripts/seed-[redacted].sqlnot committed',
      '2 commitsnot pushed',
    ],
    secret: false,
    starts: [
      { expectedBranch: 'calummoore/checkout-acme-7f3k' },
      { expectedBranch: 'calummoore/checkout-acme-7f3k', allowLocalWork: true },
    ],
  })
})
