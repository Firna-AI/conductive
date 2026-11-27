import { expect, test } from 'vitest'
import { orgSettingsPaths, type ImageBuild } from '../shared/org-settings'
import { FakeApiServer } from '../test-support/fake-api'
import { coreFixtures, FAKE_IDS } from '../test-support/fixtures/core'
import { runningRefresh } from './latest-build'
import { OrgModel } from './org-model'
import { valueOf } from './store'
import { flushMicrotasks, testServices } from './test-kit'

const fixture = coreFixtures()
const buildsPath = orgSettingsPaths.builds(FAKE_IDS.org)

test('Build computer during a refresh keeps the refresh and its request from the answer', async () => {
  const server = new FakeApiServer()
  server.json('GET', buildsPath, fixture.builds)
  const refresh: ImageBuild = {
    ...fixture.build.build,
    id: 'refresh-running',
    kind: 'refresh',
    state: 'running',
    startedAt: fixture.build.build.startedAt + 60_000,
    completedAt: null,
    durationMs: null,
    buildRequested: true,
  }
  server.json('POST', buildsPath, { build: refresh, log: [] }, 202)
  const model = new OrgModel(testServices(server), FAKE_IDS.org)
  await model.reload('builds')
  await model.startBuild()
  await flushMicrotasks()
  const builds = valueOf(model.builds.get())
  if (!builds) throw new Error('Missing builds')
  expect(runningRefresh(builds)).toEqual(refresh)
})
