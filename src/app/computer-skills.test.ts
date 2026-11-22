import { expect, onTestFinished, test } from 'vitest'
import { orgSettingsPaths } from '../shared/org-settings'
import { FakeApiServer } from '../test-support/fake-api'
import { coreFixtures, FAKE_IDS } from '../test-support/fixtures/core'
import { ComputerModel } from './computer-model'
import { OrgModel } from './org-model'
import { valueOf } from './store'
import {
  flushMicrotasks,
  HeldRequests,
  ManualDelay,
  requestLines,
  testServices,
} from './test-kit'

const settingsPath = orgSettingsPaths.settings(FAKE_IDS.org)
const skillsPath = orgSettingsPaths.skills(FAKE_IDS.org)
const saved = coreFixtures().settings.settings
const changed = { ...saved, skillsRepository: 'acme/new-skills' }
const oldSkills = {
  repository: 'acme/agent-skills',
  skills: ['old-skill'],
  notice: null,
  clashes: [],
}
const newSkills = {
  ...oldSkills,
  repository: 'acme/new-skills',
  skills: ['new-skill'],
}

function reads(server: FakeApiServer, path: string): number {
  return requestLines(server).filter((line) => line === `GET ${path}`).length
}

async function openTab(holdSettings = false) {
  const server = new FakeApiServer()
  server.json('GET', skillsPath, oldSkills)
  const held = new HeldRequests(server)
  const org = new OrgModel(
    testServices(server, { fetch: held.fetch }),
    FAKE_IDS.org,
  )
  const open = () => {
    const computer = new ComputerModel(org, new ManualDelay().delay)
    onTestFinished(() => computer.stop())
    computer.start()
    return computer
  }
  if (holdSettings) held.holdAnswer('GET', settingsPath)
  const computer = open()
  await flushMicrotasks()
  return { server, held, computer, open }
}

test('a reopened tab follows the repository saved by its closed tab', async () => {
  const { server, held, computer, open } = await openTab()
  held.hold('PATCH', settingsPath)
  const saving = computer.saveSkillsRepository({
    repository: 'acme/new-skills',
    trusted: false,
  })
  computer.stop()
  const reopened = open()
  await flushMicrotasks()
  const before = reads(server, skillsPath)
  server.json('PATCH', settingsPath, { settings: changed })
  server.json('GET', skillsPath, newSkills)
  held.release('PATCH', settingsPath)
  await saving
  await flushMicrotasks()
  expect({
    repository: valueOf(reopened.settings.get())?.skillsRepository,
    skills: reopened.skills.get(),
    before,
    after: reads(server, skillsPath),
  }).toEqual({
    repository: 'acme/new-skills',
    skills: { state: 'ready', value: newSkills },
    before: 2,
    after: 3,
  })
})

test('a script save refreshes a repository changed by another admin and hides the old list', async () => {
  const { server, held, computer } = await openTab()
  server.json('PATCH', settingsPath, {
    settings: { ...changed, startupScript: 'npm run dev' },
  })
  server.json('GET', skillsPath, newSkills)
  held.holdAnswer('GET', skillsPath)
  await computer.saveScript('startupScript', 'npm run dev')
  await flushMicrotasks()
  const waiting = computer.skills.get()
  held.release('GET', skillsPath)
  await flushMicrotasks()
  expect({
    waiting,
    skills: computer.skills.get(),
    lookups: reads(server, skillsPath),
  }).toEqual({
    waiting: { state: 'loading' },
    skills: { state: 'ready', value: newSkills },
    lookups: 2,
  })
})

test('a lookup newer than settings stays hidden until one settings reread reconciles it', async () => {
  const { server, held, computer } = await openTab()
  server.json('GET', skillsPath, newSkills)
  server.json('GET', settingsPath, { settings: changed })
  held.hold('GET', settingsPath)
  const reading = computer.loadSkills()
  await flushMicrotasks()
  const waiting = computer.skills.get()
  held.release('GET', settingsPath)
  await reading
  await flushMicrotasks()
  expect({
    waiting,
    repository: valueOf(computer.settings.get())?.skillsRepository,
    skills: computer.skills.get(),
    settingsReads: reads(server, settingsPath),
  }).toEqual({
    waiting: { state: 'loading' },
    repository: 'acme/new-skills',
    skills: { state: 'ready', value: newSkills },
    settingsReads: 2,
  })
})

test('a lookup that arrives first reconciles an older initial settings answer once', async () => {
  const { server, held, computer } = await openTab(true)
  server.json('GET', skillsPath, newSkills)
  await computer.loadSkills()
  const waiting = computer.skills.get()
  server.json('GET', settingsPath, { settings: changed })
  held.release('GET', settingsPath)
  await flushMicrotasks()
  expect({
    waiting,
    skills: computer.skills.get(),
    settingsReads: reads(server, settingsPath),
  }).toEqual({
    waiting: { state: 'loading' },
    skills: { state: 'ready', value: newSkills },
    settingsReads: 2,
  })
})

test('a mismatch that a settings reread cannot reconcile does not read in a loop', async () => {
  const { server, computer } = await openTab()
  server.json('GET', skillsPath, newSkills)
  await computer.loadSkills()
  await flushMicrotasks()
  expect({
    skills: computer.skills.get(),
    settingsReads: reads(server, settingsPath),
    lookups: reads(server, skillsPath),
  }).toEqual({
    skills: { state: 'loading' },
    settingsReads: 2,
    lookups: 2,
  })
})

test('an older lookup cannot replace the lookup after a repository save', async () => {
  const { server, held, computer } = await openTab()
  held.holdAnswer('GET', skillsPath)
  const reading = computer.loadSkills()
  await flushMicrotasks()
  server.json('PATCH', settingsPath, { settings: changed })
  server.json('GET', skillsPath, newSkills)
  await computer.saveSkillsRepository({
    repository: 'acme/new-skills',
    trusted: false,
  })
  await flushMicrotasks()
  held.release('GET', skillsPath)
  await reading
  expect({
    skills: computer.skills.get(),
    lookups: reads(server, skillsPath),
  }).toEqual({
    skills: { state: 'ready', value: newSkills },
    lookups: 3,
  })
})
