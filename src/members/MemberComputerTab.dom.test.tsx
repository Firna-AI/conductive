// @vitest-environment happy-dom
import { act } from 'react'
import { expect, it, vi } from 'vitest'
import { flushMicrotasks, HeldRequests, requestLines } from '../app/test-kit'
import { orgSettingsPaths } from '../shared/org-settings'
import { byRole, queryByRole } from '../test-support/dom-queries'
import { FakeApiServer } from '../test-support/fake-api'
import {
  coreFixtures,
  FAKE_IDS,
  FAKE_TIME,
} from '../test-support/fixtures/core'
import {
  holdAnimationFrames,
  mount,
  MOUNTED_TEST_TIMEOUT,
  press,
  waitFor,
} from '../test-support/mount'
import { createMembersApi } from './api/client'
import { MemberComputerTab } from './MemberComputerTab'

vi.setConfig({ testTimeout: MOUNTED_TEST_TIMEOUT })

const skillsPath = orgSettingsPaths.skills(FAKE_IDS.org)
const settingsPath = orgSettingsPaths.settings(FAKE_IDS.org)

it('reconciles a newer lookup with settings once and hides the mismatched skills', async () => {
  holdAnimationFrames()
  const server = new FakeApiServer({ role: 'member' })
  const held = new HeldRequests(server)
  held.holdAnswer('GET', settingsPath)
  server.json('GET', skillsPath, {
    repository: 'acme/new-skills',
    skills: ['new-skill'],
    notice: null,
    clashes: [],
  })
  const { container } = await mount(
    <MemberComputerTab
      api={createMembersApi(held.fetch)}
      now={FAKE_TIME}
      org={{ id: FAKE_IDS.org, name: 'Acme', role: 'member' }}
      viewport="desktop"
    />,
  )
  held.hold('GET', settingsPath)
  await act(async () => {
    held.release('GET', settingsPath)
    await flushMicrotasks()
  })
  const mismatched =
    queryByRole('list', 'Skills in the repository', container)?.textContent ??
    null
  server.json('GET', settingsPath, {
    settings: {
      ...coreFixtures().settings.settings,
      skillsRepository: 'acme/new-skills',
    },
  })
  await act(async () => {
    held.release('GET', settingsPath)
    await flushMicrotasks()
  })
  expect({
    mismatched,
    skills: queryByRole('list', 'Skills in the repository', container)
      ?.textContent,
    reads: requestLines(server).filter((line) => line === `GET ${settingsPath}`)
      .length,
  }).toEqual({ mismatched: null, skills: 'new-skill', reads: 2 })
})

it('shows_the_tab_when_the_lookup_of_the_skills_fails_and_lists_the_skills_after_try_again', async () => {
  holdAnimationFrames()
  const server = new FakeApiServer({ role: 'member' })
  server.json(
    'GET',
    skillsPath,
    { error: { code: 'internal', message: 'The request failed.' } },
    500,
  )
  const { container } = await mount(
    <MemberComputerTab
      api={createMembersApi(server.fetch)}
      now={FAKE_TIME}
      org={{ id: FAKE_IDS.org, name: 'Acme', role: 'member' }}
      timeZone="UTC"
      viewport="desktop"
    />,
  )
  const alert = await waitFor(
    () => container.querySelector<HTMLElement>('[role="alert"]'),
    'the notice of the lookup',
  )
  const failed = {
    notice: alert.textContent,
    script: container.textContent?.includes('Startup script'),
  }
  server.json('GET', skillsPath, {
    repository: 'acme/agent-skills',
    skills: ['databases', 'testing'],
    notice: null,
    clashes: [],
  })
  await press(byRole('button', 'Try again', alert))
  const list = await waitFor(
    () => queryByRole('list', 'Skills in the repository', container),
    'the list of skills',
  )
  expect({
    failed,
    skills: Array.from(list.querySelectorAll('li'), (item) => item.textContent),
  }).toEqual({
    failed: {
      notice: 'The list of skills did not loadThe request failed.Try again',
      script: true,
    },
    skills: ['databases', 'testing'],
  })
})
