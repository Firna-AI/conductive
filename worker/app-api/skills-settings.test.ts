import { afterEach, beforeAll, expect, it } from 'vitest'

import { orgSettingsPaths } from '../../src/shared/org-settings'
import {
  createOuterRuntime,
  outerWorkerBundle,
  type OuterRuntime,
} from '../chat/integration/outer-runtime.test-support'
import { OUTER_ORG } from '../chat/integration/outer-seed.test-support'

let bundle: string
let fixture: OuterRuntime | undefined
beforeAll(async () => {
  bundle = await outerWorkerBundle()
})
afterEach(async () => {
  await fixture?.dispose()
  fixture = undefined
})

it('saves skills links as names, preserves other text, removes an empty setting, and restricts writes to admins', async () => {
  fixture = await createOuterRuntime(bundle)
  const path = orgSettingsPaths.settings(OUTER_ORG)
  expect(await (await fixture.request(path)).json()).toMatchObject({
    settings: { skillsRepository: '' },
  })
  for (const link of [
    'https://github.com/owner/skills',
    'https://github.com/owner/skills.git',
    'https://github.com/owner/skills/',
    'https://github.com/owner/skills/tree/main',
    'https://github.com/owner/skills.git/tree/main?tab=readme#skills',
    '  https://github.com/owner/skills\n',
    ' owner/skills ',
  ]) {
    const saved = await fixture.request(path, {
      method: 'PATCH',
      body: JSON.stringify({ skillsRepository: link }),
    })
    expect(saved.status).toBe(200)
    expect(await saved.json()).toMatchObject({
      settings: { skillsRepository: 'owner/skills' },
    })
  }
  const memberRead = await fixture.request(path, {
    headers: { Cookie: fixture.cookies.memberCookie },
  })
  expect(memberRead.status).toBe(200)
  expect(await memberRead.json()).toMatchObject({
    settings: { skillsRepository: 'owner/skills' },
  })
  const denied = await fixture.request(path, {
    method: 'PATCH',
    headers: { Cookie: fixture.cookies.memberCookie },
    body: JSON.stringify({ skillsRepository: 'member/replacement' }),
  })
  expect(denied.status).toBe(403)
  expect(await denied.json()).toMatchObject({
    error: { code: 'admin_required' },
  })
  const unchanged = await fixture.request(path, {
    method: 'PATCH',
    body: JSON.stringify({ startupScript: 'echo start' }),
  })
  expect(await unchanged.json()).toMatchObject({
    settings: { skillsRepository: 'owner/skills' },
  })
  for (const [value, expected] of [
    ['not a repository', 'not a repository'],
    ['owner /name', 'owner /name'],
    ['owner/../other', 'owner/../other'],
    [
      ' \n https://github.com/invalid_owner/skills \n ',
      'https://github.com/invalid_owner/skills',
    ],
    [' \n ', ''],
    ['', ''],
  ]) {
    const saved = await fixture.request(path, {
      method: 'PATCH',
      body: JSON.stringify({ skillsRepository: value }),
    })
    expect(saved.status).toBe(200)
    expect(await saved.json()).toMatchObject({
      settings: { skillsRepository: expected },
    })
    expect(await (await fixture.request(path)).json()).toMatchObject({
      settings: { skillsRepository: expected },
    })
  }
  expect(
    await fixture.env.DB.prepare(
      'SELECT skills_repository FROM settings WHERE org_id = ?',
    )
      .bind(OUTER_ORG)
      .first('skills_repository'),
  ).toBe('')
  expect(fixture.github.requests).toEqual([])
})
