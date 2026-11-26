import { expect, it } from 'vitest'

import { readBuildJob, runningBuild } from '../lifecycle/build-data'
import { progressProviderSwitch } from '../lifecycle/provider-switch-builds'
import {
  setupSwitchTests,
  requestSwitch,
} from '../lifecycle/provider-switch.test-support'
import { waitingImageBuild } from '../lifecycle/waiting-image-data'
import { changeShellRepository } from './feature-repositories'
import { shellRepositoryId } from './feature-repositories-data'

const fixtureForTest = setupSwitchTests()

it('records a member build for a repository added during a hidden switch build', async () => {
  const fixture = await fixtureForTest()
  const { images, runtime, org, user } = fixture
  const fetch = runtime.dependencies.fetch
  runtime.dependencies.fetch = async (request) => {
    const path = new URL(request.url).pathname
    if (path === '/user/installations')
      return Response.json({
        total_count: 1,
        installations: [
          {
            id: 91,
            account: { login: 'example', type: 'Organization' },
            app_slug: 'conductive',
            html_url: 'https://github.com/settings/installations/91',
            suspended_at: null,
          },
        ],
      })
    if (path === '/user/installations/91/repositories')
      return Response.json({
        total_count: 2,
        repositories: [
          {
            id: 1,
            full_name: 'example/repository',
            default_branch: 'main',
            description: null,
          },
          {
            id: 2,
            full_name: 'example/added',
            default_branch: 'main',
            description: null,
          },
        ],
      })
    return fetch(request)
  }
  const record = await requestSwitch(fixture)
  await progressProviderSwitch(images, org.id)
  const hidden = (await record.read())?.buildId
  const repositoryId = shellRepositoryId(org.id, 2)
  const response = await changeShellRepository(
    runtime.env,
    org.id,
    user.id,
    repositoryId,
    { selected: true, build: true },
    runtime.dependencies,
  )
  expect(response.status).toBe(200)
  const waiting = await waitingImageBuild(runtime.env.DB, org.id)
  expect(waiting?.id).toEqual(expect.any(String))
  expect(waiting?.id).not.toBe(hidden)
  const member = await readBuildJob(runtime.env.DB, org.id, waiting?.id ?? '')
  expect(member).toMatchObject({
    kind: 'build',
    state: 'running',
    waitingForSwitchId: record.id,
    startedByUserId: user.id,
  })
  expect(JSON.parse(member.repositoriesJson)).toContainEqual({
    id: repositoryId,
    orgId: org.id,
    fullName: 'example/added',
    defaultBranch: 'main',
  })
  expect(await runningBuild(runtime.env.DB, org.id)).toBe(hidden)
})
