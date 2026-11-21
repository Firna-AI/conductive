// @vitest-environment happy-dom

import { expect, test, vi } from 'vitest'
import { routes } from '../../../app/router'
import { newSessionRecord } from '../../../chat/state/test-kit'
import { githubPaths, type GitHubBanner } from '../../../shared/github'
import { sessionsPath } from '../../../shared/sessions'
import { byLabel } from '../../../test-support/dom-queries'
import { FakeApiServer } from '../../../test-support/fake-api'
import { serveMaskedHead } from '../../../test-support/fake-branch-names'
import { FAKE_IDS } from '../../../test-support/fixtures/core'
import { MASKED_HEAD } from '../../../test-support/fixtures/masked-paths'
import { toolFixtures } from '../../../test-support/fixtures/tools'
import {
  holdAnimationFrames,
  MOUNTED_TEST_TIMEOUT,
} from '../../../test-support/mount'
import { click, settle } from '../../test-mount'
import { lastEvent } from '../kept-test-kit'
import { openTab } from '../wiring-test-kit'

vi.setConfig({ testTimeout: MOUNTED_TEST_TIMEOUT })

const { org, workspace: id } = FAKE_IDS

/** The text under the title of the empty state of a new session. */
function newSessionText(view: HTMLElement): string | null {
  const title = Array.from(view.querySelectorAll('h2')).find(
    (heading) => heading.textContent === 'New session',
  )
  return title?.nextElementSibling?.textContent ?? null
}

// The chat applies its own checks of the branch and of its label, as
// `NewSessionText.test.tsx` says. These cases follow the GitHub state of
// the screen to the chat.
test.each<{
  names: string
  /** The GitHub state that the read gives, or null for a read that fails. */
  github: GitHubBanner | null
  text: string
}>([
  {
    names: 'the label of the GitHub state of the branch',
    github: { ...toolFixtures().banner.banner, ...MASKED_HEAD },
    text: 'The agent works on calummoore/checkout-[redacted], on the same cloud computer as the other sessions.',
  },
  {
    names: 'its real name while no GitHub state shows',
    github: null,
    text: 'The agent works on calummoore/checkout-acme-7f3k, on the same cloud computer as the other sessions.',
  },
])(
  'a new session names the workspace branch by $names',
  async ({ github, text }) => {
    holdAnimationFrames()
    const server = new FakeApiServer()
    await serveMaskedHead(server)
    server.json('GET', githubPaths.stored(org, id), { state: null })
    const read = githubPaths.banner(org, id)
    if (github) server.json('GET', read, { banner: github })
    else {
      const error = { code: 'github_unavailable', message: 'GitHub failed.' }
      server.json('GET', read, { error }, 502)
    }
    const choice = {
      agent: 'claude',
      model: 'Opus 5.5',
      effort: 'high',
      fast: false,
    } as const
    server.json(
      'POST',
      sessionsPath(org, id),
      {
        session: newSessionRecord('fresh', choice),
        eventNumber: lastEvent(server),
      },
      201,
    )
    const { view } = await openTab(server, routes.workspace(org, id))

    click(byLabel('New session', view))
    await settle()

    expect(newSessionText(view)).toBe(text)
  },
)
