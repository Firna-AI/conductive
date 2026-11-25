// @vitest-environment happy-dom

import { act } from 'react'
import { describe, expect, test, vi } from 'vitest'
import { routes } from '../../../app/router'
import { fakeWorkers } from '../../../files/mount-test-kit'
import { workspaceViewPath } from '../../../shared/workspace-view'
import { workspacePaths } from '../../../shared/workspaces'
import { byLabel, byRole, queryByRole } from '../../../test-support/dom-queries'
import { FakeApiServer } from '../../../test-support/fake-api'
import {
  FAKE_IDS,
  FAKE_ORIGIN,
  FAKE_TIME,
} from '../../../test-support/fixtures/core'
import {
  holdAnimationFrames,
  MOUNTED_TEST_TIMEOUT,
  press,
} from '../../../test-support/mount'
import { nextEnvelope } from '../../../test-support/recorded-repairs'
import { click, settle } from '../../test-mount'
import { bodiesOf } from '../kept-test-kit'
import { linkTo, openTab } from '../wiring-test-kit'
import { skillHref } from './skill-address'
import {
  errorReply,
  plans,
  plansBody,
  plansText,
  serveSkillChat,
  serveSkillReads,
  skillLists,
  textReply,
} from './skill-test-kit'

vi.setConfig({ testTimeout: MOUNTED_TEST_TIMEOUT })

const { org, workspace: id } = FAKE_IDS
const plansHref = skillHref(org, id, plans)

/** The text of the page of the skill tab of `plans`. */
const pageText = (view: HTMLElement) =>
  byRole('region', 'plans', view).textContent

/** A new skills report of the workspace, as the stream brings it. */
function reportSkills(server: FakeApiServer) {
  act(() =>
    server.events.emit(
      nextEnvelope(
        server.events,
        { type: 'skills.updated', skills: skillLists },
        FAKE_TIME,
      ),
    ),
  )
}

describe('the notices of the skill tab', () => {
  test.each([
    {
      reply: errorReply(404, 'skill_not_found'),
      words:
        'This skill was removed or renamedType / in a message to see the current skills.',
    },
    {
      reply: {
        status: 413,
        body: {
          error: {
            code: 'skill_too_large',
            message: 'The skill is too large to open.',
            sizeBytes: 2_000_000,
            limitBytes: 1_048_576,
          },
        },
      },
      words: 'This skill is too large to showSkills up to 1 MB show here.',
    },
    {
      reply: errorReply(409, 'skill_reads_unsupported'),
      words:
        'Restart to open this skillOpening a skill needs newer cloud computer software. Select Restart in the workspace header.',
    },
  ])(
    'an answer of $reply.status shows its notice under the header of the skill',
    async ({ reply, words }) => {
      holdAnimationFrames()
      const server = new FakeApiServer()
      serveSkillChat(server)
      serveSkillReads(server, plans, [reply])
      const { view } = await openTab(server, plansHref)

      expect(pageText(view)).toBe(
        `plansClaude skillUse before you write or change a plan file.${words}`,
      )
    },
  )

  test('a read that failed shows the failure with Try again, which reads the text again', async () => {
    holdAnimationFrames()
    const workers = fakeWorkers()
    const server = new FakeApiServer()
    serveSkillChat(server)
    const reads = serveSkillReads(server, plans, [
      errorReply(503, 'skill_unavailable'),
      textReply(plansText),
    ])
    const { view } = await openTab(server, plansHref)
    const failed = byRole('region', 'plans', view).querySelector(
      '[role="alert"]',
    )?.textContent
    const before = reads()

    await press(byRole('button', 'Try again', view))
    await settle()

    expect({
      failed,
      before,
      after: reads(),
      posted: workers.made.map((worker) => worker.posted.at(-1)),
    }).toEqual({
      failed: "This skill didn't openTry again",
      before: 1,
      after: 2,
      posted: [plansBody],
    })
  })

  test('a new skills report while the tab shows reads the text again, and shows the new text', async () => {
    holdAnimationFrames()
    const workers = fakeWorkers()
    const server = new FakeApiServer()
    serveSkillChat(server)
    const newer = plansText.replace('options.', 'options and a date.')
    const reads = serveSkillReads(server, plans, [
      textReply(plansText),
      textReply(newer),
    ])
    await openTab(server, plansHref)
    const first = reads()
    reportSkills(server)
    await settle()

    expect({
      first,
      after: reads(),
      posted: workers.made.map((worker) => worker.posted.at(-1)),
    }).toEqual({
      first: 1,
      after: 2,
      posted: [plansBody, plansBody.replace('options.', 'options and a date.')],
    })
  })

  test.each([
    {
      cause: 'a 5xx reply of a stopped cloud computer',
      reply: errorReply(503, 'computer_stopped'),
    },
    { cause: 'a lost connection', reply: 'lost connection' as const },
  ])(
    'a read after a skills report that fails with $cause keeps the text that shows',
    async ({ reply }) => {
      holdAnimationFrames()
      fakeWorkers()
      const server = new FakeApiServer()
      serveSkillChat(server)
      const reads = serveSkillReads(server, plans, [
        textReply(plansText),
        reply,
      ])
      const { view } = await openTab(server, plansHref)
      click(byRole('radio', 'Source', byRole('region', 'plans', view)))
      await settle()
      const shown = pageText(view)

      reportSkills(server)
      await settle()

      expect({
        reads: reads(),
        text: shown?.includes('Write each decision with its options.'),
        after: pageText(view),
      }).toEqual({ reads: 2, text: true, after: shown })
    },
  )

  test('a read after a skills report that finds no skill shows the notice of a removed skill in place of the text', async () => {
    holdAnimationFrames()
    fakeWorkers()
    const server = new FakeApiServer()
    serveSkillChat(server)
    const reads = serveSkillReads(server, plans, [
      textReply(plansText),
      errorReply(404, 'skill_not_found'),
    ])
    const { view } = await openTab(server, plansHref)
    reportSkills(server)
    await settle()

    expect({ reads: reads(), page: pageText(view) }).toEqual({
      reads: 2,
      page: 'plansClaude skillUse before you write or change a plan file.This skill was removed or renamedType / in a message to see the current skills.',
    })
  })
})

describe('the skill tab of a cloud computer that does not run, and on a phone', () => {
  test('a press on a skill chip while the cloud computer is stopped resumes it, and the tab shows the state of the sandbox and reads nothing', async () => {
    holdAnimationFrames()
    const server = new FakeApiServer({ workspaceState: 'stopped' })
    serveSkillChat(server)
    const reads = serveSkillReads(server, plans, [textReply(plansText)])
    const resume = new URL(workspacePaths.resume(org, id), FAKE_ORIGIN).href
    const resumes = () =>
      server.requests.filter(
        (request) => request.method === 'POST' && request.url === resume,
      ).length
    const { view } = await openTab(server, routes.workspace(org, id))
    const atOpen = resumes()

    click(linkTo(byLabel('Chat', view), plansHref))
    await settle()

    expect({
      atOpen,
      afterPress: resumes(),
      page: pageText(view)?.includes('Sandbox stopped'),
      reads: reads(),
    }).toEqual({ atOpen: 1, afterPress: 2, page: true, reads: 0 })
  })

  test('on a phone, the address of a skill shows it as a page of the Files tab, which leads back to All files, and opens it in the temporary tab', async () => {
    holdAnimationFrames()
    const server = new FakeApiServer()
    serveSkillChat(server)
    serveSkillReads(server, plans, [textReply(plansText)])
    const { view } = await openTab(server, plansHref, { viewport: 'phone' })
    const saved = await bodiesOf(server, 'PUT', workspaceViewPath(org, id), 0)
    const bar = byLabel('Workspace', view)
    const page = queryByRole('region', 'plans', view)

    expect({
      page: page?.textContent?.startsWith('All filesplansClaude skill'),
      back: page
        ?.querySelector('[aria-label="Back to All files"]')
        ?.getAttribute('href'),
      current: byRole('link', 'Files', bar).getAttribute('aria-current'),
      saved: saved.at(-1),
    }).toEqual({
      page: true,
      back: routes.workspace(org, id, 'files', 'all'),
      current: 'page',
      saved: expect.objectContaining({
        skillTabs: [{ ...plans, place: 2 }],
        activeSkill: plans,
        temporarySkill: plans,
      }),
    })
  })
})
