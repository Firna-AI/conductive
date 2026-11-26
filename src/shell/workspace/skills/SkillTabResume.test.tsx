// @vitest-environment happy-dom

import { expect, test, vi } from 'vitest'
import { routes } from '../../../app/router'
import { HeldRequests } from '../../../app/test-kit'
import { workspacePaths } from '../../../shared/workspaces'
import {
  byLabel,
  byRole,
  queryAllByRole,
} from '../../../test-support/dom-queries'
import { FakeApiServer } from '../../../test-support/fake-api'
import { FAKE_IDS, FAKE_ORIGIN } from '../../../test-support/fixtures/core'
import {
  holdAnimationFrames,
  MOUNTED_TEST_TIMEOUT,
} from '../../../test-support/mount'
import { click, settle } from '../../test-mount'
import { headerStates } from '../header-test-kit'
import { linkTo, openTab } from '../wiring-test-kit'
import { skillHref } from './skill-address'
import {
  plans,
  plansText,
  serveSkillChat,
  serveSkillReads,
  textReply,
} from './skill-test-kit'

vi.setConfig({ testTimeout: MOUNTED_TEST_TIMEOUT })

const { org, workspace: id } = FAKE_IDS

/** The text of the page of the skill tab of `plans`. */
const pageText = (view: HTMLElement) =>
  byRole('region', 'plans', view).textContent

test('a press on a skill chip while the cloud computer is stopped resumes it, and until the reply the tab waits with no Resume, the header shows Starting, and nothing reads', async () => {
  holdAnimationFrames()
  const server = new FakeApiServer({ workspaceState: 'stopped' })
  serveSkillChat(server)
  const reads = serveSkillReads(server, plans, [textReply(plansText)])
  const held = new HeldRequests(server)
  const resumePath = workspacePaths.resume(org, id)
  const resume = new URL(resumePath, FAKE_ORIGIN).href
  const resumes = () =>
    server.requests.filter(
      (request) => request.method === 'POST' && request.url === resume,
    ).length
  const { view } = await openTab(server, routes.workspace(org, id), {
    fetch: held.fetch,
  })
  const atOpen = resumes()
  const shown = () => ({
    page: pageText(view),
    resume: queryAllByRole('button', 'Resume', view).length,
    header: headerStates(view),
    reads: reads(),
  })

  held.holdAnswer('POST', resumePath)
  click(linkTo(byLabel('Chat', view), skillHref(org, id, plans)))
  await settle()
  const waiting = shown()
  // The fake keeps the cloud computer stopped after its Resume, so the tab
  // shows the stopped state with Resume once the reply comes.
  held.release('POST', resumePath)
  await settle()

  const header = 'plansClaude skillUse before you write or change a plan file.'
  expect({ atOpen, afterPress: resumes(), waiting, after: shown() }).toEqual({
    atOpen: 1,
    afterPress: 2,
    waiting: {
      page: `${header}Waiting for the sandbox`,
      resume: 0,
      header: ['Starting'],
      reads: 0,
    },
    after: {
      page: `${header}Sandbox stoppedYour files and chat are saved.Resume`,
      resume: 1,
      header: ['Stopped'],
      reads: 0,
    },
  })
})
