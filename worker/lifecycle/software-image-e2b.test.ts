import { expect, it } from 'vitest'

import { providerForAccount } from '../sandbox/client'
import { seedReadySoftwareImage } from '../software-image/test-support'
import { FakeE2b } from '../test-support/fake-e2b'
import { setupBackendTests } from './backend-test-hooks'
import { SOFTWARE } from './backend-test-support'
import { readBuildJob } from './build-data'
import { advanceImageBuild, startImageBuild } from './image-builds'

const fixtureForTest = setupBackendTests()

it.each(['other-account', 'same-account'] as const)(
  'starts the E2B first build from its own template or %s software image',
  async (scenario) => {
    const fixture = fixtureForTest()
    const { runtime, images, org, user } = fixture
    const server = new FakeE2b()
    runtime.env.SANDBOX_PROVIDER_ACCOUNTS = JSON.stringify({
      e2b: {
        kind: 'e2b',
        apiKey: server.apiKey,
        domain: server.domain,
        templateId: 'e2b-own-template',
      },
    })
    runtime.dependencies.fetch = server.fetch
    await runtime.env.DB.batch([
      runtime.env.DB.prepare(
        'UPDATE orgs SET provider_account = ? WHERE id = ?',
      ).bind('e2b', org.id),
      runtime.env.DB.prepare('DELETE FROM org_images WHERE org_id = ?').bind(
        org.id,
      ),
    ])
    await seedReadySoftwareImage(runtime.env.DB, 'boat-ready')
    let ownImage: string | null = null
    if (scenario === 'same-account') {
      ownImage = await seedReadySoftwareImage(runtime.env.DB, 'e2b-ready', {
        account: 'e2b',
      })
      server.sandboxes.set('software-builder', {
        sandboxID: 'software-builder',
        state: 'running',
        metadata: {},
      })
      await providerForAccount(runtime.env, server.fetch, 'e2b').saveSnapshot(
        'software-builder',
        ownImage,
      )
      server.sandboxes.clear()
    }
    const id = await startImageBuild(images, {
      orgId: org.id,
      userId: user.id,
      kind: 'build',
      software: SOFTWARE,
    })
    await advanceImageBuild(images, org.id, id)
    expect(await readBuildJob(runtime.env.DB, org.id, id)).toMatchObject({
      providerAccount: 'e2b',
      softwareImageName: ownImage,
      sandboxId: 'sandbox-one',
      phase: 'sources',
    })
    const createIndex = server.requests.findIndex(
      (request) =>
        request.method === 'POST' &&
        new URL(request.url).pathname === '/v2/sandboxes',
    )
    expect(server.bodies[createIndex]).toMatchObject({
      templateID:
        ownImage === null ? 'e2b-own-template' : `project/${ownImage}:default`,
    })
    await advanceImageBuild(images, org.id, id)
    expect((await readBuildJob(runtime.env.DB, org.id, id)).phase).toBe(
      ownImage === null ? 'software' : 'install',
    )
  },
)
