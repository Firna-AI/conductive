import { beforeAll, expect, it } from 'vitest'
import { OUTER_WORKSPACE } from '../chat/integration/outer-seed.test-support'
import { listReader } from './list-facts.test-support'
import {
  MEMBER_TOKEN,
  PARALLEL,
  queueBundle,
  queueFixture,
} from './queue.test-support'

let bundle: string
beforeAll(async () => {
  bundle = await queueBundle()
})

it('expires shared facts at the last verified write access even after failed refreshes', async () => {
  const f = await queueFixture(bundle)
  try {
    let permissionReadFails = false
    const list = listReader(f, async (request) => {
      if (
        permissionReadFails &&
        request.headers.get('Authorization') === `Bearer ${MEMBER_TOKEN}` &&
        new URL(request.url).pathname === '/graphql' &&
        (await request.clone().text()).includes('query MergeCapabilities')
      )
        return Response.json({}, { status: 503 })
      return f.api.fetch(request)
    })
    const member = async () => {
      const { body, refresh } = await list.read(f.cookies.memberCookie)
      await refresh
      return body.workspaces.find(({ id }) => id === OUTER_WORKSPACE)
    }
    await member()
    expect(await member()).toMatchObject({
      githubCanWrite: true,
      githubPullBase: 'main',
    })
    permissionReadFails = true
    expect((await f.change('POST', PARALLEL)).status).toBe(204)
    list.advance(100_000)
    await member()
    f.api.pulls[2].baseRefName = 'release'
    f.api.branches.set('refs/heads/release', '5'.repeat(40))
    await list.read().then(({ refresh }) => refresh)
    expect(await member()).toMatchObject({
      githubCanWrite: true,
      githubPullBase: 'release',
    })
    list.advance(20_000)
    const expired = await member()
    expect(expired).not.toHaveProperty('githubCanWrite')
    expect(expired).not.toHaveProperty('githubPullBase')
    list.advance(30_000)
    await member()
    expect(await member()).not.toHaveProperty('githubCanWrite')
    permissionReadFails = false
    list.advance(30_000)
    await member()
    expect(await member()).toMatchObject({
      githubCanWrite: true,
      githubPullBase: 'release',
    })
  } finally {
    await f.dispose()
  }
})
